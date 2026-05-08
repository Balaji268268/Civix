#!/usr/bin/env python3
"""
create_golden_sets.py — Deterministically partitions datasets into:
1. Locked Golden Evaluation Sets (ml_service/eval/golden/)
2. Train / Validation Splits (ml_service/datasets/split/)
Ensures zero data leakage between train and golden evaluation sets.
"""

import json
import os
import random
import hashlib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "datasets", "processed")
GOLDEN_DIR = os.path.join(BASE_DIR, "eval", "golden")
SPLIT_DIR = os.path.join(BASE_DIR, "datasets", "split")

os.makedirs(GOLDEN_DIR, exist_ok=True)
os.makedirs(SPLIT_DIR, exist_ok=True)

def split_category_dataset():
    src_path = os.path.join(PROCESSED_DIR, "category_text_v1_sample.jsonl")
    if not os.path.exists(src_path):
        print(f"File not found: {src_path}")
        return

    with open(src_path, "r", encoding="utf-8") as f:
        rows = [json.loads(line) for line in f if line.strip()]

    # Stratified split by category_id
    by_cat = {}
    for r in rows:
        cat = r.get("category_id", "other")
        by_cat.setdefault(cat, []).append(r)

    golden_rows = []
    train_rows = []
    val_rows = []

    # Pin random seed
    rng = random.Random(42)

    for cat, cat_rows in by_cat.items():
        rng.shuffle(cat_rows)
        # Take up to 25 items per category for golden (20 categories * 25 = 500 golden)
        golden_count = min(25, max(5, int(len(cat_rows) * 0.1)))
        val_count = min(30, int(len(cat_rows) * 0.1))
        
        golden_rows.extend(cat_rows[:golden_count])
        val_rows.extend(cat_rows[golden_count:golden_count + val_count])
        train_rows.extend(cat_rows[golden_count + val_count:])

    # Save Golden Category Set
    golden_path = os.path.join(GOLDEN_DIR, "golden_category_v1.jsonl")
    with open(golden_path, "w", encoding="utf-8") as f:
        for r in golden_rows:
            f.write(json.dumps(r) + "\n")

    # Save Train / Val Splits
    train_path = os.path.join(SPLIT_DIR, "train_category_v1.jsonl")
    with open(train_path, "w", encoding="utf-8") as f:
        for r in train_rows:
            f.write(json.dumps(r) + "\n")

    val_path = os.path.join(SPLIT_DIR, "val_category_v1.jsonl")
    with open(val_path, "w", encoding="utf-8") as f:
        for r in val_rows:
            f.write(json.dumps(r) + "\n")

    print(f"Category Split Complete: {len(train_rows)} train, {len(val_rows)} val, {len(golden_rows)} locked golden.")

def split_spam_dataset():
    src_path = os.path.join(PROCESSED_DIR, "spam_text_v1_sample.jsonl")
    if not os.path.exists(src_path):
        print(f"File not found: {src_path}")
        return

    with open(src_path, "r", encoding="utf-8") as f:
        rows = [json.loads(line) for line in f if line.strip()]

    rng = random.Random(42)
    rng.shuffle(rows)

    # 500 for locked golden, 200 for val, rest for train
    golden_rows = rows[:500]
    val_rows = rows[500:700]
    train_rows = rows[700:]

    golden_path = os.path.join(GOLDEN_DIR, "golden_spam_v1.jsonl")
    with open(golden_path, "w", encoding="utf-8") as f:
        for r in golden_rows:
            f.write(json.dumps(r) + "\n")

    train_path = os.path.join(SPLIT_DIR, "train_spam_v1.jsonl")
    with open(train_path, "w", encoding="utf-8") as f:
        for r in train_rows:
            f.write(json.dumps(r) + "\n")

    val_path = os.path.join(SPLIT_DIR, "val_spam_v1.jsonl")
    with open(val_path, "w", encoding="utf-8") as f:
        for r in val_rows:
            f.write(json.dumps(r) + "\n")

    print(f"Spam Split Complete: {len(train_rows)} train, {len(val_rows)} val, {len(golden_rows)} locked golden.")

if __name__ == "__main__":
    split_category_dataset()
    split_spam_dataset()
