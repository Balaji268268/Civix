#!/usr/bin/env python3
"""
generate_golden_eval_pairs.py — Generates locked golden evaluation sets for:
1. Duplicate detection (D5): golden_duplicates_v1.jsonl
2. Image-text matching (D4): golden_image_text_v1.jsonl
"""

import json
import os
import random

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLDEN_DIR = os.path.join(BASE_DIR, "eval", "golden")
PROCESSED_DIR = os.path.join(BASE_DIR, "datasets", "processed")

os.makedirs(GOLDEN_DIR, exist_ok=True)

def generate_duplicate_pairs():
    cat_path = os.path.join(PROCESSED_DIR, "category_text_v1_sample.jsonl")
    with open(cat_path, "r", encoding="utf-8") as f:
        rows = [json.loads(line) for line in f if line.strip()]

    # Group by category and proximity
    pairs = []
    rng = random.Random(42)

    # 1. Exact / near duplicate pairs (same category, same subtype, near coordinates)
    by_subtype = {}
    for r in rows[:1000]:
        key = (r.get("category_id"), r.get("subtype"))
        by_subtype.setdefault(key, []).append(r)

    dup_count = 0
    for key, s_rows in by_subtype.items():
        if len(s_rows) >= 2 and dup_count < 250:
            for i in range(len(s_rows) - 1):
                pairs.append({
                    "pair_id": f"dup-gold-{len(pairs):04d}",
                    "item_a": {"id": s_rows[i]["id"], "text": s_rows[i]["text"], "coords": s_rows[i]["coords"], "category_id": s_rows[i]["category_id"]},
                    "item_b": {"id": s_rows[i+1]["id"], "text": s_rows[i+1]["text"], "coords": s_rows[i+1]["coords"], "category_id": s_rows[i+1]["category_id"]},
                    "is_duplicate": True,
                    "relation": "same_place"
                })
                dup_count += 1
                if dup_count >= 250:
                    break

    # 2. Non-duplicate / distinct pairs (different categories or different locations)
    non_dup_count = 0
    for i in range(250):
        r1 = rng.choice(rows)
        r2 = rng.choice(rows)
        while r1["category_id"] == r2["category_id"]:
            r2 = rng.choice(rows)
        pairs.append({
            "pair_id": f"non-dup-gold-{len(pairs):04d}",
            "item_a": {"id": r1["id"], "text": r1["text"], "coords": r1["coords"], "category_id": r1["category_id"]},
            "item_b": {"id": r2["id"], "text": r2["text"], "coords": r2["coords"], "category_id": r2["category_id"]},
            "is_duplicate": False,
            "relation": "distinct"
        })

    rng.shuffle(pairs)
    out_path = os.path.join(GOLDEN_DIR, "golden_duplicates_v1.jsonl")
    with open(out_path, "w", encoding="utf-8") as f:
        for p in pairs:
            f.write(json.dumps(p) + "\n")
    print(f"Generated {len(pairs)} duplicate evaluation pairs -> {out_path}")

def generate_image_text_pairs():
    cat_path = os.path.join(PROCESSED_DIR, "category_text_v1_sample.jsonl")
    with open(cat_path, "r", encoding="utf-8") as f:
        rows = [json.loads(line) for line in f if line.strip()]

    rng = random.Random(42)
    pairs = []

    # Map object class to sample images or mock classes
    class_pool = ["pothole", "open_manhole", "broken_streetlight", "garbage_pile", "flooding", "water_leak", "stray_animals", "hanging_wires"]

    for i in range(500):
        row = rng.choice(rows[:1000])
        # 50% matching, 50% mismatch
        is_match = (i % 2 == 0)
        category = row.get("category_id")
        
        if is_match:
            # Pick a compatible object
            detected_object = "pothole" if category == "roads" else "broken_streetlight" if category == "street_lighting" else "garbage_pile" if category == "solid_waste" else "water_leak"
            expected_verdict = "MATCH"
        else:
            # Mismatched object or spam image (e.g. selfie/person for pothole)
            detected_object = "person" if i % 4 == 0 else "food" if i % 4 == 1 else "broken_sign"
            expected_verdict = "MISMATCH"

        pairs.append({
            "pair_id": f"img-txt-gold-{i:04d}",
            "text": row["text"],
            "category_id": category,
            "mock_detected_objects": [{"class": detected_object, "conf": 0.92}],
            "expected_verdict": expected_verdict,
            "is_match": is_match
        })

    out_path = os.path.join(GOLDEN_DIR, "golden_image_text_v1.jsonl")
    with open(out_path, "w", encoding="utf-8") as f:
        for p in pairs:
            f.write(json.dumps(p) + "\n")
    print(f"Generated {len(pairs)} image-text evaluation pairs -> {out_path}")

if __name__ == "__main__":
    generate_duplicate_pairs()
    generate_image_text_pairs()
