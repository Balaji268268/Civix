# Civix — Dataset Plan (ML/NLP Workstream)

**Focus of this phase:** building datasets that match the actual requirements — not generic ML datasets.
**Companion doc:** `docs/IMPROVEMENT_PROPOSAL.md` (models this data feeds: §4–8).
**Status:** draft for review. No commits — files live in the working tree.

---

## 1. What "matches my requirements" means (operational definition)

A dataset is "right" for Civix only if it passes all four tests:

| Test | Why it matters here |
|---|---|
| **T1. Text looks like *your citizens'* text** | Today's `civic_data.csv` (5,000 rows) is generated from 8 fixed templates ("There is a {issue} at {loc}."). A model trained on it scores great on its own generator and badly on "POTHOLE IN M.G ROAD NEAR BUS STAND pls fix urgent". Every dataset below must include **messy-text coverage** (case, typos, abbreviations, code-mixing, fragments). |

> **⚠️ DEPRECATION (owner decision, 2026-08-25):** `ml_service/datasets/civic_data.csv` and its `generate_dataset.py` are **dead — do not train on, clean, "improve", or import them.** They are AI-generated mock data with no label provenance and a template distribution. The Layer-B generator (`tools/generate_citizen_corpus.py`) replaces them from scratch. Delete or archive them in a later cleanup PR.
| **T2. Labels use *your* taxonomy** | One `taxonomy.json` (proposed §4.2 of the main plan) — no more three-way drift between frontend, prompts, and data. |
| **T3. Distribution matches *your geography*** | Complaint mix (street lights vs garbage vs water) and language mix of an AP city ≠ NYC. Real Indian data (BBMP) + flywheel from the app corrects for this. |
| **T4. No leakage, locked eval** | Golden eval sets are version-locked and never enter training; near-duplicates are split-aware. |

**Consequence — the data strategy is a 3-layer mix:**

```
Layer A:  REAL large-scale text (NYC 311 + BBMP)   → teaches category/status/priority
                                                 → but text is cleaner & geo-biased
Layer B:  CONTROLLED synthetic citizen text        → teaches messy surface forms
                                                 → deterministic, versioned, seed-pinned
Layer C:  YOUR APP's live data (flywheel)          → teaches the actual distribution
                                                 → grows over time, the long-term moat
Images:   Roboflow seed sets + your-city uploads   → YOLO + CLIP
```

No layer alone is sufficient; the training mix is explicitly weighted and logged in a data card (per release).

---

## 2. Dataset inventory (6 datasets, one flat text schema)

| ID | Dataset | Feeds (model) | Type | Target size | Status |
|---|---|---|---|---|---|
| **D1** | `category_text` | Department categorizer (20 depts, +priority multi-task) | text | 20k rows (tiered per-class minimums, see D1 spec) | to collect |
| **D2** | `spam_text` | Fake/gibberish detector | text | 8k rows (4k fake / 4k real) | to collect |
| **D3** | `images_cv` | YOLO civic object detector | images+bbox | 15–25k imgs, 20 classes | to collect |
| **D4** | `image_text_pairs` | Image–text matcher | (text,image) pairs | 500 calibrated + 2k training | to collect |
| **D5** | `duplicate_pairs` | Dup thresholds + cluster seeds | (text,coords) pairs | 1k labeled pairs | to collect (LLM-free: rules + geo) |
| **D6** | `priority_text` | Priority model (merged into D1 multi-task) | text | 10k rows | piggybacks D1 + BBMP status |

**One flat schema** — a single JSONL line can carry D1+D2+D6 labels at once (cheap to collect, expensive to lose):

```json
{
  "id": "nyc-76igc548-10428371",
  "text": "Street Light System - Light(s) Out",
  "text_kind": "templated_short | citizen_messy | synthetic | app_live",
  "language": "en",
  "category_id": "electric",          // taxonomy.json id, null if unknown
  "priority": "High|Medium|Low|null",
  "is_fake": 0|1|null,
  "spam_family": "scam_template|null", // if synthetic: which generator
  "coords": [20.59, 78.96] | null,
  "h3_9": "85283473fffffff",     // canonical index field; synthetic rows carry a stand-in "geohash_7" until the H3 post-pass runs
  "status": "Closed|In Progress|...|null",
  "created": "2019-04-11T09:12:00Z",
  "source": "nyc311|bbmp|synthetic|app",
  "source_ref": "…",
  "pii_redacted": true,
  "labels": {"labeler": "auto|mod-07", "agreement": 1.0}
}
```

