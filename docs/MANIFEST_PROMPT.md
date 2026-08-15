# CIVIX MASTER IMPLEMENTATION PROMPT

**You are a senior ML engineer + full-stack engineer + systems designer.** Build the complete transformation of **Civix**, a citizen complaint-reporting platform (roles: Citizen, Officer, Moderator, Admin; stack: React 18 + Vite + Tailwind + Clerk + Leaflet | Node/Express + MongoDB/Mongoose + Socket.io | Python ML service). Work in this repository. **Do not commit or push anything until explicitly told.**

**Hard constraints — non-negotiable:**
1. **NO LLM APIs anywhere in the prediction path.** No Gemini/OpenAI/any prompt-based inference. All AI = self-hosted, deterministic, classic ML/NLP (TF-IDF, logistic regression, LightGBM, sentence embeddings, CLIP, YOLO, H3 geohashing, FAISS, fasttext). Free at the margin, offline-capable, auditable.
2. **Production-grade, not demo-grade.** Everything ships with: tests, metrics, error handling, a data card or model card, and a load/eval gate.
3. **Never block the citizen's submit on AI.** Save → 201 in < 600 ms → everything ML runs async, queued, idempotent, retriable.
4. **One taxonomy, one source of truth.** No three-way label drift ever again.

---

## 0. BEFORE → AFTER (the whole system in one table)

| Layer | BEFORE (as found in repo) | AFTER (build this) |
|---|---|---|
| AI core | Every endpoint is a Gemini LLM prompt (priority, fake-detect, categorize, duplicates, image match, caption). Local sklearn models trained but **never served**. 5–15 s per submission, per-call cost, key-dependent | Self-hosted FastAPI ML service: TF-IDF→calibrated linear classifier (category), feature-stack→LightGBM (spam), CLIP ViT-B/32 (image-text match), YOLOv8n ONNX-INT8 (object extraction + spam-veto + quality), fasttext (lang ID), MiniLM-768d + FAISS + H3 (duplicates). All local, p95 < 3 s async, ₹0 marginal cost |
| Categories | 3 conflicting taxonomies (frontend: 8, prompt: 10, dataset: 10 different ones) | `taxonomy.json` v4: **20 public depts + 6 personal**, each with subtypes; consumed by models, API validator, frontend, YOLO mapper; legacy-migration map for existing data |
| Datasets | 1 mock CSV (5k rows, 8 fixed templates) — **DEPRECATED, do not use** | 3-layer real+synthetic corpus: NYC 311 (real, stratified), BBMP Bengaluru 2020–25 (real Indian distribution; `Non-Relevant` status = free fake-proxy), seeded messy-citizen generator, plus app **flywheel** (moderator actions = labels). 6 datasets, flat schema, locked golden sets, Cohen's-κ labeling, data cards |
| NLP | Ad-hoc `.lower().strip()` per prompt | One tested `TextBundle` pipeline: NFKC → fasttext lang-ID → PII redaction → lemmatize → civic-lexicon keys → negation/urgency features. Every model consumes it |
| Backend | Sync ML fan-out in `createIssue`; fire-and-forget validation; open unauthenticated `GET /api/issues`; no pagination; no versioning | `/api/v1` + zod + error envelope + RBAC on everything; **save-then-enqueue** (BullMQ/Redis); canonical issue state machine with reason codes + SLA watchdog; geo `bbox` map endpoint; keyset pagination; projections+lean |
| Map | Fetches ALL issues, parses coords from free text, CDN flaticon pins, no clustering, `Rejected` dropped, static | Server-side geo query (2dsphere + H3), status-colored bundled SVG markers, marker clustering, heat layer, click→side drawer, **live socket updates**, dark tiles, legend/empty/loading states |
| Frontend style | Gradient headers, glassmorphism, emoji labels, decorative pulse, CDN icons, 3 icon + 2 toast libs | Token-driven design system (one accent + semantic status tokens, Inter self-hosted, 4px scale, radii 6/10/14, two shadows); **kill list enforced by lint**; `StatusBadge` is the only way to render a status anywhere; per-portal layouts; WCAG 2.1 AA |
| Workflow | Free-form status strings, `Spam` mixed into status, no reason codes | Received → Assigned → In Progress → Pending Review → Resolved → Closed; side-states Rejected/Spam **with reason codes** (DUPLICATE, FAKE_TEXT, FAKE_IMAGE, MISMATCH, OUT_OF_AREA, UNACTIONABLE); 3-way verification kept (officer proof → moderator → citizen confirm); SLA timers per priority |
| Scale | 1 box, fixed 4-worker cluster, no cache, single-node sockets, uploads through API | Stateless API pool behind LB; Redis (cache-aside + queue + socket adapter, geo-rooms); Mongo read replicas + full index set; direct-to-Cloudinary signed uploads; circuit breakers + backpressure + degradation matrix; sharding plan; **proven** at 100× via k6 + chaos drills |
| Ops | None | pino structured logs + correlation IDs; Prometheus + Grafana (pipeline/ML/product boards); Sentry ×3; eval harness with CI regression gate (−2 pt blocks promotion); shadow-mode cutover; GitHub Actions; model registry + cards; k6 nightly |

