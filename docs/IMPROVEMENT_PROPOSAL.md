# Civix — Production-Ready Improvement Proposal

**Scope:** NLP/ML pipeline (no LLM APIs), YOLO computer vision, image–text matching, fake-report detection, geospatial duplicate clustering, map re-architecture, frontend design system, and production hardening.

**Status:** Proposal v1.0 — every section maps to real files in this repo. Phase plan at §13.

---

## 1. Executive Summary

Today, "Civix AI" is 100% Gemini LLM prompts with local sklearn models that are trained but never served. The map is a prototype. The UI reads as generic AI-generated. This proposal replaces the AI layer with a **self-hosted, deterministic, cheap, explainable ML stack** (classic NLP + YOLO + CLIP + H3 geospatial), fixes the map as a first-class geospatial product, and gives the frontend a disciplined design system.

**Headline deliverables**

| # | Deliverable | Method (no LLM) | Key metric |
|---|---|---|---|
| D1 | Shared NLP preprocessing pipeline | Normalization, PII redaction, lemmatization, language ID, domain lexicon | p95 < 50 ms |
| D2 | Department categorization | TF-IDF → calibrated linear model, then fine-tuned MiniLM (multi-task) | macro-F1 ≥ 0.85 |
| D3 | Image feature extraction | YOLOv8n (ONNX) on civic object taxonomy + CLIP ViT-B/32 embeddings | p95 < 800 ms (CPU) |
| D4 | Description–image match | CLIP cosine + YOLO-class ontology vote, calibrated threshold | AUC ≥ 0.90 |
| D5 | Fake/spam text detection | Statistical feature stack (entropy, TTR, n-gram, keyboard-mash) → LR/LightGBM | precision ≥ 0.95 |
| D6 | Same-place / similar-issue clustering | H3 geohashing + MiniLM embedding cosine in H3 k-ring; union-find clusters | dup precision ≥ 0.90 |
| D7 | Map re-architecture | `bbox`-server-side filtered endpoint, clustering, status colors, live socket updates | p95 < 300 ms |
| D8 | Frontend design system | Token-driven, anti-"vibe-coded" rules, per-portal layouts | Lighthouse ≥ 90, AA contrast |
| D9 | Production hardening | Versioned API, job queue, eval harness, metrics, CI/CD, shadow-mode rollout | 99.5% uptime target |

**Architecture decision (kept deliberately boring):**

- Keep **Express** for the API, **MongoDB** for data, **Redis** (new) for the job queue, **Vercel** for frontend.
- Rebuild the ML service as a **FastAPI** app (drop Django + DRF for the AI paths) — YOLO/ONNX/sentence-transformers are idiomatic in this stack, and FastAPI gives you OpenAPI, async, and `/metrics` for free. The existing Django app can be retired once endpoints migrate (shadow-mode cutover, §12.6).
- **No LLM calls anywhere in the prediction path.** Every prediction is a local, deterministic model run inside our own infra.

---

## 2. Current-State Audit (what the code actually does)

| Area | File | Finding |
|---|---|---|
| AI endpoints | `ml_service/api/views.py`, `ml_service/api/advanced_ai.py` | `predict-priority`, `detect-fake`, `categorize`, `find-duplicates`, `get-embedding`, `analyze-image`, `generate-caption`, `validate-issue-image` all call **Gemini** (`gemini-1.5-flash` / `2.5-flash` / `embedding-001`). Latency 1–5 s, per-call cost, key in env, zero offline capability. |
| Local models | `ml_service/civix_ml/train_models.py` | Trains TF-IDF+SGD `priority_model.pkl`, `category_model.pkl`, `fake_model.pkl` — **never imported by any view**. Dead code. |
| Dataset | `ml_service/datasets/civic_data.csv` (5,000 rows) | Synthetic, generated from 8 sentence templates + keyword lists (`generate_dataset.py`). Distribution is far from real citizen writing → training on it alone produces a model that overfits to its own generator (see §4.4). |
| Taxonomy drift | Frontend `ReportIssue.jsx` (`Roads, Electricity, Water, Sanitation, Traffic, Public Transport, Garbage, Other`) vs Gemini prompt in `views.py` (`Roads, Electricity, Water, Sanitation, Traffic, Public Transport, Billing, Technical Support, Profile, Other`) vs dataset (`Water Supply, Safety, Noise, General`) | **Three different category taxonomies** flow into one `category` string field. Any ML model trained on one will mislabel the other two. |
| Request path | `backend/controllers/issues.js` → `createIssue` | Synchronously fans out 4 Gemini calls (`Promise.allSettled`), *then* saves, *then* fire-and-forget `validateImageAsync`, *then* fetches 100 issues and asks the ML service to diff them. One user submission = up to 6 external LLM round-trips; 5–15 s before response; partial failure modes everywhere (`debug_error` leaks into responses). |
| Map | `src/Pages/UserMap.jsx` | Calls unauthenticated `GET /api/issues` (returns **all** issues, full docs, no projection); parses coordinates out of the free-text `location` string with a fragile `split(',')`; markers are flaticon.com CDN PNGs (external dependency, breaks offline); no clustering (10k issues = 10k DOM nodes); status filter omits `Rejected`; popups are heavyweight; no socket updates; `key={idx}` anti-pattern. |
| API surface | `backend/routes/issues.js` | `GET /api/issues`, `GET /:id`, `POST /analyze-image`, `POST /generate-caption` have **no auth**; no pagination on list endpoints; no `/api/v1` versioning. |
| Schema | `backend/models/issues.js` | Good bones (`coordinates`, `embedding` (select:false), `timeline`, `duplicateAnalysis`, `resolution`) but: no H3/geohash fields, no `clusterId`, no reason codes on rejection/spam, `embedding` never populated by any code path, `priority` enum includes `'Pending'` (status leaking into priority). |
| Frontend style | `src/Pages/UserMap.jsx`, `ReportIssue.jsx`, etc. | Gradient-painted headers, glassmorphism `backdrop-blur` panels, emoji in option labels (`🟡 Pending`), `animate-pulse` on decorative elements, `rounded-3xl` everywhere, CDN icon fonts, dual toast libraries (react-hot-toast **and** react-toastify both in package.json). Reads as "AI-coded" because there is no single design system. |

---

## 3. Target Architecture

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                        Browser (React)                   │
                    │  Report flow │ Map (clustering+heat) │ Portals (RBAC)    │
                    └───────┬───────────────┬──────────────────────┬───────────┘
                            │ REST /api/v1  │ socket.io            │ media
                            ▼               ▼                      ▼
