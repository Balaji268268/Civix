# Civix ML — Model Card (v4.0 Release)

## Model Overview
- **Service:** Civix Machine Learning Microservice
- **Deployment:** FastAPI, Local Python Runtime, Zero External LLM APIs
- **Artifacts:**
  - `category_model_v4.pkl`: Calibrated SGD Multi-Class Classifier (20 Public + Personal Categories)
  - `spam_model_v4.pkl`: Statistical Feature Stack + Logistic Regression with Asymmetric Confidence Policy
  - `priority_model_v4.pkl`: Calibrated SGD Priority Classifier (High / Medium / Low)
  - `yolo_detector.py`: ONNX INT8 Civic Object Detection (20 Classes) + Quality & EXIF Analysis
  - `image_text_matcher.py`: Dual-Channel OpenCLIP ViT-B/32 + Deterministic YOLO Ontology Vote

## Performance Gates & Benchmark Results (Locked Golden-v1)

| Task / Model | Metric | Release Gate | Achieved Score | Status |
|---|---|---|---|---|
| Department Categorization | Macro-F1 | $\ge 0.85$ | **1.0000** | **PASSED** |
| Spam / Fake Detection | Auto-Spam Precision | $\ge 0.95$ | **1.0000** | **PASSED** |
| Image-Text Matching | Calibrated AUC | $\ge 0.90$ | **0.9400** | **PASSED** |
| Text NLP Pipeline Latency | Average Duration | $< 50$ ms | **0.195 ms** | **PASSED** |

## Intended Use
- Automated, explainable ticket categorization and triaging for municipal municipal departments.
- Statistical abuse and gibberish defense with human-readable reason codes (`KEYSIGNATURE`, `LOW_ENTROPY`, `REPETITIVE_WORDS`).
- Post-commit asynchronous validation (citizens never wait for AI in submit hot-paths).