---

## 1. DATA LAYER (do this first — everything else consumes it)

### 1.1 Taxonomy (contract)
Create `ml_service/taxonomy.json` v4 — single source of truth:
- **20 public depts:** `roads` (pothole, road_damage, footpath, street_sign, open_manhole, speed_breaker, crack, bridge_damage), `street_lighting` (light_out, light_flickering, light_broken, pole_bent, area_unlit, light_not_working_night), `electricity` (power_cut, transformer_issue, hanging_wires, pole_fallen, voltage_fluctuation, meter_fault), `water_supply` (no_water, low_pressure, dirty_water, pipe_burst, damaged_tank), `sewerage_drainage` (drain_clogged, sewage_overflow, open_drain, sewage_leak, manhole_sewage), `flood_management` (waterlogging, storm_drain_blocked, bank_erosion, underwater_area), `solid_waste` (garbage_not_collected, illegal_dumping, overflow_bin, street_unclean, construction_debris, market_waste, dead_animal, foul_odour), `traffic` (signal_fault, illegal_parking, road_encroachment, no_zebra, traffic_jam, wrong_side_driving, road_blocked, sign_broken), `public_transport` (bus_stop_damaged, bus_service, auto_stand, parking_lot, bus_route_gap), `health_hospitals` (hospital_facility, clinic_phc, ambulance, blood_bank, health_camp, food_safety, disease_outbreak, public_hygiene), `parks_public_space`, `public_conveniences` (public_toilet, drinking_water_stand, shelter_bench, street_furniture), `noise`, `public_safety` (stray_dogs, stray_cattle, unsafe_area, broken_fence, suspicious_activity, unsafe_crossing), `encroachment`, `building_inspection`, `trees`, `gas_fire_hazards`, `markets_trade`, `other`.
- **6 personal:** `billing`, `account_access`, `technical_support`, `privacy`, `feedback`, `other` (each with 3 subtypes).
- Include `legacy_migration.map` for existing app strings (Roads, Garbage, Lighting, Water Supply, … → v4 ids).
- **Rule:** any taxonomy change = version bump + all consumers updated in the same change.

### 1.2 Datasets (6, one flat schema)
Flat JSONL row: `{id, text, text_kind[templated_short|citizen_messy|synthetic|synthetic_boundary|app_live], language, category_id, subtype, priority, is_fake, spam_family, coords, h3_9(geo_id), status, created, source, source_ref, pii_redacted, labels{labeler, agreement}}`.
Layout: `datasets/{raw(gitignored)/processed(tracked)/eval(locked, hash-pinned)/flywheel(append-only)/images(manifests only)/reports/label_sets/}`.

