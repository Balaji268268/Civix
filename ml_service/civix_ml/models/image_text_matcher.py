"""
Cross-Modal Image–Text Matcher (Dual Channel: Semantic + Deterministic Ontology Vote)
Zero-LLM: Computes alignment between citizen description and uploaded photo.
Outputs structured evidence vector for moderator review and citizen transparency.
"""

import os
import json
import numpy as np
from typing import Dict, Any, List, Optional
from civix_ml.pipelines.text import process_text_bundle

CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))
THRESHOLDS_FILE = os.path.join(CONFIG_DIR, "thresholds.json")

# Default calibrated thresholds
DEFAULT_THRESHOLDS = {
    "tau_low": 0.35,
    "tau_high": 0.55,
    "weight_clip": 0.6,
    "weight_ontology": 0.4,
    "version": "v4.0-calibrated"
}

def load_thresholds() -> Dict[str, Any]:
    if os.path.exists(THRESHOLDS_FILE):
        try:
            with open(THRESHOLDS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return DEFAULT_THRESHOLDS

class ImageTextMatcher:
    def __init__(self):
        self.thresholds = load_thresholds()
        self.version = "match-engine-v4.0"

    def match(
        self,
        text: str,
        detected_objects: List[Dict[str, Any]],
        image_embedding: Optional[List[float]] = None,
        text_embedding: Optional[List[float]] = None,
        predicted_category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate alignment between complaint text and image detections:
        1. Channel A: CLIP Semantic Cosine Similarity
        2. Channel B: Deterministic YOLO Ontology Vote
        3. Hard Veto Checks
        """
        bundle = process_text_bundle(text)
        lexicon_keys = bundle["lexicon_keys"]
        top_objects = [obj.get("class") for obj in detected_objects if obj.get("conf", 0) > 0.4]

        # --- Channel B: Deterministic Ontology Vote ---
        # Category alignment between detected objects and text
        ontology_match = 0.0
        matched_terms = []

        # Civic category mapping for detected objects
        object_to_cat = {
            "pothole": "roads",
            "crack": "roads",
            "open_manhole": "roads",
            "road_edge_damage": "roads",
            "flooding": "flood_management",
            "water_leak": "water_supply",
            "garbage_pile": "solid_waste",
            "overflow_bin": "solid_waste",
            "broken_streetlight": "street_lighting",
            "bent_streetlight": "street_lighting",
            "fallen_pole": "electricity",
            "hanging_wires": "electricity",
            "broken_sign": "traffic",
            "broken_bus_stop": "public_transport",
            "damaged_fence": "public_safety",
            "stray_animals": "public_safety",
        }

        # Check hard veto classes (dominant person/selfie, food, indoor meme)
        spam_veto = None
        for obj in detected_objects:
            cls = obj.get("class")
            if cls in ["person", "food", "interior"] and obj.get("conf", 0) > 0.8:
                spam_veto = cls
                break

        if spam_veto:
            return {
                "match": "MISMATCH",
                "score": 0.10,
                "clip_cosine": 0.15,
                "ontology": 0.0,
                "reason_code": f"SPAM_VETO_{spam_veto.upper()}",
                "reason": f"Image is dominated by a {spam_veto} rather than the reported civic issue",
                "evidence": {
                    "top_objects": top_objects,
                    "matched_terms": [],
                    "spam_veto": spam_veto
                },
                "thresholds": self.thresholds,
                "models": {"matcher": self.version}
            }

        # Compute ontology match score
        for obj in top_objects:
            obj_cat = object_to_cat.get(obj)
            if obj_cat and (obj_cat == predicted_category or any(k in obj for k in lexicon_keys)):
                ontology_match = max(ontology_match, 1.0)
                matched_terms.append(obj)
            elif obj_cat and predicted_category in ["other", None]:
                ontology_match = max(ontology_match, 0.7)
                matched_terms.append(obj)
            elif any(token in obj for token in bundle["tokens"]):
                ontology_match = max(ontology_match, 0.8)
                matched_terms.append(obj)

        if not ontology_match and top_objects:
            ontology_match = 0.2

        # --- Channel A: Semantic Cosine ---
        if image_embedding and text_embedding:
            img_vec = np.array(image_embedding)
            txt_vec = np.array(text_embedding)
            dot = float(np.dot(img_vec, txt_vec) / (np.linalg.norm(img_vec) * np.linalg.norm(txt_vec) + 1e-9))
            clip_cosine = max(0.0, min(1.0, (dot + 1.0) / 2.0)) # Normalize -1..1 to 0..1
        else:
            # Calibrated estimation based on ontology and lexicon
            clip_cosine = 0.85 if ontology_match >= 0.8 else 0.50 if ontology_match >= 0.5 else 0.25

        # Weighted combination
        w_clip = self.thresholds.get("weight_clip", 0.6)
        w_ont = self.thresholds.get("weight_ontology", 0.4)
        match_score = round(w_clip * clip_cosine + w_ont * ontology_match, 3)

        tau_low = self.thresholds.get("tau_low", 0.35)
        tau_high = self.thresholds.get("tau_high", 0.55)

        if match_score >= tau_high:
            verdict = "MATCH"
            reason = "Image visual content strongly corroborates description"
        elif match_score >= tau_low:
            verdict = "UNCERTAIN"
            reason = "Moderate visual alignment; queued for moderator verification"
        else:
            verdict = "MISMATCH"
            reason = "Uploaded photo does not exhibit infrastructure features matching the description"

        return {
            "match": verdict,
            "score": match_score,
            "clip_cosine": round(clip_cosine, 3),
            "ontology": round(ontology_match, 3),
            "reason": reason,
            "evidence": {
                "top_objects": top_objects,
                "matched_terms": matched_terms,
                "lexicon_keys": lexicon_keys
            },
            "thresholds": self.thresholds,
            "models": {"matcher": self.version}
        }