┌────────────────────────────────────────────────────┐        ┌───────────┐
│  Express API  (Node 18+, cluster)                  │        │ Cloudinary│
│  • auth (Clerk)  • RBAC  • validation (zod)        │        │  (images) │
│  • issue CRUD    • map endpoint (geo queries)      │        └───────────┘
│  • job enqueue   • OpenAPI spec                    │
└──────┬───────────────────────────┬─────────────────┘
       │ enqueue (idempotent)      │ reads
       ▼                           ▼
┌──────────────┐            ┌──────────────────┐        ┌────────────────────────┐
│ Redis +      │            │ MongoDB Atlas    │        │ FastAPI ML Service     │
│ BullMQ       │───────────▶│ • Issue          │◀──────▶│ /predict/category      │
│              │  job:      │ • IssueCluster   │  score │ /extract/objects (YOLO)│
│ image_analysis│  results  │ • H3 res8/9 idx  │  write │ /match/image-text      │
│ duplicate_check│          │ • 2dsphere       │        │ /score/spam-text       │
│ spam_check    │           │ • vectors (FAISS │        │ /find-duplicates       │
│ sla_watchdog  │           │   sidecar)       │        │ /healthz /metrics      │
└──────────────┘            └──────────────────┘        └────────────────────────┘
        ▲
        │ all jobs are idempotent, retried w/ backoff, dead-lettered