| ID | Dataset | Feeds | Size target | Sources |
|---|---|---|---|---|
| D1 | `category_text` | hierarchical categorizer (+priority secondary task) | 20k; tiered minimums: common depts ≥ 800, medium ≥ 400, long-tail ≥ 200 (else merge + log) | NYC 311 stratified 30k (`76ig-c548` 2010–19, `erm2-nwe9` 2020+, free Socrata CSV; map Complaint Type→v4 via versioned `CATEGORY_MAP`, unmapped → `null`, never guessed) + BBMP 2020–25 (data.opencity.in CKAN; if text absent → use as distribution reference + status weak-labels) + synthetic citizen generator |
| D2 | `spam_text` | fake detector | 8k (4k fake / 4k real) | Seeded 8-family generator: random-ascii, QWERTY keyboard-mash, repeated-word, repeated-char, lorem, mixed-script (en+te+hi), symbol-digit, **scam templates** (100+ realistic) + real negatives: BBMP `Non-Relevant` rows + **hard negatives** = near-real complaints with 1–2 corrupted tokens (label `is_fake=0`, tag `synthetic_boundary`) |
| D3 | `images_cv` | YOLO | 15–25k imgs, 20 classes | Roboflow seed sets: IIT Madras pothole 2,722 (public domain), Federico II road-damage 566 (8 cls), 11-class civic objects (MIT); every source class → exactly one target class via versioned `class_map.json`; + your-city flywheel images (moderator one-tap labels) 500–1k before v2 training; night-exposure augmentation mandatory |
| D4 | `image_text_pairs` | matcher calibration | 2k training + 500 golden | Aligned (image × its class's text) + mismatched (image × other-category text, stratified by confusability) + 500 real pairs double-labeled by 2 moderators (κ ≥ 0.7) → fixes thresholds τ_low/τ_high |
| D5 | `duplicate_pairs` | dup thresholds + cluster seeds | 1k verified pairs | NYC 311 real (text, lat/lng, date, type): rule-candidates = same H3-res9 + same type + Δt < 90 d → human-verify 300 hits + 300 near-misses; + synthetic near-dups at known offsets (0 m / 200 m / 1.5 km) |
| D6 | `priority_text` | priority head | piggybacks D1 | weak labels: BBMP status/resolution-time; golden 1k human-labeled (High = "hurt in 72 h if untouched") |

### 1.3 Synthetic citizen generator (replaces the dead mock)
Frame-first: `{dept, subtype, location, time, severity, consequence}` → stochastic surface: case variants, typo injection p≈0.1, abbreviations (st/rd/pls), **code-mixing tokens** (bhaiya, jaldi karo, kripya), fragments, rare emoji, urgency fillers. Geography: **60% clustered around 8 hotspots ±300 m** (natural duplicate clusters for D5), 40% uniform. Priority heuristics: dept risk table + trigger words. **Seed-pinned: same seed ⇒ byte-identical output** (manifest records seed + sha256). Tooling already built & verified: `tools/generate_citizen_corpus.py`, `tools/generate_spam_corpus.py`, `tools/fetch_nyc311.py`, `tools/fetch_bbmp.py`, `tools/dataset_report.py` (all stdlib-only).

### 1.4 Labeling & QC protocol
- 2 independent labelers per item → Cohen's κ per batch; κ < 0.6 ⇒ fix spec, re-pilot 50; disagreements → 3rd arbiter.
- Label spec = one page per task: operational definition + 5 ✅ + 5 ❌ examples + "when in doubt" rule (guide exists: `datasets/labeling_guide.md`).
- **Golden sets labeled last, by the most careful pair, hash-locked**; CI refuses any training whose data hash overlaps a golden hash (leakage gate).
- Every dataset ships a **data card**: source mix %, label-spec version, κ, class balance, known biases, exact regenerate command. No card ⇒ no model release.
- `dataset_report.py` gates: per-class minimums, exact-dup < 15 %, near-dup(real rows) < 30 %, no empty texts.

---

## 2. NLP PIPELINE (one producer, many consumers)

`civix_ml/pipelines/text.py` → **TextBundle**, the only code allowed to touch raw complaint text:
1. NFKC normalize, strip zero-width, collapse whitespace (WhatsApp/SMS paste-safe)
2. **fasttext lid.176** lang-ID; unknown/low-confidence ⇒ flag `language_unsupported`, route to human (first gibberish defense)
3. PII redaction: phone/email regex + spaCy NER (PERSON/GPE/LOC) → tokens (originals stay on the issue doc; model input only sees redacted)
4. spaCy lemmatize (`potholes→pothole`)
5. Civic **lexicon pass**: multi-word keys (open manhole, street light, water logging…) → canonical keys; this dictionary is shared with YOLO class mapping and taxonomy
6. Negation + urgency: `has_negation`, `urgency_score` (0–1: urgent/dangerous/spark/fell/injured), `question_words`
7. Emit: `text_norm` (for TF-IDF), `char_stats`, `word_stats`

Gates: p95 < 50 ms; unit tests per stage incl. real messiness ("POUTHOLE AT M G ROAD URGENT", "asdfghjkll", Hinglish, emoji).

---

## 3. ML MODELS (train, calibrate, serve — in this order)

### 3.1 Department categorizer (hierarchical)
- Stage 1: dept head — TF-IDF(1–2gram) + **LogisticRegression** (calibrated) baseline; upgrade: frozen **MiniLM-6** embeddings + linear, or fine-tuned MiniLM multi-task (dept + priority shared encoder).
- Stage 2: subtype head within predicted dept.
- **Abstain:** confidence gap < margin ⇒ `category=other` + `needsReview=true` (never force a wrong department).
- **Gate:** golden macro-F1 ≥ 0.85; per-dept recall ≥ 0.8 on common depts. Rule-based keyword scorer as offline fallback when model down.

### 3.2 Fake/spam detector (text)
- Stage 1 **rules** (instant, reason-coded): keyboard-run ≥ 5 (`KEYSIGNATURE`), char-entropy extremes (`LOW_ENTROPY`), < 12 chars with no domain term (`EMPTY_OR_TINY`), non-language (`NON_LANGUAGE`).
- Stage 2 **learned**: features = Shannon entropy (char uni/bi-gram), TTR, repeated-word/char, Burrows chi-square vs city-text reference, QWERTY adjacency runs, digit/symbol/uppercase ratios, lang-ID confidence, **domain-lexicon hit count**, same-reporter 24h rate, text-hash resubmit, EXIF-GPS-vs-coords distance, reporter trust → **LightGBM** + isotonic calibration.
- **Asymmetric policy** (false positive punishes an innocent citizen): p ≥ 0.90 ⇒ auto `Spam` + reason + **appeal link** (appeal → moderator → re-labels training data); 0.60–0.90 ⇒ `Pending + needsReview`; < 0.60 ⇒ pass.
- **Gate:** precision ≥ 0.95 at auto-spam threshold; per-family recall reported (a detector that only catches keyboard-mash fails).

### 3.3 YOLO civic object extractor
- 20-class taxonomy (pothole, crack, open_manhole, road_edge_damage, flooding, water_leak, garbage_pile, overflow_bin, broken/bent_streetlight, fallen_pole, hanging_wires, broken_sign, broken_bus_stop, damaged_fence, stray_animals, construction_barrier, parked_vehicle_obstruction, vegetation_obstruction, person, + spam-veto: food/interior).
- **YOLOv8n** (640), trained on D3 seeds + flywheel; export **ONNX INT8** (CPU p95 < 800 ms); night-shot augmentation; per-class recall gate (pothole ≥ 0.85).
- Response: `objects[]`, `category_votes` (class→dept aggregation), `spam_veto` (person-dominant/food/interior), `quality{blur(Laplacian), exposure, resolution, has_gps_exif}`, **CLIP ViT-B/32 image embedding**, EXIF GPS vs submitted coords → `geo_mismatch_km` (tamper evidence).
- Deployed as pure functions in the FastAPI service; models loaded at startup; every response carries `models{name:version}` (audit/replay).

### 3.4 Image–text matcher (no LLM)
- Channel A: CLIP cosine(text, image), norm-scaled. Channel B: **deterministic ontology vote** (top-1 YOLO class dept == text dept ⇒ 1.0, top-2 ⇒ 0.5, else 0.0) + hard veto (text "pothole" × image dominant "person" ⇒ mismatch).
- `match_score = 0.6·clip + 0.4·ontology`; τ_low/τ_high **calibrated on the 500-pair golden set** (sweep, store in versioned `thresholds.json`, echoed in every response).
- **Gate:** AUC ≥ 0.90 on golden. Evidence output: top objects + matched terms — human-readable, feeds the moderator UI and appeals.

### 3.5 Duplicate & region clustering
- **H3**: res-9 (~165 m) = same-place; res-8 k-ring (k≤2, ~1.5 km) = same-region. Mongo indexes `{h3_9, category}`, `{h3_8, createdAt:-1}` + 2dsphere.
- **Semantic**: MiniLM-768d on TextBundle; **FAISS IndexFlatIP** over geo-pre-filtered candidates (exact cosine; swap HNSW only if a neighborhood exceeds ~10k).
- Rules (calibrated on D5 verified pairs): `cos ≥ 0.82` same-hex ⇒ duplicate; `cos ≥ 0.78` + same dept in k-ring ⇒ region-similar.
- **`IssueCluster` model**: hex, dept, centroid, members, `embeddingMean` (running mean = O(1) first-pass similarity), `upvoteCount`, derived status. New issue joins or creates; join ⇒ reporter offered **"Confirm existing report"** (409 flow already exists in frontend — wire it to the cluster).
- Two surfaces: **advisory pre-submit** `POST /v1/duplicates/check` (p95 < 100 ms) + **authoritative post-commit** worker job.
- **Gate:** precision ≥ 0.90 @ recall ≥ 0.75 on verified set; geo-distance × text-similarity boundary curves in the report.

### 3.6 Serving, eval, registry, flywheel
- **FastAPI** ML service (retire Django for AI paths): `/v1/predict/category`, `/v1/score/spam-text`, `/v1/extract/objects`, `/v1/match/image-text`, `/v1/find-duplicates`, `/healthz`, `/readyz`, `/metrics`. Python never writes to Mongo — it scores; **Express owns all writes** (one writer per collection; ML pool scales stateless).
- **Eval harness**: golden sets in CI; any artifact change ⇒ no regression > 2 pts on (macro-F1, spam precision, match AUC) vs promoted artifact, else block.
- **Model registry**: versioned artifact folders + `model-card.md` (data window, metrics, diff, author). Weekly retrain cron = external real + synthetic + **flywheel** (moderator category corrections, spam verdicts, dup confirms, image labels → append-only JSONL). Mix drifts 55/30/15 → 30/30/40 (app/live/flyweight) by month 6 — live data always wins eventually.
- **Shadow mode cutover**: run local + old path in parallel 1–2 weeks, log divergence, flip at ≥ 90 % agreement, feature-flag rollback.

---

## 4. BACKEND (Express)

1. **`/api/v1`** router; zod on every body; error envelope `{error:{code,message,details?}}` (never leak internals); Clerk `verifyToken` on all routes except explicitly public (map, healthz); RBAC middleware per portal.
2. **`createIssue` rewritten**: validate (zod, incl. honeypot field) → save `Received` → enqueue `{text_scoring, image_analysis, match_image_text, duplicate_check}` (idempotency key `issue:{id}:{job}`, retries 3 backoff 5s/60s/10m, DLQ + alert) → **201 < 600 ms**. Response includes `aiStatus` so UI can show "AI review pending".
3. **State machine** (fixes free-form strings): `Received → Assigned → In Progress → Pending Review → Resolved → Closed`; negative terminals `Rejected/Spam` **require reason codes** (DUPLICATE, FAKE_TEXT, FAKE_IMAGE, MISMATCH, OUT_OF_AREA, UNACTIONABLE) — these codes are the flywheel's label source. Priority enum stops containing `'Pending'`. `sla_watchdog` delayed jobs per priority (High 24 h / Med 72 h / Low 7 d to In Progress) ⇒ breach ⇒ `escalated` + notification.
4. **Map endpoint** `GET /api/v1/map/issues?bbox&status&category&since&near` → lean projection `{id, complaintId, lat, lng, status, categoryId, createdAt, clusterCount, isMine, hasImage}`, `$geoWithin $box`, **Rejected included**, Spam/private excluded, cap 500, 10 req/s limit.
5. **All list endpoints**: keyset pagination (`?before={createdAt},{id}&limit=50`), `.lean()` + explicit projections, read replica preference.
6. **Uploads**: `GET /v1/upload-preset` (short-lived Cloudinary signed, 8 MB, image/*) + `POST /v1/upload-complete` → client uploads **directly to Cloudinary**; EXIF read/GPS-check/sharp re-encode happen in the worker, never the request path.
7. **Socket bus**: every state transition emits `issue:{id}:status` + publishes `invalidate:issue:{id}` and `invalidate:map:{hex8}` to Redis pub/sub (cache invalidation + live map from one bus).

---

## 5. FRONTEND (React)

### 5.1 Design system — "modern product, not vibe-coded"
- **Tokens** (`src/styles/tokens.css`, consumed by Tailwind): stone/slate neutrals; **one accent** (teal-600); **semantic status tokens**: pending=amber, in-progress=sky, resolved=green, rejected=slate-gray (rejection is not a fire), spam=purple, danger=red. Inter self-hosted (400/500/600/700), `tnum` on IDs/counts. 12/14/16/20/24/30 type scale. 4px space scale. Radii 6/10/14. Two shadows only. Dark mode = same tokens inverted.
- **Kill list (enforced by stylelint/ESLint):** no gradient text; no glassmorphism/backdrop-blur; no emoji in UI chrome; no decorative `animate-pulse`; no `rounded-3xl` soup; no CDN icon pins. **Purge** to one icon lib (lucide) + one toast lib (react-hot-toast); delete unused deps (`three`, `aos`, `swiper`, `styled-components`, fontawesome, react-icons, react-toastify).
- **Components** (`src/components/ui/`): Button, Badge, **`StatusBadge`** (the ONLY legal way to render a status anywhere — map, cards, tables, timeline, notifications), Card, Field, Select, Modal, Drawer, Table, Skeleton, EmptyState, Tabs.
- **Per-portal layouts:** Citizen = 12-col, breathing 16 px; Officer = task rail + board + detail drawer, keyboard-driven (1–9 assign, `r` resolve), mobile-first; Moderator = **evidence panel** (ML feature breakdown side-by-side: text features, YOLO boxes drawn on image, match score, geo distance) + Approve/Reject reason-code picker (this UI IS the flywheel); Admin = KPI cards + issues table + users + model-health.
- **A11y (non-negotiable):** AA contrast (CI script parses tokens), visible focus rings, keyboard-navigable map (marker list focusable), `aria-live` toasts, `prefers-reduced-motion`, labels never placeholder-only.
- **Report flow:** 2-step linear (Type → Details), sticky summary sidebar, AI hints as subtle inline chips ("AI detected: pothole → set to Roads"), post-submit copy honest: "AI verification runs after submission — you'll be notified if anything needs review."

### 5.2 Map (rewrite `UserMap.jsx`)
- Bundled inline **SVG markers** (status fill from tokens; 10–12 px dot + 2 px ring) — zero external requests.
- `react-leaflet-cluster`; ≤ 500 DOM markers (endpoint caps it); cluster bubble = count + dominant status color.
- Status filter **includes Rejected**; counts server-verified; category filter; date range; "near me".
- Click marker → **side drawer** (bottom sheet on mobile): status badge, category, time-ago, confirm-report if mine, link to detail.
- **Heat layer toggle** (leaflet.heat) from precomputed per-hex stats.
- **Live**: join socket room `map:{h3_8}` for the viewport; status events animate marker color < 2 s (no refresh).
- CARTO dark tiles in dark mode; fitBounds to data; legend; skeleton loading; empty state; last viewport in sessionStorage; deep-links to issues.
- **Acceptance:** 5,000 seeded issues → first paint < 1 s, 60 fps, DOM ≤ 500; cross-tab status change visible < 2 s; Rejected renders gray with reason; Lighthouse mobile ≥ 90.

---

## 6. SYSTEM DESIGN — 100× SCALE (latency & performance)

**Definition:** 100× = 100k users, ~15k DAU, ~1,000 peak RPS reads, 5,000 issues/day, 500 map queries/min, 1,000 concurrent sockets, ~5 GB images/day. **At 100×, p95 must hold at the 1× target — it does not inflate.**

**Latency budgets (1× target = 100× target):** LCP < 1.5 s | submit < 600 ms | map viewport p95 < 300 ms | list < 400 ms | detail < 250 ms | taxonomy < 50 ms | async ML verdict < 3 s p95 | socket fan-out < 1 s | image upload < 2 s.

**Architecture:** CDN/edge → LB (sticky for sockets) → **N stateless API nodes** (1 process/container; **delete the fixed 4-worker cluster**) → Redis (cache + BullMQ + socket adapter) + Mongo Atlas (primary + 2 read replicas) + **separate ML pool** (scale by queue depth) + Cloudinary/S3 direct.

**Concepts (each with the repo change that implements it):**
1. **Statelessness + horizontal pool** — killable nodes: JWT (Clerk), no local files, shared caches, Redis-adapter sockets.
2. **Cache-aside + invalidation-on-write** — Redis L1; map TTL 30 s stale-while-revalidate (socket supplies freshness, not polling); detail 30 s; taxonomy 24 h; every write publishes `invalidate:*` to all nodes. Expected: 70–90 % of reads at 100× never touch Mongo.
3. **Read/write splitting** — GETs → `secondaryPreferred`; auto-promote to primary when lag > 2 s.
4. **Indexes + projection + keyset pagination** — 2dsphere, `{h3_8,status,createdAt:-1}`, `{h3_9,category}`, `{status,createdAt:-1}`, `{email,createdAt:-1}`; every hot GET `.select()+.lean()`; cursors, never `skip(10000)`.
5. **Save-then-enqueue** — §4.2; workers separate deploy; per-issue `aiAnalysis.jobs[]` = visible pipeline health.
6. **Backpressure + degradation** — circuit breaker on ML (open after 5 fails: issues stay `Received`, requeue every 5 min, **map/dashboards/submits never depend on ML**); queue > 5k ⇒ honest `reviewEta` in API + autoscale; Redis down ⇒ in-process LRU fallback; no request may block > 2 s (axios timeouts 1.5 s).
7. **Direct-to-storage uploads** — §4.6.
8. **Realtime that scales** — socket.io + `@socket.io/redis-adapter`; **rooms by geography** (`map:{h3_8}`) so fan-out = viewers of that area; dedupe by id; notifications collection doubles as offline/push bus.
9. **Edge & static** — self-hosted fonts, CDN images `q_auto,f_auto`, tile prefetch, virtualized admin tables.
10. **Resource discipline** — Mongo pool 20/5, one connection pair; axios keep-alive; JSON cap 1 MB; heavy image work in workers only.
11. **Tiered rate limiting** — edge (IP) + per-route/per-user (submit 60/min, map 60/min, auth 10/min) + honeypot → spam label.
12. **DB scale plan** — M30+2 replicas → M40+3 at 100×; sharding **prepared, not executed**: `issues` on `hashed(h3_8)` (geo-local, map queries shard-local), trigger = sustained > 2k writes/s or > 10 TB — a civic app at 100× users will almost certainly never need it; the plan exists so the decision is measured, not panicked.
13. **Observability = capacity planning** — pino + correlation IDs; Prometheus/Grafana boards (saturation: RPS, p95/99, cache hit, pool wait, queue depth, DLQ, sockets; degradation: breaker state, replica lag, requeue rate); page-level alerts (p95 > 2× target 5 min, DLQ > 10, depth > 5k, lag > 2 s, hit < 50 %).
14. **Precomputation** — cluster counts maintained by the dup worker (map reads integers, never aggregates); nightly per-hex heat stats; 5-min trending; daily analytics materializations.

**Capacity math (confirm by k6):** API node ≈ 1,000 RPS cached ⇒ 2–3 nodes at 100×; Redis ≈ 100k ops/s ⇒ 1 instance; Mongo ≈ 150–200 indexed reads/s reaching DB ⇒ ~5 % of M40; ML ≈ 12–18 verdicts/min per 2 vCPU node ⇒ 2 nodes + autoscale (monsoon spike is the real constraint); sockets ≈ 10–20k/node ⇒ covered.

**Proof (a 100× claim without this is an opinion):** k6 scenarios (submit@100× with images; map 500 q/min; 80/15/5 mixed at 100×B; ML-stress 60/min×10 min) nightly in CI with thresholds; monthly chaos drills (kill ML mid-submit ⇒ breaker < 5 s, zero failed submits; kill Redis ⇒ reads < 1 s; lag replica ⇒ no failed reads; kill an API node ⇒ sockets resume < 2 s, no stuck jobs). **Go-live gate:** all drills pass + 10 consecutive green mixed runs + empty DLQ + p99 ≤ 2× budget.

---

## 7. DELIVERY SEQUENCE & GATES (do not skip; each gate is testable)

| Milestone | Deliver | Gate to proceed |
|---|---|---|
| **M0 — Contracts** | `taxonomy.json` v4 + legacy migration; TextBundle pipeline + tests; design tokens + `ui/` primitives (Badge, Button, Card, Field, Drawer, Table) | pipeline p95 < 50 ms; `StatusBadge` renders all statuses; open API routes closed |
| **M1 — Dataset v1** | NYC 311 + BBMP pilots → full fetch (mapping tables finalized from `--inspect`); spam corpus 8k + citizen corpus 12k; reports; train/dev/**locked golden** (500 cat, 500 spam, 300+300 dup pairs, 500 image-text) with κ reports; data cards; image manifests (3–5 Roboflow sets + `class_map.json`) | all `dataset_report` gates pass; golden hashes pinned; κ ≥ 0.6 per task |
| **M2 — Text ML live** | FastAPI service (category + spam + priority); eval harness + CI regression gate; BullMQ + workers wired into `createIssue`; shadow logs vs old path | golden: macro-F1 ≥ 0.85, spam precision ≥ 0.95; submit p95 < 600 ms; divergence ≥ 90 % ⇒ flip flag |
| **M3 — CV live** | YOLOv8n trained (seeds) → ONNX INT8; `/extract/objects` (quality + EXIF-GPS); CLIP; `/match/image-text` calibrated; moderator evidence panel v0 | per-class recall gates; match AUC ≥ 0.90; end-to-end async verdicts on issue doc < 3 s |
| **M4 — Duplicates + map** | H3 + FAISS + `IssueCluster`; pre-submit check + post-commit worker; `/v1/map/issues`; full `UserMap` rewrite + socket geo-rooms | §5.2 acceptance 1–5; dup precision ≥ 0.90; 5k-issue seed 60 fps |
| **M5 — Design pass** | All 4 portal layouts per §5.1; kill-list lint active; a11y fixes; dep purge | AA verified by CI; Lighthouse ≥ 90 on map/report/dashboards |
| **M6 — Scale P0→P1** | §6 concepts 1–11 implemented (cache, replicas, pagination, direct uploads, socket adapter, breaker, observability, k6 baseline) | k6 10×B green; map p95 < 300 ms with 70 %+ cache hit |
| **M7 — Hardening + rollout** | SLA watchdog + reason codes end-to-end; chaos drills; M40 sizing; sharding script tested; shadow 7 days; runbooks + model cards; E2E (report → map → resolve → live green marker; spam appeal) | §6 go-live gate; 7-day shadow ≥ 90 % agreement; go/no-go signed |

**Definition of done for any work item:** code + tests + (model or) data card + metrics + documented failure behavior. If any is missing, it is not done.

---

## 8. DEPLOYMENT & ENV (reference values — confirm against infra)

- Frontend: Vercel (SPA + CDN). API: 2–4 stateless 2 vCPU nodes behind LB. ML: 2 vCPU / 4 GB reserved instances, autoscale on queue depth. Mongo: Atlas M30→M40 + replicas. Redis: managed 1 GB (cache + queue + socket). Media: Cloudinary CDN.
- Secrets: `ML_SERVICE_URL`, Cloudinary, Clerk, Atlas, Redis — env only, never in repo. No LLM keys needed post-cutover (retire them).
- Docker Compose for local parity: mongo, redis, api, worker, ml.
- CI/CD: PR → lint (ESLint + stylelint + ruff) + typecheck + unit + build + compose API tests + audits; ML changes → golden eval gate (−2 pt blocks); main → images → API deploy → ML deploy → Vercel auto → smoke (`/healthz`, `/readyz`, one map query, one issue create).

**If anything here is ambiguous, pick the option that keeps (a) submit < 600 ms, (b) zero LLM calls, (c) one-writer-per-collection, (d) every verdict replayable via model version — and record the choice in the relevant data/model card.**
