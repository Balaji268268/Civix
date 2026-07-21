"""
Civix ML Microservice — FastAPI Application
Deterministic, explainable, self-hosted civic intelligence service.
Zero-LLM prediction paths.
"""

import os
import sys
import time
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from civix_ml.pipelines.text import process_text_bundle
from civix_ml.models.category_classifier import CategoryClassifier
from civix_ml.models.spam_detector import SpamDetector
from civix_ml.models.priority_classifier import PriorityClassifier
from civix_ml.models.yolo_detector import YOLOCivicDetector
from civix_ml.models.image_text_matcher import ImageTextMatcher
from civix_ml.models.duplicate_indexer import DuplicateIndexer

app = FastAPI(
    title="Civix ML Service",
    version="1.0.0",
    description="Production-grade, zero-LLM machine learning & computer vision service for civic intelligence."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Model Registry ---
class ModelRegistry:
    def __init__(self):
        self.category_model = CategoryClassifier()
        self.spam_model = SpamDetector()
        self.priority_model = PriorityClassifier()
        self.yolo_model = YOLOCivicDetector()
        self.matcher_model = ImageTextMatcher()
        self.duplicate_indexer = DuplicateIndexer()
        self.versions = {
            "category": "v4.0-calibrated-linear",
            "spam": "v4.0-feature-stack-lr",
            "priority": "v4.0-calibrated-sgd",
            "cv": "yolov8n-onnx-v4.0",
            "matcher": "match-engine-v4.0",
            "duplicate": "h3-faiss-v4.0"
        }
        self.is_ready = True

registry = ModelRegistry()

# --- Request / Response Schemas ---

class TextPredictRequest(BaseModel):
    title: Optional[str] = ""
    description: Optional[str] = ""
    text: Optional[str] = ""
    coords: Optional[List[float]] = None
    coordinates: Optional[Dict[str, float]] = None
    category: Optional[str] = "other"

class MatchImageTextRequest(BaseModel):
    text: str
    detected_objects: Optional[List[Dict[str, Any]]] = []
    image_embedding: Optional[List[float]] = None
    category: Optional[str] = "other"

class DuplicateCheckRequest(BaseModel):
    candidate: Dict[str, Any]
    existing_issues: List[Dict[str, Any]] = []

class CategoryResponse(BaseModel):
    category: str
    confidence: float
    margin: Optional[float] = 0.0
    needsReview: bool
    lexicon_keys: List[str] = []
    models: Dict[str, str]

class SpamResponse(BaseModel):
    is_fake: bool
    confidence: float
    p_spam: Optional[float] = 0.0
    reason_code: str
    reason: str
    needsReview: bool
    action: str
    features: Dict[str, Any] = {}
    models: Dict[str, str]

class PriorityResponse(BaseModel):
    priority: str
    confidence: float
    urgency_score: float
    method: str
    models: Dict[str, str]

# --- Endpoints ---

@app.get("/v1/healthz")
@app.get("/healthz")
def healthz():
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/v1/readyz")
@app.get("/readyz")
def readyz():
    if not registry.is_ready:
        raise HTTPException(status_code=503, detail="Models initializing")
    return {
        "status": "ready",
        "models": registry.versions
    }

@app.get("/v1/metrics")
@app.get("/metrics")
def metrics():
    return {
        "service": "civix-ml",
        "uptime_seconds": time.time(),
        "models_loaded": list(registry.versions.keys())
    }

@app.post("/v1/predict/category", response_model=CategoryResponse)
def predict_category(req: TextPredictRequest):
    content = req.text or req.description or ""
    res = registry.category_model.predict(content, title=req.title or "")
    return {
        **res,
        "models": {"category": registry.versions["category"]}
    }

@app.post("/v1/score/spam-text", response_model=SpamResponse)
def score_spam_text(req: TextPredictRequest):
    content = req.text or req.description or ""
    res = registry.spam_model.predict(content, title=req.title or "")
    return {
        **res,
        "models": {"spam": registry.versions["spam"]}
    }

@app.post("/v1/predict/priority", response_model=PriorityResponse)
def predict_priority(req: TextPredictRequest):
    content = req.text or req.description or ""
    res = registry.priority_model.predict(content, title=req.title or "", category=req.category or "other")
    return {
        **res,
        "models": {"priority": registry.versions["priority"]}
    }

@app.post("/v1/extract/objects")
async def extract_objects(
    file: Optional[UploadFile] = File(None),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    category: Optional[str] = Form(None)
):
    coords = (lat, lng) if (lat is not None and lng is not None) else None
    if file:
        content = await file.read()
    else:
        # Create minimal 1x1 image bytes for fallback
        content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        
    return registry.yolo_model.extract_objects(content, submitted_coords=coords, context_category=category)

@app.post("/v1/match/image-text")
def match_image_text(req: MatchImageTextRequest):
    return registry.matcher_model.match(
        text=req.text,
        detected_objects=req.detected_objects or [],
        image_embedding=req.image_embedding,
        predicted_category=req.category
    )

@app.post("/v1/find-duplicates")
def find_duplicates(req: DuplicateCheckRequest):
    return registry.duplicate_indexer.find_duplicates(
        candidate=req.candidate,
        existing_issues=req.existing_issues
    )

# --- Legacy Compatibility Aliases (for zero-downtime transition) ---

@app.post("/api/categorize/")
def legacy_categorize(req: Dict[str, Any]):
    title = req.get("title", "")
    desc = req.get("description", "")
    res = registry.category_model.predict(desc, title=title)
    return {"category": res["category"], "confidence": res["confidence"]}

@app.post("/api/detect-fake/")
def legacy_detect_fake(req: Dict[str, Any]):
    title = req.get("title", "")
    desc = req.get("description", "")
    res = registry.spam_model.predict(desc, title=title)
    return {"is_fake": res["is_fake"], "confidence": res["confidence"], "reason": res["reason"]}

@app.post("/api/predict-priority/")
def legacy_predict_priority(req: Dict[str, Any]):
    title = req.get("title", "")
    desc = req.get("description", "")
    res = registry.priority_model.predict(desc, title=title)
    return {"priority": res["priority"], "confidence": res["confidence"]}

@app.post("/api/find-duplicates/")
def legacy_find_duplicates(req: Dict[str, Any]):
    candidate = req.get("candidate", {})
    existing = req.get("existing_issues", [])
    return registry.duplicate_indexer.find_duplicates(candidate, existing)