```

**Latency budgets (production targets)**

| Path | Budget |
|---|---|
| Submit issue (user-visible response) | **< 600 ms** (save + enqueue; no ML in critical path) |
| ML pipeline total (async, after save) | < 3 s (image p95 800 ms + text 100 ms) |
| Map tiles query (`bbox`) | p95 < 300 ms, ≤ 500 docs per response |
| Text-only predictions (category + spam + dup) | p95 < 250 ms |
| Frontend LCP (portal pages) | < 2.5 s on 4G |

**Rule #1 of the redesign:** the citizen's "Submit" never waits for the AI. Everything ML is post-commit, queued, idempotent, and observable. (The current `INTEGRATION_GUIDE.md` async idea is correct — this proposal makes it real with a queue instead of fire-and-forget.)

---

## 4. NLP Preprocessing Pipeline (shared text front-end)

A single, tested `TextBundle` producer that **every** text model (category, spam, duplicate, matching) consumes. No model may do its own ad-hoc `.lower().strip()`.

**File:** `ml_service/civix_ml/pipelines/text.py` (new), fixtures in `ml_service/tests/fixtures/text/*.txt`.

### 4.1 Stages

| Stage | Operation | Notes |
|---|---|---|
| 1. Ingest | Coerce to `str`, NFKC unicode normalize, strip zero-width chars, collapse whitespace | Handles copy-paste from WhatsApp/SMS (very common in civic complaints) |
| 2. Language ID | `fasttext lid.176` | If not `en`/known local language with confidence > 0.6 → flag `language_unsupported` (don't classify; route to human). This is your first line of gibberish defense (§7) |
| 3. PII redaction | Regex: phone (in-country patterns), email; spaCy `en_core_web_sm` NER for `PERSON`, `GPE`, `LOC` | Replace with `[PHONE]`, `[LOC]` tokens for model input **only**; originals preserved on the issue doc for officers. Prevents model memorization + keeps duplicate matching location-aware but PII-free |
| 4. Tokenize & lemmatize | spaCy tokenization; lemmatization (`potholes → pothole`) | Lemma used by TF-IDF; raw tokens kept for n-gram spam features |
| 5. Domain lexicon pass | Civic domain dictionary (multi-word: "manhole cover", "street light", "dustbin", "open manhole", "water log") mapped to canonical keys | `open manhole` and `manhole is open` → same key. This dictionary is the **single source of truth** shared with YOLO class→category mapping (§5.3) and the category taxonomy (§4.2) |
| 6. Negation & intensity | Simple windowed negator detection ("no water", "not working"), urgency markers ("urgent", "dangerous", "spark", "fell", "injured") | Emitted as engineered features `has_negation`, `urgency_score` (0–1), `question_words` — consumed by categorizer & priority model |
| 7. Normalized fields | `text_norm` (lemmatized, lowercased, stopwords removed for TF-IDF), `text_raw`, `char_stats`, `word_stats` | Deterministic; `hash(text_norm)` is the idempotency seed for queue jobs |

### 4.2 Category taxonomy (single source of truth)

Define **one** taxonomy file consumed by: dataset generator, model trainer, API validator, frontend select, YOLO mapper.

**File:** `ml_service/civix_ml/taxonomy.json` (new) — mirrored at build time to `src/constants/categories.ts`.

```json
{
  "version": 3,
  "public": [
    {"id": "roads",   "label": "Roads",            "dept": "Roads & Bridges"},
    {"id": "water",   "label": "Water Supply",     "dept": "Water & Sewerage"},
    {"id": "electric","label": "Electricity",      "dept": "Electrical"},
    {"id": "sanitation","label":"Sanitation & Waste","dept": "Solid Waste"},
    {"id": "traffic", "label": "Traffic & Signals","dept": "Traffic Police"},
    {"id": "transport","label":"Public Transport", "dept": "Transit"},
    {"id": "safety",  "label": "Public Safety",    "dept": "General Duty"},
    {"id": "parks",   "label": "Parks & Public Space","dept": "Civic Amenities"},
    {"id": "noise",   "label": "Noise",            "dept": "General Duty"},
    {"id": "other",   "label": "Other",            "dept": "General Duty"}
  ],
  "personal": ["billing","account_access","technical_support","privacy","feedback","other"]
}
```

**Migration:** one-time script mapping legacy strings (`Garbage → sanitation`, `Lighting → electric`, `Water Supply → water`, `Safety → safety`) stored in a `category_legacy` field so old data keeps rendering.

### 4.3 Quality gates

- Unit tests per stage (golden fixtures incl. real-world messiness: "POUTHOLE AT M G ROAD URGENT", "asdfghjkll", "waterwaterwater", Hinglish, emoji-laden).
- Benchmark: 100 random texts, p95 < 50 ms (spaCy pipeline `disable=["parser","attribute_ruler"]`).
- **The pipeline is the only code allowed to touch raw complaint text.** Code-review rule + lint: no `request.description` access outside controllers.

---

## 5. Computer Vision — YOLO Feature Extraction

### 5.1 Class taxonomy (civic objects, 20 classes)

```
pothole, crack, open_manhole, road_edge_damage, flooding, water_leak,
garbage_pile, overflow_bin, broken_streetlight, bent_streetlight,
fallen_pole, hanging_wires, broken_sign, broken_bus_stop, damaged_fence,
stray_animals, construction_barrier, parked_vehicle_obstruction,
vegetation_obstruction, person (privacy/safety context only)
```

Every class maps to exactly one `taxonomy.json` category and a set of lexicon keys:

| YOLO class | Category | Lexicon keys |
|---|---|---|
| pothole, crack, open_manhole, road_edge_damage | roads | pothole, road damage, broken road, manhole, uneven |
| flooding, water_leak | water | water leak, burst pipe, water logging, drainage |
| broken_streetlight, bent_streetlight, fallen_pole, hanging_wires | electric | street light, pole, wire, transformer |
| garbage_pile, overflow_bin | sanitation | garbage, trash, dustbin, waste, smell |
| broken_sign, broken_bus_stop | transport/roads | bus stop, sign board |
| stray_animals, damaged_fence, vegetation_obstruction | safety | stray dog, fence, tree fall |
| parked_vehicle_obstruction, construction_barrier | traffic | road blocked, wrong parking, barricade |
| **person (portrait-dominant)**, food, interior | — | *spam-veto classes* (§7.3) |

### 5.2 Model & training

- **Base:** YOLOv8n (640) — ~6.7 M params, ~30–60 ms/inference on modern CPU with ONNX Runtime (INT8). If GPU available in the ML deployment, YOLOv8s for +3 mAP.
- **Data:**
  1. Seed: public Roboflow datasets (Road Damage, Garbage/Dump, Street Furniture Damage, Flood) — ~15–25k labeled images.
  2. **Flywheel:** every issue image gets an admin/moderator "label" affordance (thumbs + class correction chip) in the moderator portal; corrections land in `ml_service/datasets/real/*.jsonl` (image URL + class + category + verdict). This is how you get to 92%+ *on your city's* images, not on a benchmark.
  3. Augmentation: Mosaic, mixup, hue/blur/rotate 30°, night-photo exposure sim (critical: most pothole photos are night phone shots).
- **Eval:** COCO mAP@50 + per-class recall on a held-out 15%; per-class recall gate (pothole recall ≥ 0.85 — missing the main object is the expensive failure).
- **Export:** ONNX → ONNX Runtime INT8 quantized model + calibration dataset (500 city images). Commit artifact to a versioned `models/cv/yolov8n-v{n}/` folder with `model-card.md` (§12.5).

### 5.3 Serving contract

```
POST /v1/extract/objects
Content-Type: multipart/form-data  (file)   or   {"imageUrl": "..."}
200 {
  "objects": [{"class": "pothole", "conf": 0.91, "bbox": [x1,y1,x2,y2]}, ...],
  "category_votes": {"roads": 0.91, "sanitation": 0.12},     // class→taxonomy aggregation
  "spam_veto": null | {"class": "person", "dominant_area_ratio": 0.87},
  "quality": {
    "blur_score": 0.14,            // 1 − Laplacian variance, normalized
    "exposure": "ok" | "under" | "over",
    "resolution_px": 4032,
    "has_gps_exif": true
  },
  "embedding": [ ... 512-d ... ],  // CLIP ViT-B/32 image embedding (§6)
  "model": {"cv": "yolov8n-v4", "clip": "vitb32-laion-v1"}
}
```

- Preprocessing: letterbox to 640, max side cap 1280 (resize down — citizen photos are 4000 px; don't waste compute).
- Quality checks are computed **in the CV worker** (cv2), not in the API — API just relays.
- `has_gps_exif`: when true, the worker returns the EXIF GPS; backend compares it to the submitted coordinates — **a >5 km mismatch is strong tamper evidence** (photo not taken at the reported spot). Goes into `aiAnalysis.geo_mismatch_km`.

### 5.4 Deployment reality check

- FastAPI worker, 1–2 CPU cores reserved, models loaded at startup (not per-request — current code's "lazy init" is fine but must log a `model_cold_start` metric so you can see it).
- On Render: this is a **dedicated instance** (not the free tier) — ONNX INT8 YOLOv8n on a 2 vCPU instance sustains ~10–20 img/min; that is the honest capacity number. Autoscale to 2 instances above 70% queue depth.

---

## 6. Description–Image Matching (no LLM)

Two independent channels, combined by a fixed weighted score. No prompts, no tokens.

### 6.1 Channel A — CLIP semantic similarity

- Model: `open_clip ViT-B/32` (or `laion2b_s34b_b79k` ViT-B/32) — 512-d embeddings for **both** sides.
- Text side: `text_norm` + title, truncated to 77 tokens (CLIP limit) — the §4 pipeline guarantees it's clean before this point.
- Score: `cosine(image_emb, text_emb)`. CLIP cosine for image–text typically lands 0.15–0.35; **calibrate the threshold on your own data** (below), never trust the paper's.

### 6.2 Channel B — YOLO ontology vote (deterministic, explainable)

From §5.3 `category_votes` and lexicon keys present in the text:

```
ontology_match = 1.0  if  (top-1 YOLO category == text category)
                = 0.5  if  (top-2 YOLO category == text category)
                = 0.0  otherwise
```

Plus a **hard veto** list: text says "pothole" but image's dominant object is `person`/food/interior → mismatch regardless of cosine. This channel is what a human moderator would actually use, which is why it stays deterministic and reportable ("Image shows a person, description describes a pothole").

### 6.3 Combination & decision

```
match_score = 0.6 * clip_cosine_norm + 0.4 * ontology_match
decisions:  ≥ τ_high (calibrated ≈ 0.55)  → MATCH
            τ_low  (≈ 0.35) .. τ_high     → UNCERTAIN → moderator review, timeline entry
            < τ_low                         → MISMATCH → trust −5, timeline entry,
                                               officer sees a warning (not auto-reject)
```

### 6.4 Calibration protocol (this is what makes it "production")

1. Collect 500 real (text, image) pairs from live issues where a moderator already accepted/rejected — label as match/mismatch (2 moderators, κ > 0.7).
2. Sweep τ_low/τ_high on that set; fix them in `thresholds.json` (versioned, logged in every response).
3. Re-calibrate monthly, or whenever the text pipeline version changes.

**Response contract**

```
POST /v1/match/image-text   {issueId | {text, imageUrl}}
200 {"match": "MATCH"|"UNCERTAIN"|"MISMATCH",
     "score": 0.62, "clip_cosine": 0.58, "ontology": 0.8,
     "evidence": {"top_objects": ["pothole"], "matched_terms": ["pothole","road"]},
     "models": {...}}
```

---

## 7. Fake / Spam / Gibberish Detection (text side, no LLM)

The current "is it fake" check is one Gemini prompt. Replace with a **stacked statistical + learned detector** that is fast, explainable, and free.

### 7.1 Feature families (all computed on `TextBundle`)

| Family | Features | Catches |
|---|---|---|
| Entropy | Shannon entropy of char unigrams & bigrams (bits/char) | Random strings (H≈5.0+ for English text; keyboard mash ≈ 3.3; "asdkjh" etc.) |
| Vocabulary | Type-Token Ratio, unique bigram ratio, repeated-word count, max word-run length | Repetition spam ("water water water"), copy-paste walls |
| N-gram anomalies | Burrows-type chi-square distance vs. a city-text reference corpus; top-10 unseen bigrams | Gibberish that's low-entropy but still not language |
| Keyboard structure | Consecutive-on-QWERTY run length, diagonal runs, shift-alternation | "asdfghjkl", "qwertyuiop" |
| Composition | digit ratio, symbol ratio, uppercase ratio, line count, word count, digit-alternation | "1234567890", "??!?" |
| Language | fasttext lang confidence, lang-switch count | Mixed random language mash |
| Domain fit | Count of civic-domain lexicon hits (§4.1), phone/road-number presence, question-ness | Legitimacy prior — a real complaint mentions *something* civic |
| Behavioral | Same-reporter rate (last 24 h), same-text resubmit hash, coords-vs-EXIF distance (§5.3), reporter trust score | Abuse patterns |

### 7.2 Model

- **Stage 1 (rules, instant):** hard rejections with reason codes — `KEYSIGNATURE`, `LOW_ENTROPY`, `EMPTY_OR_TINY` (< 12 chars with no domain term), `NON_LANGUAGE`.
- **Stage 2 (learned):** features above → `LogisticRegression` (baseline, explainable via `coef_`) → **LightGBM** (target). Trained on: `is_fake` from the existing CSV **+** synthetic spam generators (5 classes: random-ascii, keyboard-mash, repeated-words, lorem, mixed-lang) **+** real spam collected via the flywheel (moderator "spam" verdicts land in the training set automatically).
- **Calibration:** isotonic regression on a holdout → `p_fake`.
- **Decision policy** (asymmetric — false positives punish innocent citizens):

| p_fake | Action |
|---|---|
| ≥ 0.90 | `status = "Spam"`, reason code, notification with **appeal link** (appeal → moderator queue; moderator verdict re-labels the sample) |
| 0.60 – 0.90 | Keep `Pending`, `needsReview = true`, appears in moderator queue with feature breakdown shown ("why flagged") |
| < 0.60 | Normal flow |

- **Metrics gate:** precision ≥ 0.95 at the auto-spam threshold, recall on the 0.6–0.9 band ≥ 0.8 (review volume is the cost; precision is the contract).

### 7.3 Image-side spam (selfies, food, memes)

No LLM needed: YOLO spam-veto classes (`person` dominant, food, interior) + CLIP **zero-shot** scores against the template list `["a photo of a public infrastructure problem", "a selfie", "a photo of food", "a screenshot or meme", "a pet or animal indoors"]` → softmax → `image_spam_score`. Combined with §7.2 into a single `fraudScore` stored on `Issue.aiAnalysis`.

### 7.4 Why this beats the LLM prompt here

Deterministic (same input → same verdict, 24/7), < 30 ms, ₹0 marginal cost, every verdict carries a **human-readable reason vector** ("keyboard-run length 7, TTR 0.04") — which the moderator UI shows. Explainability is not a nice-to-have; it's the appeal mechanism.

---

## 8. Duplicate Detection — Same Place + Same Region (geospatial + semantic)

The current implementation fetches 100 issues and asks Gemini to read them. Replace with a two-layer index that scales to 100k issues in milliseconds.

### 8.1 Layer 1 — Geospatial (H3)

- Index every issue with **H3**: `h3.latlngToCell(lat, lng, res=9)` (~165 m hexagon) for *same-place*, `res=8` (~500 m) for *region*.
- Mongo indexes: `{h3_9: 1, category: 1}` and `{h3_8: 1, createdAt: -1}` (+ existing 2dsphere for circle queries).
- **Same-place rule:** same `h3_9` + same `category_id` + active status → duplicate candidate.
- **Region rule:** H3 `kRing(cell_res9, k=2)` (≈ 1.5 km neighborhood) for "similar issues nearby" — used both for dedup and for the map's cluster count.

### 8.2 Layer 2 — Semantic (embeddings)

- `all-MiniLM-L6-v2` (768-d, ~30 ms CPU, runs in-process in the FastAPI worker — no external API, satisfies "no LLM API").
- Stored on `Issue.embedding` (field already exists; set `select: false`, index only via FAISS sidecar).
- Retrieval: **FAISS `IndexFlatIP`** over active issues in the H3 neighborhood (candidate set typically 0–40 issues after geo pre-filter — exhaustive cosine is fine and exact; no ANN approximation needed until > 10k per neighborhood, at which point swap in `IndexHNSWFlat` behind the same interface).
- **Similarity rule:** `cosine ≥ 0.82` within same `h3_9` (same place, similar wording) **or** `cosine ≥ 0.78` + same category within `h3_8` k-ring (same region, similar type). Thresholds calibrated on moderator-confirmed duplicate pairs (§6.4 protocol).

### 8.3 Cluster model & lifecycle

```js
IssueCluster = {
  _id, h3_9, h3_8, categoryId, centroid: {lat,lng},
  memberIssueIds: [ObjectId...],   // capped at 200, overflow via query
  firstReportedAt, lastReportedAt,
  upvoteCount,                    // "this is my area too" confirmations
  status: "open" | "in_progress" | "resolved" | "closed",   // derived: resolved if ≥ 80% members resolved
  embeddingMean: [768]            // running mean for O(1) similarity of new text
}
```

- New issue → geo pre-filter → cosine vs `embeddingMean` (fast gate) → cosine vs members (confirm) → **join or create** cluster. Union-find not needed online; the cluster doc *is* the cluster.
- On join: issue gets `clusterId`; **reporter is offered "Confirm existing report" (upvote)** in the 409 response (the `DuplicateIssueModal` already exists — wire it to the real cluster, not a single issue).
- Community upvotes on the cluster feed the priority model (§4.2 `urgency` + `cluster.upvoteCount` are input features).
- Officer/moderator sees "14 reports in this hexagon" on the issue detail + map tooltip — your "same place" UX.

### 8.4 Backend integration

```
POST /api/v1/issues          → save issue → enqueue {image_analysis, spam_check,
                               duplicate_check, match_image_text} (all idempotent
                               by issueId) → 201 in < 600 ms
Worker: duplicate_check       → H3+FAISS → if dup: set Issue.clusterId, needsReview,
                               emit socket "issue:duplicate" → user gets "Confirm or report anyway"
```

The existing 409-duplicate UX in `ReportIssue.jsx` becomes a **pre-submit live check** (`POST /v1/duplicates/check` with text + coords, p95 < 100 ms) *and* a post-commit authoritative check. Pre-submit is advisory ("2 similar reports near you — confirm instead?"), post-commit is authoritative.

---

## 9. Workflow & State Machine

Canonical states (fixes today's free-form strings: `Spam` mixed into status, `Pending` inside the priority enum, `Flagged` as a pseudo-status):

```
                 ┌───────────┐   moderator      ┌──────────┐
   create ──────▶│ Received  │─────────────────▶│ Rejected │ (reason code required:
                 └─────┬─────┘                  └──────────┘  DUPLICATE / FAKE / OUT_OF_AREA /
                       │ auto-assign            │              UNACTIONABLE + note)
                 ┌─────▼───────┐  officer picks ┌────────────┐
                 │  Assigned   │───────────────▶│In Progress │
                 └─────────────┘                └─────┬──────┘
                                                      │ proof uploaded
                                              ┌───────▼────────┐
                                              │Pending Review  │ (moderator)
                                              └───────┬────────┘
                                     approve │        │ reject → back to In Progress
                                        ┌──────▼──────┐
                                        │  Resolved   │ → citizen confirms
                                        └──────┬──────┘        │
                                       confirm │ dispute       ▼
                                        ┌──────▼──────┐   ┌─────────┐
                                        │   Closed    │   │ Dispute │ → moderator
                                        └─────────────┘   └─────────┘
   Side states (do not live in `status`): Spam(reason), needsReview,
   clusterId, duplicateOf, escalated(15-min SLA breach)
```

- **Reason codes** (machine + human): every terminal negative state stores `closeReason ∈ {DUPLICATE, FAKE_TEXT, FAKE_IMAGE, MISMATCH, OUT_OF_AREA, UNACTIONABLE, RESOLVED_CONFIRMED, ...}` — this is what feeds the ML label flywheel and the admin analytics.
- **SLA watchdog:** BullMQ delayed jobs per priority (High: 24 h to In Progress, Med: 72 h, Low: 7 d) → breach → `escalated` + officer notification. Replaces the current non-existent SLA tracking.
- Every transition emits a socket event (`issue:{id}:status`) + timeline entry + notification — the map and dashboards update live from this one bus.

---

## 10. Map Re-architecture

This directly fixes "the map is not locating issues with their status, and the map is not integrated well."

### 10.1 Backend — new geo endpoint (replaces client-side filtering)

```
GET /api/v1/map/issues
  ?bbox=minLng,minLat,maxLng,maxLat      // from map viewport (required when zoomed)
  &status=Pending,In Progress,Resolved,Rejected   // default: all public
  &category=roads,sanitation             // optional
  &since=2026-08-01                      // optional
  &near=lat,lng,radius_m                 // optional (near-me mode)
  → 200 { issues: [
      { id, complaintId, lat, lng, status, categoryId,
        createdAt, clusterCount, isMine, hasImage }
    ], nextCursor? }
```

- Mongo: `coordinates: { $geoWithin: { $box: [...] } }` on the existing 2dsphere index; **lean projection** (no descriptions, no embeddings, no files) → payload < 60 KB for 500 markers.
- `Rejected` **included** (today it's silently dropped), `Spam` excluded from the public map, `isMine` computed server-side (today: client compares emails — leaks that other users' emails exist and breaks for anonymous reports).
- Personal/`isPrivate` issues never returned. Rate-limit this route (10 req/s).
- Keep `GET /api/issues` for dashboards but **auth-only + paginated** (fixes the open-endpoint security gap, §12.7).

### 10.2 Frontend — replace `src/Pages/UserMap.jsx`

| Current problem | Fix |
|---|---|
| flaticon.com CDN PNG markers (external dep, inconsistent sizing) | **Bundled inline SVG markers** as React components; status-driven fill from design tokens (§11.4). Zero external requests. |
| `key={idx}`, no clustering | `react-leaflet-cluster` (MarkerClusterGroup); cluster bubbles show count + dominant status color; supercluster if > 2k per viewport (the endpoint's cap prevents this anyway) |
| Parses coords from `location` string | Deleted — backend returns `lat/lng`; issues without coords are excluded server-side with a count surfaced in the UI ("3 reports have no location") |
| All statuses except Rejected | Status filter: Pending / In Progress / Resolved / **Rejected** / All, each with its token color + count |
| Heavyweight popups | Click marker → **right-side detail drawer** (issue card: status badge, category, time-ago, "Confirm report" if mine, link to detail). Popups only for cluster counts. Drawer pattern scales and is mobile-correct (bottom sheet). |
| Static data | `socket.io` subscription `map:viewport` → server pushes `issue:{id}:status` deltas for in-bbox issues (socket infra already exists in `server.js`); markers animate color change (300 ms fade) — "real-time" becomes true |
| No density view | Toggleable **heat layer** (`leaflet.heat`) from the same endpoint with `weightBy=status`, category-colored — "city health" view from the README, now real |
| India-centered default | Fit to bbox of loaded data; remember last viewport in `sessionStorage`; "near me" button |
| No legend, no loading semantics | Legend chip (status colors), skeleton shimmer while fetching, empty state with CTA |
| Dark mode map | CARTO dark tiles for dark mode (`dark_all`), OSM for light — switch on theme |

**Acceptance criteria (map):**
1. With 5,000 seeded issues, first viewport paint < 1 s, interaction 60 fps, DOM markers ≤ 500.
2. Changing status filter re-queries server; counts match DB exactly.
3. Officer resolves an issue in another tab → marker turns green in < 2 s without refresh.
4. A `Rejected` issue appears gray with reason code in the drawer.
5. Lighthouse Mobile ≥ 90 on the map page.

---

## 11. Frontend Design System — "Modern product, not vibe-coded"

### 11.1 Why it reads as AI-coded today (the kill list)

Enforced as code-review rules + a `stylelint`/ESLint config:

| Anti-pattern | Where today | Rule |
|---|---|---|
| Gradient-painted text & buttons everywhere | `UserMap.jsx` header, submit buttons | Gradients: **never on text**, at most one flat accent per CTA; prefer solid |
| Glassmorphism (`backdrop-blur` + translucent panels) | UserMap filters, map container | Banned. Use solid surfaces + 1px borders |
| Emoji as UI chrome (`🟡 Pending`, `🛣️ Roads`) | map filters, option labels | Emoji banned in nav, labels, badges; keep only in citizen-facing copy strings |
| `animate-pulse` on decorative elements | map header pin, "real-time" chip | Motion only for state changes (status transitions, toasts); respect `prefers-reduced-motion` |
| `rounded-3xl` + 35 px flaticon pins | map, cards | Radii from tokens (6/10/14); markers are 10–12 px SVG dots with a 2 px ring |
| Two toast libraries, two icon libraries (fontawesome + lucide + react-icons all in package.json) | global | **One** each: `react-hot-toast` + `lucide-react`; purge the rest from `package.json` |
| Inconsistent green/blue/teal/indigo per page | every page | One accent + semantic tokens, §11.3 |

### 11.2 Design tokens (source of truth)

**Files:** `src/styles/tokens.css` (CSS custom properties, consumed by Tailwind via `rgb(var(--x) / <alpha-value>)`) — replaces the 4-line `tailwind.config.js` theme.

```css
:root {
  /* Neutrals — slate scale, no colored backgrounds on content */
  --bg: 250 250 249;          /* stone-50 */
  --surface: 255 255 255;
  --border: 226 232 240;      /* slate-200 */
  --text: 15 23 42;           /* slate-900 */
  --text-2: 71 85 105;        /* slate-600 */
  /* Single brand accent — civic teal, used for primary actions & brand only */
  --accent: 13 148 136;       /* teal-600 */
  --accent-soft: 204 251 241;
  /* Semantic status colors — THE map/status system */
  --st-pending: 217 119 6;    /* amber-600 */
  --st-progress: 2 132 199;   /* sky-600 */
  --st-resolved: 22 163 74;   /* green-600 */
  --st-rejected: 107 114 128; /* slate-500 (grey, not red — rejection isn't a fire) */
  --st-spam: 168 85 247;      /* purple-600 */
  --danger: 220 38 38;
  /* Type */
  --font: "Inter", system-ui, sans-serif;
  --fs-12: 0.75rem; --fs-14: 0.875rem; --fs-16: 1rem; --fs-20: 1.25rem; --fs-24: 1.5rem; --fs-30: 1.875rem;
  /* Space: 4px scale only — 4 8 12 16 24 32 48 */
  /* Radius: 6 10 14 */
  /* Shadow: exactly two — sm (cards) and md (drawer/modal) */
}
```

- **Typography:** Inter (self-hosted `@fontsource`, 400/500/600/700), `font-feature-settings: "tnum"` on IDs/timestamps/counts. Hierarchy: 12 (meta) / 14 (body) / 16 (lead) / 20 / 24 / 30. No `text-5xl` gradient headlines.
- **Surfaces:** page bg `--bg`, cards `--surface` with 1px `--border`, radius 10, shadow-sm. Dark mode inverts the same tokens (no second palette to design).
- **Density:** admin/officer portals use 14 px base, 8 px padding rows (data-dense, Linear-style); citizen pages use 16 px base, 16 px padding (breathing room, government-portal clarity).

### 11.3 Component inventory (build once, use everywhere)

`src/components/ui/`: `Button` (primary/secondary/ghost/destructive, 3 sizes), `Badge` (status variants driven purely by `--st-*` tokens — **one** component renders map chips, issue cards, tables, and popups identically), `Card`, `Field` (label+input+error, a11y-wired), `Select`, `Modal`, `Drawer`, `Table` (sortable, sticky header, empty state), `Skeleton`, `EmptyState`, `Tabs`, `Toast` (thin wrapper).

**Status `Badge` is the centerpiece:** `<StatusBadge status="Pending" />` is the only allowed way to render a status anywhere in the app (map drawer, issue card, table, timeline, notifications). One place defines the color mapping → the "map not showing statuses correctly" class of bug becomes structurally impossible.

### 11.4 Per-portal layout spec

- **Citizen (UserLayout):** top nav (logo, map, report, hub, notifications bell), 12-col grid, content max-w 1200, report flow as a **2-step linear page** (not cards-on-a-landing): Type → Details, with a sticky summary sidebar (live: detected location, AI suggestions as subtle inline hints — "AI detected: pothole" as a small chip, not a toast).
- **Officer:** left task rail (filterable queue, priority-sorted), center task board, right detail drawer; everything keyboard-navigable (1–9 to assign, `r` to resolve); mobile-first single-column below 768 px.
- **Moderator:** review queue UI first-class — left: queue (needsReview: spam-flagged, mismatch, low-confidence, disputes), right: **evidence panel** showing the ML feature breakdown side-by-side (text features, image objects with bounding boxes drawn, match score, geo distance) with Approve/Reject reason-code picker. This is the flywheel UI from §5/§7.
- **Admin:** overview (KPI cards: open by status, median SLA, spam rate, top-10 clusters), issues table, users, model-health panel (thresholds in force, last eval report link).

### 11.5 Accessibility & polish (non-negotiable)

WCAG 2.1 AA: contrast ≥ 4.5:1 for all token pairs (verified by a CI script that parses `tokens.css`), visible focus ring (`2 px solid var(--accent)` offset 2), full keyboard nav for map drawer (marker list is focusable, arrow keys pan map), `aria-live` for toasts and map updates, `prefers-reduced-motion` kills all transitions, forms: labels always visible (no placeholder-only), phone input with country-aware pattern.

### 11.6 Concrete before/after (Report Issue submit area)

```jsx
/* BEFORE (today) */
<button className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600
  hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold
  shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ...">

