# Civix — System Design for 100× Scale (Latency & Performance)

**Goal:** the platform survives **100× current traffic** with **equal-or-better latency** — not "100× slower". Every concept below is named, mapped to a concrete change in *this repo*, and assigned to a phase.

---

## 1. What "100×" means (define it before designing it)

Let **B** = your measured current peak. You can read it today from Render logs / Atlas metrics. If you don't have it yet, assume:

| | 1× (B) | 10× | 100× |
|---|---|---|---|
| Registered users | 1k | 10k | 100k |
| Daily active | ~150 | 1.5k | 15k |
| Peak RPS (reads) | ~10 | 100 | **1,000** |
| Issues / day | ~50 | 500 | 5,000 |
| Map viewport queries / min (peak) | ~5 | 50 | **500** |
| Concurrent socket clients | ~10 | 100 | 1,000 |
| Images / day | ~50 MB | 500 MB | **5 GB** |

Everything in this doc is expressed as "sustain 100×B". The k6 load plan (§10) measures your real B, then proves 100×B — so the design is verified, not assumed.

**The core scaling law we're designing for:** at 100× traffic, *p95 latency must hold at the 1× target*. That is only possible if each layer absorbs the 100× with one of: **caching** (read amplification), **asynchrony** (write path decoupling), **precomputation** (derivation moved off request path), or **horizontal replication** (read fan-out). No layer may scale latency linearly with traffic.

---

## 2. Current-state bottlenecks (ranked, from the actual code)

| # | Bottleneck | Where | Why it breaks first |
|---|---|---|---|
| 1 | **Synchronous ML in the write path** — `createIssue` awaits 4 Gemini calls + duplicate fetch before responding | `backend/controllers/issues.js` | Submit latency 5–15 s; any ML outage = submissions fail. The single worst latency bug in the system. |
| 2 | **Unbounded, unpaginated, unfiltered reads** — `GET /api/issues` returns every issue, full documents (descriptions, files, votes), no auth, no projection | `issues.js` `getAllIssues` | O(N) payload and DB work per call. The map page calls this. At 100× issues this is an OOM + 10 MB responses. |
| 3 | **No caching anywhere** | entire API | Every user hits Mongo for identical data (categories, map views, officer lists). At 100×, Mongo is the wall. |
| 4 | **Single-node, fixed 4-worker `cluster`** | `server.js` | One process group on one box; can't scale horizontally; a crash takes the node; workers share nothing (no cross-worker socket or cache). |
| 5 | **Socket.io single-node** | `server.js` | No Redis adapter — cross-instance fan-out impossible, so the API can't be scaled horizontally without losing realtime. |
| 6 | **File uploads through the API** (multer → disk → Cloudinary in-request) | `issues.js`, `multer.middleware` | Every photo transfers through the API box twice (upload + re-upload to Cloudinary), adding 1–5 s and burning API RAM/egress. |
| 7 | **Heavy documents returned by default** (embedding, timelines, upvote arrays) | `models/issues.js` | `select:false` exists on `embedding` but timelines/votes/proofs ride every response. |
| 8 | **No indexes beyond defaults** (need: 2dsphere on coordinates, h3, status+createdAt, email) | `models/issues.js` | `findDuplicatesForIssue` and map queries do collection scans at scale. |
| 9 | **DB connection churn** — new axios/no keep-alive discipline, no pooled Mongo config visible, `Issue.find()` with no `lean()` on hot GETs | various | Connection + object-hydration overhead per request. |
| 10 | **No backpressure** — fire-and-forget validation, no DLQ | `issues.js` `validateImageAsync` | At 100×, failed async work silently vanishes; queue-less "async" is a lie under load. |

---

## 3. Target architecture

