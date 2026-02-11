import os
import google.generativeai as genai
from rest_framework.decorators import api_view
from rest_framework.response import Response
import logging
from dotenv import load_dotenv

# Configure Logging
logger = logging.getLogger(__name__)

# Load Env from Backend
load_dotenv(os.path.join(os.path.dirname(__file__), '../../backend/.env'))

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_gemini_model():
    if GEMINI_API_KEY:
        return genai.GenerativeModel('gemini-1.5-flash')
    logger.error("Gemini Model Init Failed: GEMINI_API_KEY is not set or empty.")
    return None

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

# --- 3. Audio Transcription (Gemini 2.5 Flash Native Audio) ---
@api_view(['POST'])
def transcribe_audio(req):
    """
    Transcribe audio using Gemini 2.5 Flash native audio capability.
    Free and unlimited - no Whisper dependency needed.
    """
    try:
        audio_file = req.FILES.get('audio')
        if not audio_file:
            return Response({"error": "No audio file provided"}, status=400)
        
        if not GEMINI_API_KEY:
            return Response({"error": "Gemini API not configured"}, status=500)
        
        # Save temporary file
        temp_path = f"temp_{audio_file.name}"
        with open(temp_path, 'wb+') as destination:
            for chunk in audio_file.chunks():
                destination.write(chunk)
        
        try:
            # Upload audio file to Gemini
            audio_upload = genai.upload_file(temp_path)
            
            # Use Gemini 2.5 Flash with native audio
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = """
            Transcribe this audio accurately. Return ONLY the transcribed text, nothing else.
            If the audio contains a civic complaint or issue report, transcribe it verbatim.
            """
            
            response = model.generate_content([prompt, audio_upload])
            
            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            transcribed_text = response.text.strip()
            
            return Response({"text": transcribed_text})
            
        except Exception as e:
            # Cleanup on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
            
    except Exception as e:
        logger.error(f"Gemini Audio Transcription Error: {e}")
        return Response({"error": f"Transcription failed: {str(e)}"}, status=500)

# --- 4. Smart Auto-Reply ---
@api_view(['POST'])
def generate_reply(req):
    try:
        description = req.data.get('description', '')
        status = req.data.get('status', 'Received')
        
        if not description: return Response({"reply": ""})

        # IMPROVED PROMPT for variety and empathy
        prompt = f"""
        You are a helpful AI assistant for the Civix city management platform.
        Your goal is to draft a polite, reassuring, and specific response to a citizen's issue report.
        
        Issue Report: "{description}"
        Current Status: "{status}"
        
        Instructions:
        1. Acknowledge the specific issue (mention keywords from the report).
        2. Explain what the current status "{status}" means (e.g., 'Received' means we are reviewing it, 'In Progress' means a team is on it).
        3. Be professional but empathetic.
        4. Keep it under 50 words.
        
        Draft the reply now.
        """
        
        try:
            reply = ask_gemini(prompt)
            if reply:
                return Response({"reply": reply})
            else:
                logger.warning("Gemini returned empty reply, using fallback.")
        except Exception as gemini_error:
            logger.error(f"Gemini generation failed: {gemini_error}")

        # Fallback if AI fails
        return Response({"reply": f"Thank you for your report. We have marked this as '{status}' and will look into it shortly."})
        
    except Exception as e:
        logger.error(f"Generate Reply API Error: {e}")
        return Response({"reply": "Thank you for reporting. We will update you soon."}, status=200)

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