/* AFTER */
<Button variant="primary" size="lg" block loading={isSubmitting}
  iconLeft={isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={16} />}>
  Submit report
</Button>
/* plus: subtle caption line  "AI verification runs after submission — you'll be
   notified if anything needs review."  (honest, matches the async pipeline) */
```

---

## 12. Production Readiness

### 12.1 API layer

- **Versioning:** everything under `/api/v1/...` (Express router). Legacy routes stay until v2 ships, then a 30-day sunset window.
- **OpenAPI:** spec generated from route definitions (`swagger-jsdoc` or manual `openapi.yaml` committed) — the ML contracts in §5–8 are the spec; frontend types generated from it (`openapi-typescript`).
- **Validation:** `zod` schemas for every request body (already a dependency, barely used) + `express-validator` kept for the legacy routes. 400s carry field-level messages.
- **Error envelope (all routes):** `{ error: { code, message, details? } }`; internal errors logged, never leaked (today `debug_error` and raw `details` leak — fix).
- **Auth:** Clerk `verifyToken` on every route except explicitly public (`GET /api/v1/map/issues`, `GET /healthz`); RBAC middleware per portal.

### 12.2 Async pipeline (replaces fire-and-forget)

- **Redis + BullMQ** on the Express side (or RQ on the Python side — pick one; recommendation: BullMQ, since the backend owns the queue and the ML service stays a stateless scorer).
- Queues: `image_analysis`, `text_scoring` (category+spam in one call), `duplicate_check`, `match_image_text`, `sla_watchdog` (delayed).
- Every job: idempotency key `issue:{id}:{job}`, retries 3 (exponential backoff 5 s/60 s/10 min), dead-letter queue + admin alert, `processedAt` stored on `Issue.aiAnalysis.jobs[]`.
- ML service endpoints are pure functions (no DB writes from Python) — the **backend** writes results. This keeps one writer per collection (MongoDB discipline) and makes the ML service horizontally scalable/stateless.

### 12.3 Model serving & registry

- FastAPI app; models loaded once at startup behind a `ModelRegistry` (name → artifact dir). Every response includes `models: {name: version}` — **auditability**: any verdict in the timeline can be replayed against the exact artifact.
- `GET /v1/healthz` (liveness: process) + `GET /v1/readyz` (readiness: all models loaded) + `GET /v1/metrics` (Prometheus: `ml_inference_seconds{model,quantile}`, `ml_jobs_total{queue,state}`, `spam_verdicts_total{action}`, `duplicate_hits_total`, `map_query_seconds`).
- Cold start: models load in a background thread; `readyz` gates traffic; `ml_cold_start_seconds` metric. On Render/Fly this is the difference between a 12 s first request and a 400 ms one.

### 12.4 Evaluation harness (the thing that makes it "ML engineering", not "ML vibes")

- **Golden set:** `ml_service/eval/golden/` — ≥ 1,000 real-ish examples: 500 category (50/class, human-labeled), 200 spam (20/class incl. real appeals), 200 image-text pairs (with 500 pairs for threshold calibration), 100 duplicate pairs. Versioned (`golden-v1`), locked in git (hash-pinned), **never** in the training set.
- `python -m civix_ml.eval.run --set golden-v1` → JSON + markdown report (per-class P/R/F1, AUC, threshold curves, error examples with reasons). Saved as an artifact per run.
- **CI gate:** on any model artifact change, eval must show **no regression > 2 points** on macro-F1 (category) / precision@auto-spam / AUC (match) vs. the currently promoted artifact. Failing a gate blocks promotion.
- **Retraining cadence:** weekly cron (data = last 28 days of moderator-corrected labels), on-demand script `train.py --config runs/2026-08-25.yaml`. Every run writes `model-card.md` (data window, metrics, diff vs. current, author) to the artifact dir.

### 12.5 Flywheel (how accuracy compounds)

Moderator actions **are** the labeling UI: category correction on any issue, spam confirm/dismiss on appeals, duplicate confirm/split, image verdict on the evidence panel. All land in `ml_service/datasets/flywheel/*.jsonl` with `source_issue_id`, `labeler_id`, `timestamp`. Monthly dataset rebuild = golden + flywheel + backfilled history, with per-labeler κ checks (drop labelers below κ 0.6).

### 12.6 Rollout strategy (shadow mode)

1. **Week 1:** new FastAPI service deployed in parallel; Express calls **both** old (Gemini) and new, logs divergence to `ml_divergence` metric — no user impact.
2. **Week 2:** when agreement ≥ 90% on category and spam precision on the golden set passes, **flip** the writes to the new models; old path stays as fallback (feature flag `ML_ENGINE=local|gemini`, per-deployment env).
3. **Week 3:** kill Gemini calls from the hot path; keep the key only for offline captioning (or replace captions with a no-API alternative: YOLO class list + quality fields rendered as structured alt-text — actually *more* accessible than a generated sentence).
4. Map endpoint and design system ship behind route-level feature flags, staged 10% → 50% → 100%.

### 12.7 Security hardening list

- [ ] Auth on `GET /api/issues`, `GET /:id`, `POST /analyze-image`, `POST /generate-caption` (currently open).
- [ ] Rate limiting: 60/min per user on `POST /api/v1/issues`, 10/min on map queries; `express-rate-limit` already installed — wire per-route configs.
- [ ] Uploads: mime sniff (not just extension), ≤ 8 MB, `sharp` re-encode (kills payload bombs), **strip EXIF after reading GPS**, virus-scan optional.
- [ ] Honeypot field on the report form (`website` input, hidden) → auto-spam label (cheap additional signal into §7.2).
- [ ] Location privacy: public map rounds coords to H3 res-9 edges for `isPrivate=false` personal-issue *neighbors* only if policy requires; document the precision choice.
- [ ] Dependency hygiene: `npm audit`/`pip-audit` in CI; remove unused heavy deps (`three`, `aos`, `swiper`, `styled-components`, `jspdf`?) after a usage sweep — every unused package is attack surface + build time.

### 12.8 Infrastructure & ops

- **Docker Compose** (dev): `mongo`, `redis`, `backend`, `ml`, `frontend` — one `docker compose up` runs the whole system; CI mirrors it for integration tests.
- **Deploy:** Vercel (frontend) — Render (API, 2× 512 MB min) — Render **reserved** instance for ML (2 vCPU / 4 GB; ONNX YOLO needs headroom) — Atlas (DB) — Upstash (managed Redis, or self-host in compose).
- **Observability:** `pino` structured JSON logs + correlation id (generated in Express, propagated into job payloads and ML request headers); Sentry in all three layers with source maps; Grafana dashboards: (a) pipeline health (queue depth, job p95, DLQ), (b) ML quality (spam rate, dup rate, category distribution vs. baseline, threshold drift), (c) product (SLA breach, median time-to-resolve by department).
- **Load targets (k6 suite in CI nightly):** 50 rps issue creation → p95 < 800 ms; map bbox queries 100 rps → p95 < 300 ms; ML queue drains 60 jobs in < 5 min at 2 workers.

### 12.9 Testing pyramid

| Layer | Tool | Gate |
|---|---|---|
| Text pipeline units | pytest (golden fixtures per stage) | 100% pass in CI |
| Model eval | eval harness §12.4 | no regression > 2 pts |
| API integration | supertest + compose (real Mongo+Redis) | every §12.1 endpoint incl. auth matrix |
| ML service | pytest + golden images (fixed bytes) | byte-identical determinism check for ONNX |
| Frontend | vitest + Testing Library (Badge, form, map drawer) | coverage ≥ 70% on `ui/` + `Pages/` touched |
| E2E | Cypress (already present) — flows: report→appears on map with status; resolve→marker turns green; appeal spam | nightly + on tag |
| Load | k6 nightly | §12.8 targets |

### 12.10 CI/CD (GitHub Actions)

- `ci.yml`: PR → lint (ESLint+stylelint, ruff), typecheck, unit tests, frontend build, compose-based API tests, `pip-audit`/`npm audit`.
- `eval.yml`: on changes under `ml_service/**` → run golden eval → upload report artifact → post comment with metrics table.
- `deploy.yml`: on `main` merge → build+push Docker images (backend, ml) → Render deploy (API then ML) → Vercel auto (GH integration) → smoke tests (`/healthz`, `/readyz`, one map query, one issue create in staging).
- **Model artifacts** never rebuilt from source in CI (non-determinism) — they're versioned files under `ml_service/artifacts/` (git-LFS), promoted by the eval gate.

---

## 13. Phased Delivery Plan

| Phase | Weeks | Scope | Exit criteria |
|---|---|---|---|
| **0. Foundations** | 1 | `/api/v1` skeleton + zod + error envelope; taxonomy.json + migration script; TextBundle pipeline + tests; tokens.css + `ui/` primitives (Badge, Button, Card, Field, Drawer, Table); purge dead deps; auth fixes | Pipeline p95 < 50 ms; open endpoints closed; `Badge` renders all statuses |
| **1. Text ML (category + spam)** | 1–2 | Train category (LR baseline → MiniLM) + spam stack on existing CSV + synthetic spam; FastAPI service with `predict/category`, `score/spam-text`; golden set v1 + eval harness + CI gate; BullMQ queues + worker wiring into `createIssue` (submit < 600 ms) | macro-F1 ≥ 0.85 (category), precision ≥ 0.95 (spam) on golden; divergence logs vs Gemini running |
| **2. CV (YOLO + match)** | 2–3 | YOLOv8n training pipeline (seed datasets + augmentation), ONNX INT8 export; `/extract/objects` + quality + EXIF-GPS check; CLIP embeddings; `/match/image-text` + calibration on 500 pairs; moderator evidence-panel UI (v0) | mAP@50 target met per-class; match AUC ≥ 0.90; end-to-end: submit → async verdicts on issue doc in < 3 s |
| **3. Duplicates + map** | 1–2 | H3 fields + FAISS; `IssueCluster`; `/v1/map/issues` endpoint; full `UserMap` rewrite per §10.2; live socket updates; 409 confirm flow | §10.5 acceptance criteria 1–5 pass; 5k-issue seed loaded, 60 fps |
| **4. Design system pass** | 2 | Per-portal layouts per §11.4 across all 4 portals; kill-list lint rules; a11y audit + fixes; Lighthouse CI | AA contrast verified; Lighthouse ≥ 90 on map + report + dashboards; stylelint blocks gradient-text/glassmorphism |
| **5. Hardening & rollout** | 1–2 | SLA watchdog, reason codes, observability (pino/Sentry/Grafana), k6 load suite, shadow→flip cutover, docs (model cards, runbooks), E2E suite on new flows | §12.8 load targets; 7-day shadow with ≥ 90% agreement; go-live checklist signed |

**Team assumption:** 1 full-stack + 1 ML engineer (you, per the "ML engineer" direction) + designer review hours. Solo-feasible at ~8–10 weeks.

---

## 14. Success Metrics (dashboard from day 1)

| Metric | Today | Target |
|---|---|---|
| Category accuracy (golden) | ~0 (Gemini prompt, unmeasured) | macro-F1 ≥ 0.85 |
| Spam auto-precision | unmeasured | ≥ 0.95 (appeal rate < 3% of auto-spams) |
| Image–text match AUC | unmeasured | ≥ 0.90 |
| Duplicate catch precision | unmeasured (prompt-based) | ≥ 0.90; median candidates returned < 5 |
| Submit latency p95 | 5–15 s | < 600 ms |
| Map viewport p95 | full-DB fetch | < 300 ms |
| Time-to-verdict (async ML) | n/a | < 3 s p95 |
| ML cost per 1k reports | Gemini tokens (variable) | ≈ ₹0 marginal (CPU only) |
| Lighthouse (map, report, admin) | unmeasured | ≥ 90 |

---

## 15. Open Decisions (need your call before Phase 1)

1. **ML runtime home:** FastAPI rebuild (recommended) vs. keep Django + DRF and just swap the view internals. FastAPI costs ~2 days, buys OpenAPI/metrics/async.
2. **CLIP weight:** `ViT-B/32` (512-d, ~350 MB, fast CPU — recommended) vs. `ViT-L/14` (higher AUC, 4× slower CPU).
3. **Embedding store:** in-process FAISS (simple, restart = rebuild from Mongo — fine until ~200k issues) vs. Atlas Vector Search (managed, extra cost, Mongo-native). Recommend FAISS now, swap later behind the same interface.
4. **Map tiles in dark mode:** CARTO dark is free-tier friendly but needs an API key; confirm acceptable.
5. **Dataset ethics:** the synthetic CSV stays as a *cold-start only*; the flywheel (§12.5) is where real accuracy comes from — confirm moderators get the labeling UI in Phase 2.