Storage layout (all under `ml_service/datasets/`):

```
datasets/
├── raw/          # untouched downloads — .gitignored, re-downloadable (manifest records URL+sha256)
├── processed/    # cleaned JSONL, versioned files: category_text_v1.jsonl etc. (tracked)
├── eval/         # GOLDEN SETS — hash-locked, excluded from training (tracked)
├── flywheel/     # app-sourced labels from moderator UI (tracked, append-only)
├── images/       # manifests only (lists roboflow dataset id/version + sha); binaries NOT in git
├── reports/      # dataset_report.py output (tracked — it's the quality evidence)
├── label_sets/   # duplicate pair labels, image-text verdict labels
├── labeling_guide.md
└── data_cards/   # one markdown card per processed file
```

Text JSONL files (a few MB) are tracked in git; **image binaries never** (manifests point to Roboflow dataset id + version + local cache path).

---

## 3. Per-dataset specs

### D1 — `category_text` (categorizer, 20 departments)

| | |
|---|---|
| **Goal** | text → one of the **20 public + 6 personal** `taxonomy.json` (v4) ids; secondary: priority. Model shape: **hierarchical** — a dept classifier on top, a sub-type classifier within the chosen dept (handles the long tail of 20 depts × ~4 sub-types far better than one 90-way flat head, and the dept answer is the one that matters for routing) |
| **Real sources** | **NYC 311** (`76ig-c548` 2010–2019, `erm2-nwe9` 2020–present; `Complaint Type`+`Descriptor` → text, `Department` → label). ~10M rows available; **sample 30k stratified** (5k per top complaint type). **BBMP grievances 2020–2025** (data.opencity.in) — category + status; if description text exists use it, otherwise use it for **distribution reference** (what % of a real Indian city's complaints is street-light vs garbage vs water) to *reweight* training classes. |
| **Synthetic (Layer B)** | `generate_citizen_corpus.py` — frame-based generator: each sample = semantic frame `{category, entity, location, severity, time, actor}` → rendered by **stochastic surface grammars** (case variants, typo injection at p=0.08, abbreviations "st/lgt/wtr", code-mixing slots, fragments, emoji, "pls help urgent" fillers). Same frame family re-rendered N× → also gives you **controlled near-duplicates** for D5. |
| **Balance (20 depts)** | Tiered minimums in training: **common** depts (roads, solid_waste, street_lighting, water_supply, traffic, sewerage_drainage, electricity) ≥ 800 rows; **medium** (public_transport, parks, health_hospitals, flood, noise, public_safety) ≥ 400; **long-tail** (encroachment, building_inspection, trees, gas_fire, markets, public_conveniences, other) ≥ 200 — below that, merge into nearest dept *and log the merge in the data card* instead of training on starvation |
| **Priority labels** | Derived, not invented: BBMP `status` + resolution time (fast close ⇒ lower severity) as weak signal; NYC `Priority`-less → keyword urgency lexicon (from the text pipeline's `urgency_score`) + human-label 1,000 rows in the golden set. Priority is **secondary task** (shared encoder) — don't over-fit it from noise. |
| **QC gates** | per-class support check; near-dup ratio < 15% (report); language-ID sample 95% en (or target language); PII-redaction spot-check 200 rows; golden split hash differs from train (leakage check in CI). |

### D2 — `spam_text` (fake detector)

| | |
|---|---|
| **Goal** | text → p_fake with reason codes; asymmetric contract (precision ≥ 0.95 at auto-reject) |
| **Real negative** | BBMP `Non-Relevant` complaints (real "not actually an issue / out of jurisdiction / nonsense" reports) — **the closest real proxy for fake**; NYC 311 has no spam class (curated intake), so don't fake it there. |
| **Synthetic spam (Layer B)** — `generate_spam_corpus.py`, seeded, 8 families: ① random-ascii ② QWERTY keyboard-mash walks ③ repeated-word ④ repeated-char/digit ⑤ lorem/word-shape gibberish ⑥ mixed-script mash (en+te+hi random codepoints) ⑦ symbol/digit noise ⑧ **scam templates** (100+ realistic: "CONGRATULATIONS you have won…", "OTP verification", "bank account frozen click here", "crypto investment opportunity") — family ⑧ is the dangerous one (looks like language). |
| **Real positive** | NYC/BBMP real complaints (sampled) + app live data. Plus **hard negatives**: near-real complaints with only 1–2 garbled tokens (the boundary cases where a naive entropy rule over-fires). |
| **Size** | 8k (4k fake across 8 families, 4k real); golden: 500 (60/family + 260 real). |
| **QC gates** | precision simulation on golden ≥ 0.95 at threshold sweep; per-family recall reported (a detector that only catches ①–④ is useless); keyboard-mash must be 100% caught at any threshold (rule stage). |

### D3 — `images_cv` (YOLO)

| | |
|---|---|
| **Goal** | detect 20 civic classes (§5.1 of main plan) in citizen phone photos |
| **Seed sources (verified today)** | • **IIT Madras pothole** — universe.roboflow.com `indian-institute-of-technology-madras-xamot/pothole-detection-huf2x`, 2,722 imgs, **public domain** • **Road damage (Federico II)** — `university-federico-ii-ygjoa/road-damage-detection-i40w8`, 566 imgs, 8 classes (pothole, manhole, alligator/edge/longitudinal/transverse cracking, patching, rutting), CC-BY-4.0 • **Civic objects (11-class)** — `pothole-qm3gu/pothole-zjv6c` (bollard, car, gulley, manhole cover, person, pothole, roadsign, street light, traffic cone, traffic lights), MIT • Additional Universe sets to be mined: garbage/dump, broken street light, flood, open drain, stray dog (search terms + size table recorded in `images/manifest.json`) |
| **Class remapping** | Every source class → exactly one of the 20 target classes (mapping table in `images/class_map.json`); source classes with no target (e.g., `car` except when `parked_vehicle_obstruction`) → background. This remapping is a *labeling act* and is logged. |
| **Your-city flywheel** | Every uploaded issue image → moderator one-tap class correction (main plan §5.2) lands in `images/your_city/` (URL + label + crop). Target: 500–1,000 your-city images before v2 training — this is what moves you from "benchmark mAP" to "our potholes, our lights". |
| **Augmentation** | mosaic, mixup, night-exposure sim, blur, 30° rotation (documented in data card). |
| **QC gates** | per-class support ≥ 300 train imgs (else merge with nearest class + log); annotation QA: 200 imgs double-checked, IoU agreement reported; no train/val filename overlap. |

### D4 — `image_text_pairs` (matcher calibration)

| | |
|---|---|
| **Goal** | calibrate match thresholds + AUC gate (§6 of main plan) |
| **Construction (no LLM needed)** | ① **Aligned**: each D3 image × its correct D1/synthetic text for the same class (auto, ~1–2k) ② **Mismatched**: each D3 image × text from a *different* category (auto, stratified by confusability: pothole-text × garbage-img is the hard pair) ③ **Human verdict**: 500 real (image, complaint) pairs from the app → 2 moderators label match/mismatch (κ ≥ 0.7), these are the **golden calibration set** that fixes τ_low/τ_high. |
| **QC gates** | AUC ≥ 0.90 on golden; per-τ confusion matrix stored in report; threshold changes only via re-run of `calibrate_match.py` (scripted, versioned). |

### D5 — `duplicate_pairs` (geo + semantic thresholds)

| | |
|---|---|
| **Goal** | calibrate "same place" / "same region + similar type" thresholds; seed the cluster model |
| **Construction** | ① **NYC 311 is perfect for this**: real (text, lat/lng, date, type) at 10M scale → label pairs by rules: same `H3 res-9` + same complaint type + Δt < 90 d ⇒ `same_place` candidate; then **human-verify 300 candidates + 300 near-misses** (this is what real labelers do — cheap, 15 min each) ② **Synthetic**: Layer-B generator emits controlled near-duplicates (same frame, perturbed surface) at known geo offsets (0 m / 200 m / 1.5 km) → known ground truth for the region rule. |
| **Schema** | `{issue_a_id, issue_b_id, relation: same_place|same_region_similar|distinct, verified_by}` |
| **QC gates** | threshold sweep produces precision ≥ 0.90 @ recall ≥ 0.75 on verified set; report shows geo-distance vs text-similarity curves (so you *see* the decision boundary). |

### D6 — `priority_text`
Folded into D1 as a secondary label (multi-task head). Extra real signal: BBMP status/resolution-time weak labels. Golden: 1,000 human-labeled. No separate collection effort.

---

## 4. Taxonomy mapping tables (the glue that makes external data usable)

The full v4 mappings live **in the fetchers** (versioned — `MAPPING_VERSION`, bump on any change):

- **NYC 311 `Complaint Type` → v4 dept**: `tools/fetch_nyc311.py` (`CATEGORY_MAP`, v2). Highlights: Street Light System → `street_lighting` (split from power utility); Sewer/Blocked Hydrant/Storm Sewer → `sewerage_drainage`/`flood_management`; Health/Clinic/Pharmacy/Food Service/Vaccination → `health_hospitals`; Tree Related/Street Tree → `trees`; Fire/Gas Hazard → `gas_fire_hazards`; Housing/Plumbing/Elevator → `other` (personal-side, kept and flagged, never guessed).
- **BBMP category → v4 dept**: `tools/fetch_bbmp.py` (`CATEGORY_MAP`, v2) — pre-seeded with common BBMP values; run `--inspect` first and add any observed value that's missing (10-minute job, once).

Unmapped → `category_id: null` and counted in the fetch report — **never silently guessed.**

---

## 5. Language plan (decision needed — see questions below)

| Option | Pipeline impact | Dataset impact |
|---|---|---|
| **A. English only** | spaCy `en_core_web_sm`, English CLIP | NYC311 + BBMP (English interface) fit as-is |
| **B. English + Hinglish** | + IndicNLP tokenizer, code-mixing features in spam detector (family ⑥ matters) | Layer-B generator must emit code-mix frames; golden set 30% code-mixed |
| **C. + Telugu (your city)** | IndicNLP + Telugu lemmatization; **multilingual CLIP** (XLM-R / LaCLIP) for matcher; fasttext lid.176 handles ID | Telugu sources: AP state grievance data if available, else crowd-collect 500 Telugu samples + synthetic transliteration frames; golden set 25% Telugu |

**Recommendation:** build **A now** (weeks 1–3, full pipeline live), design the schema so **B/C are additive** (the `language` field already exists; CLIP swap is a model-registry change, not a data-format change). Do not block the ML workstream on multilingual.

---

## 6. Labeling protocol (human labels — done right, or not done at all)

1. **Two independent labelers** per item (moderators/students), no discussion until both finish.
2. **Cohen's κ** computed per task; items where labelers disagree go to a 3rd arbiter (you or the senior mod). κ < 0.6 on any task → fix the label spec, re-label a 50-item pilot, then continue.
3. **Label spec = one page per task** (in `labeling_guide.md`): operational definition, 5 positive + 5 negative examples each, the "when in doubt" rule. Examples matter more than definitions.
4. Every label stored with `labels: {labeler, timestamp, agreement}` — the flywheel dataset keeps this forever (you can re-derive κ later).
5. **Golden sets are labeled last, by the most careful pair, and hash-locked** (`eval/golden_v1.sha256`) — CI refuses training runs whose data hash overlaps the golden hash.

---

## 7. Versioning, data cards, and the flywheel

- Every processed file: `category_text_v1.jsonl` + `data_cards/category_text_v1.md` (source mix %, label spec version, κ values, class balance, known biases, how to regenerate: exact script + args + seed).
- **Data cards are required artifacts** — a model release without its data card doesn't ship.
- **Flywheel:** app moderator actions (category correction, spam verdict, duplicate confirm, image class) → append-only JSONL in `flywheel/` → monthly dataset rebuild = external real + Layer-B + flywheel, re-weighted toward your city's observed distribution (weights logged in the data card).
- Training mix target at v1: **55% external real / 30% synthetic citizen-text / 15% app-live** (shifts to 30/30/40 by month 6 as flywheel grows — the app data always wins eventually).

---

## 8. Collection schedule (2 weeks to first trainable v1)

| Day | Task | Output |
|---|---|---|
| 1–2 | Run `fetch_nyc311.py` (2015–2023, stratified 30k) + `fetch_bbmp.py` (all years); inspect value lists; finalize mapping tables | `raw/` + mapping tables |
| 2–3 | Run `generate_spam_corpus.py` (8k) + `generate_citizen_corpus.py` (12k); run `dataset_report.py` on all | `processed/*_v1.jsonl` + reports |
| 3–4 | Split: train/dev/golden (leakage-checked); lock golden hashes; write data cards | `eval/golden_v1*` |
| 4–5 | Download Roboflow seed sets (3–5 datasets), build `class_map.json` + `images/manifest.json` | `images/manifest.json` |
| 5–7 | Labeling pilots: 100 category + 100 spam + 50 dup pairs (κ check); fix label specs | κ report |
| 7–14 | Full labeling pass on golden sets (500 category, 500 spam, 300+300 dup pairs, 500 image-text pairs) | golden sets complete |
| 14 | **Milestone: dataset v1 locked → training can start** (categorizer + spam on CPU in an afternoon) | go/no-go |

---

## 9. Where Agentic AI fits (when, not if)

Deliberately **not** in the deterministic core — it's an optional layer added **after** the datasets exist, because it's the datasets that make an agent trustworthy:

1. **Triage Agent (moderator side, post-MVP):** orchestrates the *existing* deterministic signals (spam score + YOLO objects + match verdict + geo-dups + trust score), writes the explanation, and suggests the next action. LLM-based, but it **never overrides a thresholded rule** — it explains and routes. Training/evaluating it *requires* the flywheel labels you're collecting now (its actions become the agent's trajectory data).
2. **Data Curation Agent (now, cheap win):** a rule+LLM hybrid QA pass over new flywheel batches (spot-contradictions, suggest re-labels, flag out-of-distribution texts for the golden set). This is where you'd first "add agentic AI" without risk — it improves the very data you're collecting.
3. **Dispatch/SLA Agent (later):** picks assignment + escalation actions from the SLA state machine; again, only as proposer, human approves.

**Recommendation:** keep the core 100% deterministic (auditable, ₹0 marginal cost, no key), add the **Data Curation Agent** in month 1 (it pays for itself by cleaning flywheel data), and the Triage Agent once the moderator UI ships.

---

## 10. Risks & honest limitations

| Risk | Mitigation |
|---|---|
| NYC 311 text is templated (`Descriptor`), not messy citizen prose | It's Layer A only; Layer B (messy synthetic) + Layer C (app) cover the distribution; data card states the mix explicitly |
| BBMP file may be ward-aggregated (no free text) | Script detects it; fallback: BBMP = distribution reference + status/priority weak labels + duplicate-geo priors (still valuable) |
| Roboflow seed sets are European/US roads + lighting | Your-city flywheel (500–1k imgs by v2) is mandatory before trusting YOLO on AP photos; night-shot augmentation |
| No real "fake report" corpus exists publicly anywhere | That's exactly why spam detection is rule+features+synthetic-hard-negatives, with the app's appeals as the real-label source — the dataset plan *creates* this data over time |
| Labeler fatigue → κ decay | 100-item pilots, 15-min batches, spec cards with examples, weekly κ re-check |
| PII in real data | NYC 311 strips PII by policy; still run the redaction pipeline + 200-row spot check; BBMP is ward-level (no PII); app data: phone numbers redacted before any export |
