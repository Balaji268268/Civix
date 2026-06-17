"""
Priority Classifier Model (High / Medium / Low)
Combines TF-IDF features with domain urgency heuristics and department risk priors.
"""

import os
import json
import joblib
import numpy as np
from typing import Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV
from civix_ml.pipelines.text import process_text_bundle

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(MODEL_DIR, "priority_model_v4.pkl")

# High-risk trigger phrases that immediately elevate priority
CRITICAL_EMERGENCY_WORDS = {
    "spark", "sparking", "shock", "shocking", "electric shock", "gas leak",
    "fire", "smoke", "fallen pole", "hanging wire", "wire sparking",
    "accident", "injury", "injured", "blood", "trapped"
}

class PriorityClassifier:
    def __init__(self, model_path: str = MODEL_FILE):
        self.model_path = model_path
        self.pipeline = None
        self.classes_ = []
        self._load_or_init()

    def _load_or_init(self):
        if os.path.exists(self.model_path):
            try:
                saved = joblib.load(self.model_path)
                self.pipeline = saved.get("pipeline")
                self.classes_ = saved.get("classes", [])
            except Exception as e:
                print(f"[PriorityClassifier] Warning: Could not load model: {e}")

    def train(self, data_path: str):
        """Train calibrated classifier on priority labels."""
        texts = []
        labels = []

        with open(data_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    text = item.get("text", "")
                    prio = item.get("priority", "Medium")
                    if prio in ["High", "Medium", "Low"]:
                        bundle = process_text_bundle(text)
                        texts.append(bundle["text_norm"])
                        labels.append(prio)

        base_clf = SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-4, max_iter=1000, random_state=42)
        calibrated_clf = CalibratedClassifierCV(estimator=base_clf, method="sigmoid", cv=3)

        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2)),
            ("clf", calibrated_clf)
        ])

        pipeline.fit(texts, labels)
        self.pipeline = pipeline
        self.classes_ = list(pipeline.classes_)

        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump({"pipeline": self.pipeline, "classes": self.classes_}, self.model_path)
        print(f"[PriorityClassifier] Model trained on {len(labels)} samples and saved to {self.model_path}.")

    def predict(self, text: str, title: str = "", category: str = "other") -> Dict[str, Any]:
        bundle = process_text_bundle(text, title=title)
        norm_text = bundle["text_normalized"].lower()
        urgency_score = bundle["urgency_score"]

        # Rule 1: Immediate Safety Hazard Override -> High Priority
        for crit in CRITICAL_EMERGENCY_WORDS:
            if crit in norm_text:
                return {
                    "priority": "High",
                    "confidence": 0.95,
                    "reason": f"Critical safety risk keyword detected ('{crit}')",
                    "urgency_score": urgency_score,
                    "method": "emergency_override"
                }

        # Rule 2: Department risk priors (gas/fire and electrical sparks default to High)
        if category in ["gas_fire_hazards", "electricity"] and urgency_score > 0.3:
            return {
                "priority": "High",
                "confidence": 0.88,
                "reason": "High-risk department paired with urgency indicators",
                "urgency_score": urgency_score,
                "method": "dept_risk_prior"
            }

        # ML Model Inference
        if self.pipeline is not None and bundle["text_norm"]:
            probs = self.pipeline.predict_proba([bundle["text_norm"]])[0]
            top_idx = np.argmax(probs)
            top_prio = self.classes_[top_idx]
            top_conf = float(probs[top_idx])

            # If urgency score is very high, elevate Medium to High
            if top_prio == "Medium" and urgency_score >= 0.7:
                top_prio = "High"
                top_conf = 0.85

            return {
                "priority": top_prio,
                "confidence": round(top_conf, 3),
                "urgency_score": urgency_score,
                "method": "ml_classifier"
            }

        # Heuristic fallback
        if urgency_score >= 0.5:
            prio = "High"
        elif urgency_score >= 0.2:
            prio = "Medium"
        else:
            prio = "Low"

        return {
            "priority": prio,
            "confidence": 0.75,
            "urgency_score": urgency_score,
            "method": "heuristic_fallback"
        }
