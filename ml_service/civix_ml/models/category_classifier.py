"""
Department Categorizer Model (Hierarchical & Calibrated Linear Classifier)
Consumes normalized TextBundle -> predicts primary public/personal department + subtype.
Includes margin-based abstention (falling back to 'other' when ambiguous).
"""

import os
import json
import joblib
import numpy as np
from typing import Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from civix_ml.pipelines.text import process_text_bundle

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(MODEL_DIR, "category_model_v4.pkl")
TAXONOMY_FILE = os.path.join(os.path.dirname(MODEL_DIR), "taxonomy.json")

class CategoryClassifier:
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
                print(f"[CategoryClassifier] Warning: Could not load model: {e}")

    def train(self, data_path: str):
        """Train calibrated SGD linear classifier on normalized text."""
        texts = []
        labels = []

        with open(data_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    text = item.get("text", "")
                    cat = item.get("category_id", "other")
                    bundle = process_text_bundle(text)
                    texts.append(bundle["text_norm"])
                    labels.append(cat)

        base_clf = SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-4, max_iter=1000, random_state=42)
        calibrated_clf = CalibratedClassifierCV(estimator=base_clf, method="sigmoid", cv=3)

        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_df=0.95, sublinear_tf=True)),
            ("clf", calibrated_clf)
        ])

        pipeline.fit(texts, labels)
        self.pipeline = pipeline
        self.classes_ = list(pipeline.classes_)

        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump({"pipeline": self.pipeline, "classes": self.classes_}, self.model_path)
        print(f"[CategoryClassifier] Model saved to {self.model_path} with {len(self.classes_)} classes.")

    def predict(self, text: str, title: str = "") -> Dict[str, Any]:
        """Predict department category with confidence estimation and abstention."""
        bundle = process_text_bundle(text, title=title)
        norm_text = bundle["text_norm"]

        # Rule 1: Empty or tiny text without domain words -> 'other'
        if len(norm_text.split()) < 2 and not bundle["lexicon_keys"]:
            return {
                "category": "other",
                "confidence": 0.5,
                "needsReview": True,
                "reason": "Text too short to categorize with high certainty",
                "lexicon_keys": bundle["lexicon_keys"]
            }

        # Rule 2: Strong lexicon prior if exact canonical match
        lexicon_keys = bundle["lexicon_keys"]
        lexicon_to_dept = {
            "open_manhole": "roads",
            "pothole": "roads",
            "footpath": "roads",
            "street_light": "street_lighting",
            "light_flickering": "street_lighting",
            "power_cut": "electricity",
            "hanging_wires": "electricity",
            "transformer_issue": "electricity",
            "pipe_burst": "water_supply",
            "waterlogging": "flood_management",
            "drain_clogged": "sewage_drainage",
            "sewage_overflow": "sewerage_drainage",
            "illegal_dumping": "solid_waste",
            "garbage_not_collected": "solid_waste",
            "signal_fault": "traffic",
            "stray_animals": "public_safety",
            "stray_cattle": "public_safety",
            "gas_leak": "gas_fire_hazards",
            "illegal_construction": "building_inspection",
        }

        if self.pipeline is None:
            # Fallback heuristic if model is loading or not yet trained
            for key in lexicon_keys:
                if key in lexicon_to_dept:
                    return {
                        "category": lexicon_to_dept[key],
                        "confidence": 0.85,
                        "needsReview": False,
                        "method": "rule_lexicon",
                        "lexicon_keys": lexicon_keys
                    }
            return {
                "category": "other",
                "confidence": 0.5,
                "needsReview": True,
                "method": "fallback",
                "lexicon_keys": lexicon_keys
            }

        # Model Inference
        probs = self.pipeline.predict_proba([norm_text])[0]
        top_idx = np.argmax(probs)
        top_cat = self.classes_[top_idx]
        top_prob = float(probs[top_idx])

        # Confidence margin check: check difference between top-1 and top-2
        sorted_probs = np.sort(probs)[::-1]
        margin = sorted_probs[0] - (sorted_probs[1] if len(sorted_probs) > 1 else 0.0)

        # Lexicon reinforcement: boost probability if ML aligns with lexicon
        for key in lexicon_keys:
            if key in lexicon_to_dept and lexicon_to_dept[key] == top_cat:
                top_prob = min(0.99, top_prob + 0.15)
                margin += 0.15

        # Abstention threshold: if top_prob < 0.35 and margin < 0.10, abstain
        if top_prob < 0.35 and margin < 0.10:
            return {
                "category": "other",
                "confidence": round(top_prob, 3),
                "margin": round(margin, 3),
                "needsReview": True,
                "abstain": True,
                "reason": "Low confidence gap between top candidate departments",
                "lexicon_keys": lexicon_keys
            }

        return {
            "category": top_cat,
            "confidence": round(top_prob, 3),
            "margin": round(margin, 3),
            "needsReview": (top_prob < 0.60),
            "lexicon_keys": lexicon_keys
        }