```
                         ┌────────────────────────────┐
                         │  CDN / Edge (Vercel + CDN) │  SPA, images, tiles, fonts
                         │  rate-limit tier 1 (edge)  │
                         └──────────────┬─────────────┘
                                        │
                         ┌──────────────▼─────────────┐
                         │   Load Balancer (LB)       │  sticky for socket.io
                         │   rate-limit tier 2        │
                         └──────────────┬─────────────┘
              ┌──────────────┬──────────┴──────────┬───────────────┐
              │              │                     │               │
      ┌───────▼──────┐ ┌─────▼──────┐      ┌───────▼──────┐
      │ API node N1  │ │ API node N2│ …    │  ML pool     │   (scale by
      │ stateless    │ │ stateless  │      │ FastAPI, 1..M│    queue depth)
      │ Express      │ │ Express    │      │ YOLO+CLIP+   │
      │ (1 process/  │ └─────┬──────┘      │ NLP, pure    │
      │  container)  │       │             │ functions)   │
      └──┬───┬───┬────┘       │             └───────▲──────┘
         │   │   │            │                     │ score calls (HTTP, keep-alive)
   ┌─────▼┐ ┌▼─────┐ ┌────────▼────────┐            │
   │Redis │ │ Redis│ │  MongoDB Atlas  │            │
   │cache │ │queue │ │  1 primary +    │────────────┘
   │(L1)  │ │BullMQ│ │  2–3 read repl. │ (replicas serve GETs)
   └──────┘ └──────┘ │  2dsphere+H3   │
   ┌────────┐        │  keyset pages  │
   │ socket │        └────────┬───────┘
   │ adapter│                 │
   └────────┘        ┌────────▼────────┐
                     │ Object storage  │  direct signed uploads
                     │ (Cloudinary/S3) │  + CDN delivery
                     └─────────────────┘
```

**Statelessness is the keystone.** Every API node must be killable at any time with zero data loss: no local session state (Clerk JWT = stateless), no local files (uploads go straight to object storage), no in-node-only caches (Redis L1), no in-node-only realtime (Redis adapter). This one property is what makes "add another node" a valid scaling action.

---

## 4. Latency budgets (1× targets = 100× targets — they don't inflate)

