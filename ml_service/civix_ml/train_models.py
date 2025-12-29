import pandas as pd
import numpy as np
import joblib
import os
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split

# Setup Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, '..', 'datasets', 'civic_data.csv')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

if not os.path.exists(MODELS_DIR):
    os.makedirs(MODELS_DIR)

print(f"Loading dataset from {DATASET_PATH}...")
df = pd.read_csv(DATASET_PATH)

# --- 1. Train Priority Model ---
print("Training Priority Model...")
X = df['text']
y = df['priority']
priority_pipe = Pipeline([
    ('tfidf', TfidfVectorizer(stop_words='english', ngram_range=(1,2))),
    ('clf', SGDClassifier(loss='modified_huber')), # modified_huber gives probability estimates
])
priority_pipe.fit(X, y)
joblib.dump(priority_pipe, os.path.join(MODELS_DIR, 'priority_model.pkl'))
print("Priority Model Saved.")

# --- 2. Train Category Model ---
print("Training Category Model...")
y_cat = df['category']
category_pipe = Pipeline([
    ('tfidf', TfidfVectorizer(stop_words='english')),
    ('clf', SGDClassifier(loss='modified_huber')),
])
category_pipe.fit(X, y_cat)
joblib.dump(category_pipe, os.path.join(MODELS_DIR, 'category_model.pkl'))
print("Category Model Saved.")

# --- 3. Train Fake Detection Model ---
print("Training Fake Detection Model...")
y_fake = df['is_fake']
fake_pipe = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1,3))), # Capture spam phrases
    ('clf', SGDClassifier(loss='modified_huber')),
])
fake_pipe.fit(X, y_fake)
joblib.dump(fake_pipe, os.path.join(MODELS_DIR, 'fake_model.pkl'))
print("Fake Detection Model Saved.")

print("All models trained successfully!")
