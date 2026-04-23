# Civix — Labeling Guide (one page per task)

Rules for ALL tasks:
1. Label **independently** — no discussion until both labelers finish a batch.
2. Batches ≤ 100 items, ≤ 15 minutes each.
3. When in doubt, use the **"when in doubt" rule** for that task — consistency beats cleverness.
4. Every label stored with labeler id + timestamp (tooling enforces this; do not export raw spreadsheets).
5. κ is computed per batch; κ < 0.6 → stop, review examples with the arbiter, re-pilot 50 items.

---

## Task 1 — Category (D1)

**Definition:** Pick the ONE department that should receive this complaint.

**When in doubt:** the department that would *physically go out and fix it*, not the one the words suggest.

| ✅ Label | ❌ Not this |
|---|---|
| "street light not working near school" → `electric` | don't pick `roads` just because it's on a road |
| "pothole filling with water" → `roads` | not `water` — the primary failure is the road |
| "garbage not collected, road stinks" → `sanitation` | not `roads` |
| "bill amount wrong for my flat" → `billing` (personal) | personal ≠ public |
| "suggestion: add a bench in the park" → `parks` | suggestions are still categorized |

**Unmappable/nonsense text** → label `null` (do NOT guess) + tick "looks like spam?" separately.

---

## Task 2 — Spam / Fake (D2)

**Definition:** Would a reasonable officer open this as a work order? `fake=1` if it is random text, gibberish, a scam, or a non-issue.

| ✅ fake=1 | ✅ fake=0 |
|---|---|
| "asdfghjkl zxcvbnm" | "light near bus stand off since Monday" |
| "CONGRATULATIONS you won! click…" | "water pressure very low in our lane for 2 weeks" |
| "water water water water water" | "POTHOLE M G RD pls fix" (messy = still real) |
| "???????!!!" | a complaint in broken English that a human would understand |

**When in doubt:** if a real person could *understand* what they want fixed → `fake=0`. The bar is comprehension, not grammar.
**Hard negatives** (rows tagged `synthetic_boundary`): these are near-real complaints with typos — the correct label is `fake=0`. A labeler who marks these fake is the bug to watch for.

---

## Task 3 — Duplicates (D5)

Given two complaints (A, B) with texts, coordinates, and dates:

| Label | Definition |
|---|---|
| `same_place` | Same physical issue (same pothole / same light / same pile) — you'd send ONE crew |
| `same_region_similar` | Different but related issues within ~1.5 km, same type (e.g., 3 potholes on the same stretch) |
| `distinct` | Different issue, or too far, or different type |

**When in doubt:** "if B is fixed, does A get fixed for free?" Yes → `same_place`.

---

## Task 4 — Image–Text match (D4)

**Definition:** Does the image plausibly show the problem described?

| ✅ MATCH | ❌ MISMATCH |
|---|---|
| pothole photo + "pothole near bus stand" | selfie + "pothole near bus stand" |
| street light with dark bulb + "light not working" | food photo + "water leak" |
| garbage pile + "garbage not collected" | meme/screenshot + any complaint |
| blurry-but-dark photo of a road + "light off" (plausible) | a different road, clearly no problem visible |

**When in doubt:** `UNCERTAIN` exists — use it. We calibrate on it, not against you.
**EXIF note:** if the tool shows "photo GPS 8 km from reported location", you may mark MISMATCH with reason `geo_mismatch` even if content looks plausible.

---

## Task 5 — Priority (D6, secondary)

| High | Medium | Low |
|---|---|---|
| danger to life right now (sparking wires, open manhole over footpath, waterlogging trapping people) | service disruption (no water 1+ day, light out all week, blocked drain) | inconvenience / suggestion / query |

**When in doubt:** ask "if nothing happens for 72 hours, is someone hurt?" Yes → High.
