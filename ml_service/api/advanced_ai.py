import os
import google.generativeai as genai
from rest_framework.decorators import api_view
from rest_framework.response import Response
import whisper
import logging

# Configure Logging
logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
# Global Model Cache (Only Whisper is local now)
MODELS = {
    "whisper": None,
    "gemini": None
}

def get_gemini_model():
    if not MODELS["gemini"] and GEMINI_API_KEY:
        # Use 'gemini-2.5-flash' as requested by user
        MODELS["gemini"] = genai.GenerativeModel('gemini-2.5-flash')
    return MODELS["gemini"]

def load_whisper_model():
    if MODELS["whisper"] is None:
        logger.info("Loading Whisper Model (Base)...")
        MODELS["whisper"] = whisper.load_model("base")
    return MODELS["whisper"]

# --- Helper: Generic Gemini Prompt ---
def ask_gemini(prompt, retries=1):
    model = get_gemini_model()
    if not model:
        return None
    try:
        response = model.generate_content(prompt)
        if response and response.text:
            return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
    return None

# --- 1. Semantic Duplicate Detection (Using Embeddings or Prompt) ---
@api_view(['POST'])
def check_semantic_duplicate(req):
    try:
        new_text = req.data.get('description', '')
        existing_texts = req.data.get('existing_reports', []) # List of strings
        
        if not new_text or not existing_texts:
            return Response({"is_duplicate": False, "score": 0.0})

        if not GEMINI_API_KEY:
             return Response({"is_duplicate": False, "score": 0.0, "reason": "No API Key"})

        # Efficient Prompt Approach (Cheaper/Faster than embedding 1000 items each time)
        # For large lists, you ideally want vector DB, but for this scale prompt is okay if list is small (<20)
        # If list is huge, we just take last 20.
        
        recent_reports = existing_texts[:20] 
        prompt = f"""
        Compare the new report with existing reports.
        New Report: "{new_text}"
        
        Existing Reports:
        {recent_reports}
        
        Is the New Report a duplicate of any existing one? 
        Return ONLY a JSON: {{"is_duplicate": boolean, "score": 0.0 to 1.0}}
        """
        
        response_text = ask_gemini(prompt)
        # Clean markdown json if any
        if response_text:
             import json
             clean_text = response_text.replace('```json', '').replace('```', '')
             data = json.loads(clean_text)
             return Response(data)
             
        return Response({"is_duplicate": False, "score": 0.0})

    except Exception as e:
        logger.error(f"Duplicate Check Error: {e}")
        return Response({"error": str(e)}, status=500)

# --- 2. Toxicity Analysis ---
@api_view(['POST'])
def analyze_toxicity(req):
    try:
        text = req.data.get('text', '')
        if not text: return Response({"error": "No text provided"}, status=400)
        
        prompt = f"""
        Analyze this text for toxicity, spam, or inappropriate content.
        Text: "{text}"
        
        Return ONLY a JSON: {{"is_toxic": boolean, "toxicity_score": 0.0 to 1.0, "label": "toxic" or "neutral" or "spam"}}
        """
        
        response_text = ask_gemini(prompt)
        if response_text:
             import json
             clean_text = response_text.replace('```json', '').replace('```', '')
             data = json.loads(clean_text)
             return Response(data)
             
        return Response({"is_toxic": False, "toxicity_score": 0.0, "label": "neutral"})

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- 3. Audio Transcription (Whisper - LOCAL) ---
@api_view(['POST'])
def transcribe_audio(req):
    # KEPT AS IS (User Requested Local Whisper)
    try:
        audio_file = req.FILES.get('audio')
        if not audio_file:
            return Response({"error": "No audio file provided"}, status=400)
            
        temp_path = f"temp_{audio_file.name}"
        with open(temp_path, 'wb+') as destination:
            for chunk in audio_file.chunks():
                destination.write(chunk)
                
        model = load_whisper_model()
        result = model.transcribe(temp_path)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return Response({"text": result["text"]})
    except Exception as e:
        # Cleanup
        if 'audio_file' in locals() and os.path.exists(f"temp_{audio_file.name}"):
            os.remove(f"temp_{audio_file.name}")
        logger.error(f"Whisper Error: {e}")
        return Response({"error": str(e)}, status=500)

# --- 4. Smart Auto-Reply ---
@api_view(['POST'])
def generate_reply(req):
    try:
        description = req.data.get('description', '')
        status = req.data.get('status', 'Received')
        
        if not description: return Response({"reply": ""})

        prompt = f"""
        Act as a polite city officer. Write a short, professional response to a citizen report.
        Issue: {description}
        Current Status: {status}
        
        Keep it under 2 sentences.
        """
        
        reply = ask_gemini(prompt)
        return Response({"reply": reply or "Thank you for the report."})
    except Exception as e:
        return Response({"reply": "Thank you for reporting."}, status=200)

# --- 5. Resolution Predictor ---
@api_view(['POST'])
def predict_resolution_time(req):
    try:
        # Simple heuristic fallback or Gemini guess
        severity = int(req.data.get('severity', 5))
        category = req.data.get('category', 'General')
        
        # We can ask Gemini for a "common sense" estimate based on category/severity
        prompt = f"""
        Estimate days to fix a civic issue.
        Category: {category}
        Severity (1-10): {severity}
        
        Return ONLY a JSON: {{"estimated_days": integer}}
        """
        response_text = ask_gemini(prompt)
        if response_text:
             import json
             clean_text = response_text.replace('```json', '').replace('```', '')
             data = json.loads(clean_text)
             return Response({"estimated_days": data.get("estimated_days", 3)})
             
        return Response({"estimated_days": 3})
    except:
        return Response({"estimated_days": 3})


