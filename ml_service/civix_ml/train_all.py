#!/usr/bin/env python3
"""
train_all.py — Orchestrates training of all NLP text models:
1. CategoryClassifier (20 public + personal depts)
2. SpamDetector (Feature stack + Logistic Regression)
3. PriorityClassifier (Calibrated multi-class SGD)
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from civix_ml.models.category_classifier import CategoryClassifier
from civix_ml.models.spam_detector import SpamDetector
from civix_ml.models.priority_classifier import PriorityClassifier

def main():
    split_dir = os.path.join(BASE_DIR, "datasets", "split")
    cat_train_file = os.path.join(split_dir, "train_category_v1.jsonl")
    spam_train_file = os.path.join(split_dir, "train_spam_v1.jsonl")

    print("==============================================")
    print("      CIVIX NLP MODEL TRAINING PIPELINE       ")
    print("==============================================")

    # 1. Train Category Classifier
    print("\n[1/3] Training Department Categorizer...")
    cat_model = CategoryClassifier()
    cat_model.train(cat_train_file)

    # 2. Train Spam Detector
    print("\n[2/3] Training Spam / Fake Detector...")
    spam_model = SpamDetector()
    spam_model.train(spam_train_file)

    # 3. Train Priority Classifier
    print("\n[3/3] Training Priority Classifier...")
    prio_model = PriorityClassifier()
    prio_model.train(cat_train_file)

    print("\n==============================================")
    print("  ALL MODELS SUCCESSFULLY TRAINED & SAVED!    ")
    print("==============================================")

if __name__ == "__main__":
    main()
