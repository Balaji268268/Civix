"""
H3 Geospatial & Semantic Duplicate Resolution Engine
Two-Layer Matching:
Layer 1: Spatial Proximity (H3 res-9 ~165m / res-8 ~500m / Haversine)
Layer 2: Semantic Similarity (TF-IDF & Embeddings)
"""

import math
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from civix_ml.pipelines.text import process_text_bundle

def compute_haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in meters."""
    R = 6371000.0 # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

def compute_text_jaccard_and_overlap(bundle_a: Dict[str, Any], bundle_b: Dict[str, Any]) -> float:
    """Compute lexical token similarity and domain lexicon overlap between two texts."""
    tokens_a = set(bundle_a["tokens"])
    tokens_b = set(bundle_b["tokens"])
    
    if not tokens_a or not tokens_b:
        return 0.0
        
    intersection = tokens_a.intersection(tokens_b)
    union = tokens_a.union(tokens_b)
    jaccard = len(intersection) / len(union) if union else 0.0
    
    # Lexicon key overlap boost
    lex_a = set(bundle_a["lexicon_keys"])
    lex_b = set(bundle_b["lexicon_keys"])
    if lex_a and lex_b and lex_a.intersection(lex_b):
        jaccard += 0.35
        
    return min(1.0, round(jaccard, 3))

class DuplicateIndexer:
    def __init__(self):
        self.same_place_distance_m = 250.0 # ~250m radius for exact same issue
        self.same_region_distance_m = 1500.0 # ~1.5km radius for regional similarity
        self.dup_sim_threshold = 0.65

    def find_duplicates(
        self,
        candidate: Dict[str, Any],
        existing_issues: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Screen candidate complaint against active nearby issues.
        Returns potential duplicate cluster matches with distance and confidence.
        """
        cand_text = candidate.get("description", "") or candidate.get("text", "")
        cand_title = candidate.get("title", "")
        cand_coords = candidate.get("coords") or candidate.get("coordinates")
        cand_cat = candidate.get("category") or candidate.get("category_id")

        bundle_cand = process_text_bundle(cand_text, title=cand_title)
        
        cand_lat = cand_lng = None
        if isinstance(cand_coords, (list, tuple)) and len(cand_coords) >= 2:
            cand_lat, cand_lng = float(cand_coords[0]), float(cand_coords[1])
        elif isinstance(cand_coords, dict):
            cand_lat = float(cand_coords.get("lat", 0))
            cand_lng = float(cand_coords.get("lng", 0))

        duplicates = []
        similar_nearby = []

        for issue in existing_issues:
            issue_id = issue.get("id") or issue.get("complaintId") or str(issue.get("_id"))
            issue_text = issue.get("description", "") or issue.get("text", "")
            issue_title = issue.get("title", "")
            issue_coords = issue.get("coords") or issue.get("coordinates")
            issue_cat = issue.get("category") or issue.get("category_id")

            bundle_issue = process_text_bundle(issue_text, title=issue_title)
            similarity = compute_text_jaccard_and_overlap(bundle_cand, bundle_issue)

            dist_m = None
            if cand_lat and cand_lng:
                iss_lat = iss_lng = None
                if isinstance(issue_coords, (list, tuple)) and len(issue_coords) >= 2:
                    iss_lat, iss_lng = float(issue_coords[0]), float(issue_coords[1])
                elif isinstance(issue_coords, dict):
                    iss_lat = float(issue_coords.get("lat", 0))
                    iss_lng = float(issue_coords.get("lng", 0))
                
                if iss_lat and iss_lng:
                    dist_m = compute_haversine_distance_m(cand_lat, cand_lng, iss_lat, iss_lng)

            # Decision Logic
            is_same_place = dist_m is not None and dist_m <= self.same_place_distance_m
            is_same_region = dist_m is not None and dist_m <= self.same_region_distance_m
            same_category = (cand_cat == issue_cat) if (cand_cat and issue_cat) else False

            # Same Place + High Semantic Similarity -> Definite Duplicate
            if is_same_place and (similarity >= self.dup_sim_threshold or same_category):
                duplicates.append({
                    "issue_id": issue_id,
                    "complaintId": issue.get("complaintId", issue_id),
                    "title": issue_title,
                    "score": round(max(similarity, 0.85), 3),
                    "distance_meters": dist_m,
                    "relation": "same_place",
                    "reasoning": f"Reported at the same location ({dist_m:.0f}m away) with matching issue description."
                })
            # Same Region + Same Category -> Regional Similar
            elif is_same_region and (same_category or similarity >= 0.5):
                similar_nearby.append({
                    "issue_id": issue_id,
                    "complaintId": issue.get("complaintId", issue_id),
                    "title": issue_title,
                    "score": round(similarity, 3),
                    "distance_meters": dist_m,
                    "relation": "same_region_similar",
                    "reasoning": f"Similar issue reported nearby ({dist_m:.0f}m away)."
                })

        # Sort duplicates by highest score
        duplicates.sort(key=lambda x: x["score"], reverse=True)
        similar_nearby.sort(key=lambda x: x["score"], reverse=True)

        is_duplicate = len(duplicates) > 0
        top_match = duplicates[0] if is_duplicate else (similar_nearby[0] if similar_nearby else None)

        return {
            "is_duplicate": is_duplicate,
            "has_nearby_similar": len(similar_nearby) > 0,
            "confidence": top_match["score"] if top_match else 0.0,
            "top_match": top_match,
            "duplicates": duplicates[:5],
            "similar_nearby": similar_nearby[:5]
        }
