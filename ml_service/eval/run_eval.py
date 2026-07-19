#!/usr/bin/env python3
"""
run_eval.py — Evaluation harness for Civix ML models against locked golden sets.
Emits JSON metrics + Markdown report.
Enforces CI regression gates (Macro-F1 >= 0.85, Spam Precision >= 0.95).
"""

import os
import sys
import json
import argparse
from collections import defaultdict
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from civix_ml.models.category_classifier import CategoryClassifier
from civix_ml.models.spam_detector import SpamDetector
from civix_ml.models.priority_classifier import PriorityClassifier

def evaluate_category(golden_path: str, cat_model: CategoryClassifier):
    with open(golden_path, "r", encoding="utf-8") as f:
        samples = [json.loads(line) for line in f if line.strip()]

    y_true = []
    y_pred = []
    per_class = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})

    for s in samples:
        true_cat = s.get("category_id")
        pred = cat_model.predict(s.get("text", ""))
        pred_cat = pred["category"]

        y_true.append(true_cat)
        y_pred.append(pred_cat)

        if true_cat == pred_cat:
            per_class[true_cat]["tp"] += 1
        else:
            per_class[pred_cat]["fp"] += 1
            per_class[true_cat]["fn"] += 1

    # Compute Macro Precision, Recall, F1
    precisions = []
    recalls = []
    f1s = []

    for cat, stats in per_class.items():
        tp = stats["tp"]
        fp = stats["fp"]
        fn = stats["fn"]

        p = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        r = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * p * r) / (p + r) if (p + r) > 0 else 0.0

        precisions.append(p)
        recalls.append(r)
        f1s.append(f1)

    macro_p = float(np.mean(precisions)) if precisions else 0.0
    macro_r = float(np.mean(recalls)) if recalls else 0.0
    macro_f1 = float(np.mean(f1s)) if f1s else 0.0
    accuracy = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp) / len(y_true) if y_true else 0.0

    return {
        "samples": len(y_true),
        "accuracy": round(accuracy, 4),
        "macro_precision": round(macro_p, 4),
        "macro_recall": round(macro_r, 4),
        "macro_f1": round(macro_f1, 4),
        "gate_passed": macro_f1 >= 0.85
    }

def evaluate_spam(golden_path: str, spam_model: SpamDetector):
    with open(golden_path, "r", encoding="utf-8") as f:
        samples = [json.loads(line) for line in f if line.strip()]

    tp = fp = tn = fn = 0
    auto_spams = 0
    auto_spam_tp = 0

    for s in samples:
        true_fake = bool(s.get("is_fake", 0))
        pred = spam_model.predict(s.get("text", ""))
        pred_fake = bool(pred["is_fake"])
        action = pred.get("action", "")

        if action == "AUTO_SPAM":
            auto_spams += 1
            if true_fake:
                auto_spam_tp += 1

        if true_fake and pred_fake:
            tp += 1
        elif not true_fake and pred_fake:
            fp += 1
        elif not true_fake and not pred_fake:
            tn += 1
        else:
            fn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    auto_precision = auto_spam_tp / auto_spams if auto_spams > 0 else 1.0

    return {
        "samples": len(samples),
        "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "auto_spam_count": auto_spams,
        "auto_spam_precision": round(auto_precision, 4),
        "gate_passed": auto_precision >= 0.95
    }

def main():
    parser = argparse.ArgumentParser(description="Civix ML Evaluation Harness")
    parser.add_argument("--set", default="golden-v1", help="Evaluation golden set version")
    parser.add_argument("--out", default=None, help="Path to write markdown eval report")
    args = parser.parse_args()

    golden_dir = os.path.join(BASE_DIR, "eval", "golden")
    cat_golden = os.path.join(golden_dir, "golden_category_v1.jsonl")
    spam_golden = os.path.join(golden_dir, "golden_spam_v1.jsonl")

    print(f"Running evaluation on {args.set} locked golden sets...")

    cat_model = CategoryClassifier()
    spam_model = SpamDetector()

    cat_results = evaluate_category(cat_golden, cat_model)
    spam_results = evaluate_spam(spam_golden, spam_model)

    print("\n=======================================================")
    print("               CIVIX EVALUATION RESULTS                ")
    print("=======================================================")
    print(f"Category Categorizer (Macro-F1 Gate: >= 0.85):")
    print(f"  - Samples:  {cat_results['samples']}")
    print(f"  - Accuracy: {cat_results['accuracy']:.4f}")
    print(f"  - Macro-F1: {cat_results['macro_f1']:.4f} -> {'PASSED' if cat_results['gate_passed'] else 'FAILED'}")
    print("-------------------------------------------------------")
    print(f"Spam Detector (Auto-Spam Precision Gate: >= 0.95):")
    print(f"  - Samples:    {spam_results['samples']}")
    print(f"  - Precision:  {spam_results['precision']:.4f}")
    print(f"  - Recall:     {spam_results['recall']:.4f}")
    print(f"  - Auto-Spam P:{spam_results['auto_spam_precision']:.4f} -> {'PASSED' if spam_results['gate_passed'] else 'FAILED'}")
    print("=======================================================")

    report = {
        "eval_set": args.set,
        "category": cat_results,
        "spam": spam_results,
        "all_gates_passed": cat_results["gate_passed"] and spam_results["gate_passed"]
    }

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(f"# Civix ML Evaluation Report — {args.set}\n\n")
            f.write(f"**Overall Status:** {'PASSED' if report['all_gates_passed'] else 'FAILED'}\n\n")
            f.write("```json\n" + json.dumps(report, indent=2) + "\n```\n")
        print(f"Report written to {args.out}")

if __name__ == "__main__":
    main()
