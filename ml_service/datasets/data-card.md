# Civix ML — Dataset Card (v4.0 Release)

## Dataset Summary
- **Source:** Municipal complaints, public infrastructure golden test cases, synthetic edge-case augmentations.
- **Taxonomy:** `taxonomy.json` (Version 4.0: 20 Public Municipal Departments + 6 Personal Administrative Departments).

## Partition Splits

| Dataset Partition | Total Records | Golden Locked Set | Description |
|---|---|---|---|
| Category Classification | 9,520 | 419 items (`golden_category_v1.jsonl`) | Stratified by 20 civic departments |
| Spam & Abuse Detection | 1,800 | 500 items (`golden_spam_v1.jsonl`) | Legitimate complaints vs gibberish, QWERTY spam, ASCII abuse |
| Duplicate Pairs | 1,000 | 500 pairs (`golden_duplicates_v1.jsonl`) | Exact same-place vs nearby same-topic vs distinct |
| Cross-Modal Pairs | 1,000 | 500 pairs (`golden_image_text_v1.jsonl`) | Matching photo-complaint pairs vs meme/food/selfie vetoes |

## PII & Sanitization Policy
All complaint texts pass through `process_text_bundle()`:
- Email addresses: `[EMAIL_REDACTED]`
- 10-digit Indian and global phone numbers: `[PHONE_REDACTED]`
- Aadhaar / 12-digit numeric sequences: `[ID_REDACTED]`
