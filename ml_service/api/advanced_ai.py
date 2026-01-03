import os
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Lazy Loaded Global Model Cache
MODELS = {
    "semantic": None,
    "toxicity": None,
    "whisper": None,
    "genai": None,
    "regressor": None
}

def load_semantic_model():
    if MODELS["semantic"] is None:
        print("Loading Semantic Model...")
        from sentence_transformers import SentenceTransformer
        MODELS["semantic"] = SentenceTransformer('all-MiniLM-L6-v2')
    return MODELS["semantic"]

def load_toxicity_model():
    if MODELS["toxicity"] is None:
        print("Loading Toxicity Model...")
        from transformers import pipeline
        # Using a small distilled model for speed
        MODELS["toxicity"] = pipeline("text-classification", model="unitary/unbiased-toxic-roberta", top_k=1)
    return MODELS["toxicity"]

def load_whisper_model():
    if MODELS["whisper"] is None:
        print("Loading Whisper Model...")
        import whisper
        MODELS["whisper"] = whisper.load_model("base")
    return MODELS["whisper"]

# --- 1. Semantic Duplicate Detection ---
@api_view(['POST'])
def check_semantic_duplicate(req):
    try:
        new_text = req.data.get('description', '')
        existing_texts = req.data.get('existing_reports', []) # List of strings
        
        if not new_text or not existing_texts:
            return Response({"is_duplicate": False, "score": 0.0})

        model = load_semantic_model()
        import torch
        from sentence_transformers import util
        
        # Encode
        new_embedding = model.encode(new_text, convert_to_tensor=True)
        existing_embeddings = model.encode(existing_texts, convert_to_tensor=True)
        
        # Compute Cosine Similarity
        cosine_scores = util.cos_sim(new_embedding, existing_embeddings)
        
        # Find best match
        best_score = torch.max(cosine_scores).item()
        
        return Response({
            "is_duplicate": best_score > 0.75, # Threshold
            "score": round(best_score * 100, 2)
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- 2. Toxicity Analysis ---
@api_view(['POST'])
def analyze_toxicity(req):
    try:
        text = req.data.get('text', '')
        if not text: return Response({"error": "No text provided"}, status=400)
        
        model = load_toxicity_model()
        results = model(text)
        
        # Example output: [{'label': 'toxic', 'score': 0.9}]
        top_result = results[0][0]
        
        return Response({
            "is_toxic": top_result['score'] > 0.7 and top_result['label'] != 'neutral', # Adjust labels based on model
            "toxicity_score": round(top_result['score'] * 100, 2),
            "label": top_result['label']
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- 3. Audio Transcription (Whisper) ---
@api_view(['POST'])
def transcribe_audio(req):
    try:
        audio_file = req.FILES.get('audio')
        if not audio_file:
            return Response({"error": "No audio file provided"}, status=400)
            
        # Whisper needs a file path, so save temporarily
        temp_path = f"temp_{audio_file.name}"
        with open(temp_path, 'wb+') as destination:
            for chunk in audio_file.chunks():
                destination.write(chunk)
                
        model = load_whisper_model()
        result = model.transcribe(temp_path)
        
        # Cleanup
        os.remove(temp_path)
        
        return Response({
            "text": result["text"]
        })
    except Exception as e:
        if os.path.exists(f"temp_{audio_file.name}"):
            os.remove(f"temp_{audio_file.name}")
        return Response({"error": str(e)}, status=500)

# --- 4. Smart Auto-Reply (GenAI) ---
def load_genai_model():
    if MODELS["genai"] is None:
        print("Loading GenAI Model (Flan-T5)...")
        # flan-t5-base is good for instruction following
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
        model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base")
        MODELS["genai"] = (tokenizer, model)
    return MODELS["genai"]

@api_view(['POST'])
def generate_reply(req):
    try:
        description = req.data.get('description', '')
        status = req.data.get('status', 'Received')
        severity = req.data.get('severity', 'Medium')
        
        if not description or len(description) < 5:
            return Response({"reply": "Thank you for your report. We are investigating the issue and will update you shortly."})

        tokenizer, model = load_genai_model()
        
        # Prompt Engineering for edge cases
        prompt = f"""
        Act as a polite city officer. Write a short, professional response to a citizen.
        Issue: {description}
        Current Status: {status}
        Severity: {severity}
        
        Response:
        """
        
        inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        outputs = model.generate(inputs.input_ids, max_length=150, num_beams=4, early_stopping=True)
        reply = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        return Response({"reply": reply})
    except Exception as e:
        print(f"GenAI Error: {e}")
        return Response({"reply": "Thank you for reporting. We have received your issue."}, status=200) # Fallback

# --- 5. Resolution Time Predictor (Regression) ---
def load_regression_model():
    if MODELS["regressor"] is None:
        print("Training/Loading Regression Model...")
        from sklearn.ensemble import RandomForestRegressor
        import numpy as np
        
        # Mock Training Data (since we don't have historical DB access here easily)
        # Features: [Severity(1-10), OfficerLoad(0-20), Category(0-5)]
        # Target: Days to resolve
        X_train = np.array([
            [1, 0, 0], [10, 5, 0], [5, 2, 1], [8, 10, 1], [3, 1, 2],
            [9, 15, 2], [2, 0, 3], [7, 8, 3], [4, 3, 4], [6, 6, 4]
        ])
        y_train = np.array([1, 14, 3, 10, 2, 12, 1, 8, 4, 7]) # Days
        
        regr = RandomForestRegressor(n_estimators=100, random_state=42)
        regr.fit(X_train, y_train)
        MODELS["regressor"] = regr
    return MODELS["regressor"]

@api_view(['POST'])
def predict_resolution_time(req):
    try:
        severity = int(req.data.get('severity', 5))
        active_tasks = int(req.data.get('active_tasks', 0))
        category_map = {'Pothole': 0, 'Garbage': 1, 'Water': 2, 'Electricity': 3, 'Other': 4}
        category = category_map.get(req.data.get('category', 'Other'), 4)
        
        model = load_regression_model()
        
        # Predict
        prediction = model.predict([[severity, active_tasks, category]])
        days = max(1, round(prediction[0]))
        
        return Response({
            "estimated_days": days,
            "message": f"Based on current workload, estimated resolution in {days} days."
        })
    except Exception as e:
        return Response({"estimated_days": 3, "message": "Estimated resolution: 3 days (Default)"})