| Path | Today (measured/estimated) | Target | Technique that earns it |
|---|---|---|---|
| Landing LCP | ~3 s | **< 1.5 s** | CDN, self-hosted fonts, code-split (exists), image CDN |
| Issue submit (user-perceived) | 5–15 s | **< 600 ms** | save-then-enqueue; **zero ML in critical path** |
| Map viewport query | 1.5–4 s (full fetch) | **< 300 ms** p95 | geo-bbox server filter + lean projection + edge/cache layer + ≤500 docs |
| Issue list (dashboard) | unbounded (no pagination) | **< 400 ms** | keyset pagination + read replica + cache |
| Issue detail | ~500 ms | **< 250 ms** | replica + 30 s stale cache + projection |
| Categories/dept tree | per-request | **< 50 ms** | static, cached 24 h (it's a file) |
| ML verdict (async, post-save) | 1–5 s | **< 3 s** p95 | local models (no LLM), preloaded, ONNX |
| Socket status fan-out | single-node only | **< 1 s** | Redis adapter + rooms per hex |
| Image upload | 1–5 s (via API) | **< 2 s** | client → Cloudinary signed direct upload |

---

## 5. The concepts — each one, where it lives in this repo

### 5.1 Statelessness + horizontal API pool *(kills #4)*
- `server.js`: **delete the `cluster` 4-worker pattern.** One Express process per container; scale by adding containers behind the LB (Render multi-instance / Docker). Cluster mode was a single-box optimization — at scale it *blocks* horizontal scaling and makes socket fan-out impossible.
- No globals mutate across requests beyond read-only config/models.
- **Files:** `backend/server.js` (rewrite worker section), Dockerfile (if added), Procfile.

### 5.2 Cache-aside with explicit invalidation *(kills #2, #3, #7)*
- Redis (Upstash managed or self-hosted in compose) as L1 shared cache. Pattern per endpoint:
  - **Map viewport** `GET /api/v1/map/issues?bbox=…&status=…&category=…` → key = hash(query), TTL 30 s, **stale-while-revalidate** (serve 30 s-stale during refill — map doesn't need 300 ms freshness; the socket layer supplies freshness, not polling).
  - **Issue detail** TTL 30 s; **invalidated by write**: every status change publishes `invalidate:issue:{id}` + `invalidate:map:{hex_res8}` to a Redis pub/sub channel — all nodes evict locally. Invalidation-on-write is the correctness backbone.
  - **Taxonomy/departments** TTL 24 h (it's a file; zero reason to read Mongo).
  - **Officer availability lists** TTL 15 s.
  - **User's own issues** TTL 10 s + invalidated on their own writes.
- Cache stores **lean projections** (the map doc shape), never full Mongoose docs.
- **Files:** new `backend/lib/cache.js` (get/set/invalidate + pub/sub), wiring in `controllers/issues.js`, `routes/map.js`.
- Expected: 70–90% of read traffic served from Redis at 100×; Mongo read load stays roughly flat while traffic 100×.

### 5.3 Read/write splitting *(kills #2 at the DB layer)*
- Atlas: 1 primary + 2 read replicas. All GETs use `{ readPreference: 'secondaryPreferred' }`; all writes to primary.
- Secondary-lag guard: if `secondaryLagSeconds > 2` (Atlas metric / admin command), degrade to primary reads automatically.
- **Files:** `backend/db/index.js` (two connections: `db` and `dbRead`), controller-level `dbRead` on GET paths.

### 5.4 Indexes + projection + keyset pagination *(kills #2, #7, #9)*
- Indexes (new, in `models/issues.js`):
  ```js
  coordinates: { type: 'GeoJsonPoint', index: '2dsphere' }   // or keep lat/lng + 2dsphere compound
  { h3_8: 1, status: 1, createdAt: -1 }
  { h3_9: 1, category: 1 }
  { status: 1, createdAt: -1 }        // dashboards
  { email: 1, createdAt: -1 }         // my-issues
  { category: 1, createdAt: -1 }
  complaintId: unique
  ```
- Every hot GET gets an explicit `.select('+...')` projection + `.lean()`.
- `GET /api/issues` becomes **keyset pagination**: `?before={createdAt},{id}&limit=50` (cursor-based — stable under writes, O(page) cost; never `skip(10000)`).
- **Files:** `models/issues.js`, `controllers/issues.js`, `routes/issues.js`.

### 5.5 Save-then-enqueue (async write path) *(kills #1, #10)*
- `createIssue` becomes: validate (zod) → save Issue (status `Received`) → enqueue jobs → **201 in < 600 ms**.
- Redis + **BullMQ**: queues `text_scoring`, `image_analysis`, `match_image_text`, `duplicate_check`, `sla_watchdog` (delayed).
- Every job: idempotency key `issue:{id}:{job}`, retries 3 (5 s/60 s/10 m), **dead-letter queue** + alert on DLQ growth, `aiAnalysis.jobs[]` records {job, state, at, ms} on the issue — you can *see* pipeline health per issue.
- Worker processes are a **separate deploy** (Node worker + Python ML pool) so API latency is never coupled to ML load.
- **Files:** new `backend/lib/queue.js`, `backend/workers/*.js` (new dir), `controllers/issues.js` rewrite of `createIssue`.

### 5.6 Backpressure & degradation (design for the outage, not the happy path)
- **Circuit breaker** on the ML service (open after 5 consecutive fails / 5 s): when open, issues stay `Received` with `aiStatus: "ml_unavailable"` and a requeue job runs every 5 min. **The map, dashboards and submission flow never depend on ML being up.** (Today, `createIssue` degrades but slowly; at 100×, a slow ML = queue pile-up; the breaker makes the failure *fast and cheap*.)
- **Queue backpressure**: if `image_analysis` depth > 5,000, API response includes `"reviewEta": "a few minutes"` (honest UX) and ML pool autoscaler scales out.
- **DB degradation**: replicas lagging → promote to primary reads (5.3). Redis down → LRU in-process fallback (small) + skip cache, DB holds (at reduced capacity — measured in chaos drill §10.4).
- **Timeouts everywhere**: axios `timeout: 1500` to ML, `1000` to DB; no endpoint may block > 2 s.

### 5.7 Direct-to-storage uploads *(kills #6)*
- Client gets a short-lived **Cloudinary signed upload preset** (per-user, 10 min, 8 MB, image/*) → uploads **directly** to Cloudinary (their CDN edge) → backend receives only the URL on submit.
- EXIF read + GPS cross-check + re-encode (sharp) move into the `image_analysis` **worker**, not the request path.
- At 100×, the API box stops moving any photo bytes. This is the biggest single egress + RAM win.
- **Files:** new `backend/routes/uploads.js` (`GET /upload-preset`, `POST /upload-complete`), `ReportIssue.jsx`/`NewIssue.jsx` upload flow, worker `image_analysis`.

### 5.8 Realtime that scales: socket.io + Redis adapter + rooms *(kills #5)*
- `socket.io` with `@socket.io/redis-adapter` → any API node can emit to any connection (this is also what makes 5.1's horizontal pool possible).
- **Rooms by geography, not by user**: a map client joins room `map:{h3_8}` (their viewport hex). Status events publish to the hex room — fan-out cost is *viewers of that area*, not *all users*. 1,000 concurrent users in 40 wards ≈ 25 sockets/room.
- Events: `issue:{id}:status`, `issue:new:{hex}` (new marker), `issue:dup:{id}`. Clients dedupe by id; server sends deltas (not full docs).
- LB: sticky sessions for the socket handshake (Render supports it; otherwise nginx `ip_hash`/cookie).
- **Offline**: socket events are also written to the `notifications` collection — mobile push (FCM) is a later plug-in on the same event bus.
- **Files:** `server.js` (adapter), `socketHandlers` (new dir), `UserMap.jsx` (join room by viewport).

### 5.9 Edge & static performance *(frontend half of the latency budget)*
- Vercel edge: SPA static + **self-hosted Inter** (`@fontsource`, kills a render-blocking webfont request), `three.js`/`swiper`/`aos` purged (unused weight = unused parse time), images via Cloudinary `q_auto,f_auto` (100× images stay a 100× smaller payload).
- Map: CARTO/OSM tiles via CDN; **viewport-based tile prefetch**; marker payloads from the 300 ms geo endpoint; cluster on client (≤ 500 DOM nodes).
- Lists: virtualized (react-window) for admin tables at 100× rows.
- **Files:** `package.json` purge, `index.html`/`index.jsx` font, `UserMap.jsx`.

### 5.10 Connection & resource discipline *(kills #9)*
- Mongo driver: `maxPoolSize: 20` per node, `minPoolSize: 5`; one shared connection (and one read connection) — never per-route.
- Axios: single instance with `httpAgent keepAlive: true`, `timeout: 1500`, retry (0.3 s, 0.9 s) **only** for idempotent GETs.
- `sharp`/image work only in workers. JSON bodies capped at 1 MB (express.json limit) except the upload-complete route.

### 5.11 Rate limiting & abuse tiers *(100× traffic ≠ 100× abuse)*
- Tier 1 edge (Vercel/WAF): IP-level.
- Tier 2 API: per-route configs — submit `60/min/user`, map query `60/min/user`, auth `10/min/user`, global `10k/min` per node. (express-rate-limit already installed; add per-user key from Clerk id.)
- Honeypot field on report form → auto-spam label (also feeds the spam model's real data).

### 5.12 Database scale plan (when single-node stops being enough)
- **Now → ~10×:** Atlas M30 (4 vCPU/16 GB) + 2 replicas. Indexes above carry 1,000 RPS reads easily (cache aside keeps DB reads ~100–200 RPS).
- **~10× → 100×:** M40 or cluster with 3 replicas; **M0 never** in prod.
- **100× and beyond — sharding plan (prepared, not executed):** shard `issues` on `hashed(h3_8)` — geographic shard key keeps each city's hot data local, and the map's natural query (by hex) is shard-local; `users` unsharded (small); time-based `timeline` events move to a separate capped/cold collection. Trigger to execute: sustained writes > 2k/s or storage > 10 TB. Until then, the plan is a tested migration script, not a live system. **Honest note: a civic app at 100× users will almost certainly still fit on an unsharded cluster — the plan exists so the decision is measured, not panicked.**

### 5.13 Observability = capacity planning (you can't scale what you can't see)
- `pino` structured logs + correlation id (Express → job → ML call).
- Prometheus (`prom-client`) endpoints on API, workers, ML; Grafana boards:
  1. **Saturation**: RPS, p95/p99 per route, Redis hit rate, Mongo pool wait, queue depths, DLQ count, socket connections, CPU per node.
  2. **Degradation**: circuit-breaker state, replica lag, cache-eviction rate, job requeue rate.
- Alerts (page, not dashboard): p95 > 2× target for 5 min; DLQ > 10; queue depth > 5k; replica lag > 2 s; cache hit < 50%.
- **Files:** `server.js` (pino, prom-client), `Grafana` json in `ops/` (new dir), Sentry stays on all three layers.

### 5.14 Precomputation (move work out of the request path entirely)
- **Cluster counts** for the map: worker maintains `IssueCluster.count` on each duplicate_check — map reads a precomputed integer, never aggregates.
- **Heat/density**: nightly job writes per-hex status counts to a tiny `mapStats` collection (a few thousand docs) — the heat layer reads that.
- **Trending feed**: 5-min job, top issues by upvotes/priority — no live sort at 100×.
- **Admin analytics**: materialized daily counts (`analyticsDay`), dashboards query that.
- **Files:** `backend/workers/precompute.js`, `models/mapStats.js` (new).

---

## 6. Capacity math at 100× (plug in your measured B)

| Component | Unit capacity (typical, to be confirmed by k6) | 100×B need | Result |
|---|---|---|---|
| API node (2 vCPU) | ~1,000 RPS cached reads / ~250 RPS uncached | 1,000 RPS total | **2–3 nodes** (with cache; else 5–8) |
| Redis (1GB) | ~100k ops/s, queue 10k jobs/min | ~5k ops/s + queue | 1 instance, huge headroom |
| Mongo M40 + 3 replicas | ~5–10k reads/s (indexed, cached front) | ~150–200 reads/s reaching DB | 1 cluster, ~5% load |
| ML pool (2 vCPU/4GB) | ~12–18 full issue-verdicts/min per node (CV p95 800 ms) | 5,000 issues/day ≈ 4/min avg, 30/min monsoon peak | 2 nodes + autoscale on queue depth |
| Socket nodes | ~10–20k conns per node (adapter) | 1,000 conns | covered by API pool |
| Object storage | — | ~5 GB/day | trivial (CDN-fronted) |

The math shows the **real constraints at 100× are (a) ML verdict throughput** (monsoon spike) and **(b) not letting the map endpoint become an O(N) scan** — both solved above. Everything else has ≥ 10× headroom.

---

## 7. Failure-mode & degradation matrix

| Fails | User sees | System does | Recovery |
|---|---|---|---|
| ML pool down | Submit still instant; AI hints appear minutes later | Breaker opens; jobs requeued; `aiStatus: ml_unavailable` | Auto-retry; DLQ alert if > 5 min |
| Redis down | Slightly slower reads; realtime pauses | In-process LRU; sockets pause; queue pauses (jobs buffered in memory ≤ 1 min) | Redis is stateless — restart clean |
| Read replica lagging | None | Reads auto-promote to primary | Lag recovers; metric alert |
| Primary DB down | Writes fail-fast (503 + retry-after) | Read replicas keep serving (eventually consistent) for ~60 s | Atlas failover (< 60 s) |
| One API node | None (stateless) | LB re-routes; its sockets resume on another node | None needed |
| Cloudinary | Uploads fail | Client retries with exponential backoff; submit without image allowed (flagged) | Auto |
| LB/edge | Nothing (static CDN cache) | — | — |

---

## 8. Phased rollout (each phase independently deployable + load-tested)

**P0 — at 1×, this sprint, near-zero infra cost (kills bottlenecks #1, #2, #6, #7, #9):**
indexes + projections + `lean()`; keyset pagination on all lists; cache-aside (start with in-process LRU, swap to Upstash in P1); **save-then-enqueue with BullMQ** (needs Redis → Upstash free tier is fine to start); direct Cloudinary uploads; delete cluster-mode (1 process/box); axios keep-alive + timeouts; rate-limit tiers.
*Expected: 5–10× headroom and submit latency 15 s → 600 ms before any scaling purchase.*

**P1 — 10× (weeks 3–6):**
read replicas; socket.io Redis adapter + hex rooms; worker pool as separate deploy; circuit breaker; Prometheus/Grafana/Sentry full stack; k6 baseline of B and 10× target.

**P2 — 100× (months 3–6):**
ML autoscale on queue depth; M40 cluster; sharding migration script tested (not executed); multi-instance API with LB sticky; load test to **prove** 100×B targets; chaos drills (§10.4).

---

## 9. Repo change list (concrete)

| File | Change | Phase |
|---|---|---|
| `backend/server.js` | drop cluster-mode; pino; prom-client; socket adapter; rate-limit config | P0/P1 |
| `backend/db/index.js` | dual connections (primary/read), pool config | P0/P1 |
| `backend/lib/cache.js` | **new** — cache-aside + invalidation pub/sub | P0 |
| `backend/lib/queue.js` | **new** — BullMQ setup, idempotency, DLQ | P0 |
| `backend/workers/*` | **new dir** — text_scoring, image_analysis, match, duplicate_check, precompute, sla | P0/P1 |
| `backend/controllers/issues.js` | save-then-enqueue; projections; pagination; upload-complete; circuit breaker | P0 |
| `backend/routes/issues.js`, `routes/map.js` (new) | pagination params; geo endpoint; upload-preset route | P0 |
| `backend/models/issues.js` | indexes; h3 fields; lean-safe defaults | P0 |
| `backend/routes/uploads.js` | **new** — signed upload flow | P0 |
| `src/Pages/ReportIssue.jsx`, `NewIssue.jsx` | direct-to-Cloudinary upload | P0 |
| `src/Pages/UserMap.jsx` | viewport room join; lean map docs; tile prefetch | P1 |
| `src/**` | purge unused deps; self-host font; virtualized tables | P0 |
| `loadtest/k6/*.js` | **new** — submit, map, list, socket, ML-stress scenarios + thresholds | P1 |
| `ops/grafana/*.json` | **new** — dashboards + alert rules | P1 |
| `docker-compose.yml` | **new** — mongo, redis, api, worker, ml (dev parity with prod) | P1 |

---

## 10. Proving it: load test & chaos plan (a 100× claim without this is an opinion)

1. **k6 scenarios** (against staging with real replica topology):
   - `submit.js`: 100× issue-creation rate (with images → upload preset path) — assert p95 < 800 ms, 0 errors.
   - `map.js`: 500 viewport queries/min with realistic bbox movement — assert p95 < 300 ms, Redis hit > 70%.
   - `mixed.js`: 80/15/5 read/detail/write mix at 100×B — assert route budgets (§4).
   - `ml_stress.js`: flood 60 verdicts/min for 10 min — assert queue drains, API p95 unaffected (backpressure works).
   - Nightly in CI; report archived; **dashboard trend lines are the capacity plan**.
2. **Chaos drills (staging, monthly):**
   - Kill ML pool mid-submit → breaker opens < 5 s, zero failed submits, DLQ drains after restore.
   - Kill Redis → reads degrade to < 1 s p95 (not 5 s), writes unaffected.
   - Promote lagging replica → no failed reads.
   - Kill one API node → sockets resume < 2 s, no stuck jobs (idempotency proven).
3. **Go-live gate for "100× ready":** all four chaos drills pass + k6 mixed scenario at 100×B green for 10 consecutive runs + DLQ empty + p99 within 2× budget.

---

## 11. What we deliberately do NOT do (and why)

- **Microservices-per-feature.** One API service + one ML service + one worker pool is the right number of services for a civic app at even 1,000× — more boundaries = more latency, not less.
- **GraphQL.** The payload problem is solved by projections + pagination; GraphQL adds a layer of complexity without a matching gain here.
- **Kafka/event-sourcing.** Redis streams + BullMQ covers the event needs (status fan-out, invalidation, precompute triggers) at this scale; Kafka is a tax you pay for problems you don't have.
- **Vector DB / Atlas Vector Search *now*.** FAISS in the ML worker (100× issues = a few MB of 768-d vectors) is exact and free; revisit only if neighborhoods exceed ~10k candidates.
- **Multi-region.** One region + edge CDN is correct for a single-city deployment; a multi-city rollout is the trigger, not 100× users in one city.
