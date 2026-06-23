"""
Spam / Fake / Gibberish Detector (Statistical Feature Stack + Calibrated Classifier)
Fast (p95 < 30ms), deterministic, zero-LLM, explainable via human-readable reason codes.
"""

import os
import re
import json
import joblib
import numpy as np
from typing import Dict, Any, List
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from civix_ml.pipelines.text import process_text_bundle, calculate_entropy

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(MODEL_DIR, "spam_model_v4.pkl")

# QWERTY Keyboards rows for adjacency checking
QWERTY_ROWS = [
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
]

def max_qwerty_run(text: str) -> int:
    """Calculate maximum consecutive sequence of characters adjacent on a standard QWERTY keyboard."""
    clean = re.sub(r'[^a-z]', '', text.lower())
    if len(clean) < 3:
        return len(clean)
    
    max_run = 1
    current_run = 1
    for i in range(len(clean) - 1):
        c1, c2 = clean[i], clean[i+1]
        is_adjacent = False
        for row in QWERTY_ROWS:
            if c1 in row and c2 in row:
                if abs(row.index(c1) - row.index(c2)) == 1:
                    is_adjacent = True
                    break
        if is_adjacent:
            current_run += 1
            max_run = max(max_run, current_run)
        else:
            current_run = 1
    return max_run

def extract_spam_features(bundle: Dict[str, Any]) -> List[float]:
    """Extract numeric feature vector from TextBundle."""
    norm_text = bundle["text_normalized"]
    char_stats = bundle["char_stats"]
    word_stats = bundle["word_stats"]
    
    qwerty_run = max_qwerty_run(norm_text)
    lexicon_hits = len(bundle["lexicon_keys"])
    token_count = word_stats["token_count"]
    unique_tokens = word_stats["unique_tokens"]
    ttr = word_stats["ttr"]
    
    # Repeated word run
    tokens = bundle["tokens"]
    max_rep_run = 1
    cur_rep = 1
    for i in range(len(tokens) - 1):
        if tokens[i] == tokens[i+1]:
            cur_rep += 1
            max_rep_run = max(max_rep_run, cur_rep)
        else:
            cur_rep = 1
            
    return [
        char_stats["length"],
        char_stats["entropy"],
        char_stats["digit_ratio"],
        char_stats["symbol_ratio"],
        char_stats["uppercase_ratio"],
        token_count,
        unique_tokens,
        ttr,
        qwerty_run,
        max_rep_run,
        lexicon_hits
    ]

class SpamDetector:
    def __init__(self, model_path: str = MODEL_FILE):
        self.model_path = model_path
        self.pipeline = None
        self._load_or_init()

    def _load_or_init(self):
        if os.path.exists(self.model_path):
            try:
                self.pipeline = joblib.load(self.model_path)
            except Exception as e:
                print(f"[SpamDetector] Warning: Could not load model: {e}")

    def train(self, data_path: str):
        """Train Logistic Regression on extracted feature matrix."""
        features = []
        labels = []

        with open(data_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    text = item.get("text", "")
                    is_fake = int(item.get("is_fake", 0))
                    bundle = process_text_bundle(text)
                    feats = extract_spam_features(bundle)
                    features.append(feats)
                    labels.append(is_fake)

        pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42))
        ])

        pipeline.fit(features, labels)
        self.pipeline = pipeline

        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.pipeline, self.model_path)
        print(f"[SpamDetector] Model trained on {len(labels)} samples and saved to {self.model_path}.")

    def predict(self, text: str, title: str = "") -> Dict[str, Any]:
        """Classify spam with explainable rule fallbacks and asymmetric confidence policy."""
        bundle = process_text_bundle(text, title=title)
        norm_text = bundle["text_normalized"]
        char_stats = bundle["char_stats"]
        word_stats = bundle["word_stats"]
        lexicon_keys = bundle["lexicon_keys"]
        
        # --- Stage 1: Instant Rule Filters ---
        
        # Rule 1.1: Keyboard mash signature
        qwerty_run = max_qwerty_run(norm_text)
        if qwerty_run >= 7:
            return {
                "is_fake": True,
                "confidence": 0.98,
                "reason_code": "KEYSIGNATURE",
                "reason": f"QWERTY keyboard sequence run length of {qwerty_run} detected",
                "needsReview": False,
                "action": "AUTO_SPAM"
            }

        # Rule 1.2: Extreme low entropy repetition
        if len(norm_text) > 15 and char_stats["entropy"] < 2.2:
            return {
                "is_fake": True,
                "confidence": 0.95,
                "reason_code": "LOW_ENTROPY",
                "reason": f"Abnormally low character entropy ({char_stats['entropy']:.2f} bits/char)",
                "needsReview": False,
                "action": "AUTO_SPAM"
            }

        # Rule 1.3: Repetition spam (e.g. 'water water water')
        if word_stats["token_count"] >= 5 and word_stats["ttr"] <= 0.20:
            return {
                "is_fake": True,
                "confidence": 0.94,
                "reason_code": "REPETITIVE_WORDS",
                "reason": f"High word repetition ratio (TTR={word_stats['ttr']:.2f})",
                "needsReview": False,
                "action": "AUTO_SPAM"
            }

        # Rule 1.4: Too short without domain keywords
        if len(norm_text) < 8 and not lexicon_keys:
            return {
                "is_fake": False,
                "confidence": 0.65,
                "reason_code": "EMPTY_OR_TINY",
                "reason": "Text is extremely short; routed for review",
                "needsReview": True,
                "action": "FLAG_REVIEW"
            }

        # --- Stage 2: Learned Feature Scoring ---
        feats = extract_spam_features(bundle)

        if self.pipeline is None:
            # Fallback if model not trained
            is_suspicious = (char_stats["symbol_ratio"] > 0.4 or char_stats["digit_ratio"] > 0.6)
            return {
                "is_fake": is_suspicious,
                "confidence": 0.70 if is_suspicious else 0.15,
                "reason_code": "HEURISTIC",
                "reason": "Evaluated using statistical heuristics",
                "needsReview": is_suspicious,
                "action": "FLAG_REVIEW" if is_suspicious else "PASS"
            }

        probs = self.pipeline.predict_proba([feats])[0]
        p_spam = float(probs[1])

        # Asymmetric Decision Policy
        # p >= 0.90 -> Auto Spam
        # 0.60 <= p < 0.90 -> Review Queue
        # p < 0.60 -> Normal Pass
        if p_spam >= 0.90:
            action = "AUTO_SPAM"
            is_fake = True
            needs_review = False
            reason_code = "STATISTICAL_SPAM"
            reason = "High statistical spam likelihood across multiple feature dimensions"
        elif p_spam >= 0.60:
            action = "FLAG_REVIEW"
            is_fake = False
            needs_review = True
            reason_code = "UNCERTAIN_ANOMALY"
            reason = "Borderline anomaly score detected; flagged for moderator review"
        else:
            action = "PASS"
            is_fake = False
            needs_review = False
            reason_code = "LEGITIMATE"
            reason = "Legitimate civic issue structure verified"

        return {
            "is_fake": is_fake,
            "confidence": round(p_spam if is_fake else (1.0 - p_spam), 3),
            "p_spam": round(p_spam, 3),
            "reason_code": reason_code,
            "reason": reason,
            "needsReview": needs_review,
            "action": action,
            "features": {
                "entropy": char_stats["entropy"],
                "qwerty_run": qwerty_run,
                "ttr": word_stats["ttr"],
                "lexicon_hits": len(lexicon_keys)
            }
        }
