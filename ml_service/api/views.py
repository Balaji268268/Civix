# --- IMPORTS ---
import logging
import json
import os
import google.generativeai as genai
from api.advanced_ai import (
    ask_gemini, 
    check_semantic_duplicate, 
    analyze_toxicity, 
    transcribe_audio, 
    generate_reply, 
    predict_resolution_time,
    GEMINI_API_KEY
)
from civix_ml.image_model import analyze_image_url, generate_caption
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Configure Logging
logger = logging.getLogger(__name__)

# --- API ENDPOINTS ---

@api_view(['GET'])
def health_check(request):
    return Response({"status": "healthy", "service": "Civix ML"})

@api_view(['POST'])
def predict_priority(request):
    try:
        txt = (request.data.get('title', '') + " " + request.data.get('description', '')).strip()
        if not txt: return Response({'priority': 'Low', 'confidence': 1.0})
        
        # Rule -1: Too Short = Low Priority
        if len(txt.split()) < 3:
             return Response({'priority': 'Low', 'confidence': 0.8, 'reason': 'Description too vague'})

        # Ask Gemini
        prompt = f"""
        Classify the priority of this civic issue.
        Issue: "{txt}"
        
        Priority Options:
        - High (Emergency, danger, life-threatening, fire, deep potholes, fraud, security)
        - Medium (Service disruption, billing, broken infrastructure, water leaks, traffic)
        - Low (General inquiry, feedback, routine maintenance, suggestions)
        
        Return ONLY a JSON: {{"priority": "High" or "Medium" or "Low", "confidence": 0.0 to 1.0}}
        """
        
        response_text = ask_gemini(prompt)
        if response_text:
             clean_text = response_text.replace('```json', '').replace('```', '')
             data = json.loads(clean_text)
             return Response(data)
            
        return Response({'priority': 'Medium', 'confidence': 0.0})

    except Exception as e:
        logger.error(f"Priority Error: {e}")
        return Response({'priority': 'Medium', 'confidence': 0.0, 'debug_error': str(e)})

@api_view(['POST'])
def detect_fake(request):
    try:
        title = request.data.get('title', '')
        desc = request.data.get('description', '')
        full_text = f"{title} {desc}"

        prompt = f"""
        Analyze if this civic issue report is FAKE, SPAM, GIBBERISH, or a PRANK.
        Report: "{full_text}"
        
        Return ONLY a JSON: {{"is_fake": boolean, "fake_confidence": 0.0 to 1.0, "reason": "string"}}
        """
        
        response_text = ask_gemini(prompt)
        if response_text:
             clean_text = response_text.replace('```json', '').replace('```', '')
             data = json.loads(clean_text)
             return Response(data)

        return Response({'is_fake': False, 'confidence': 0.0})

    except Exception as e:
        logger.error(f"Fake Detect Error: {e}")
        return Response({'is_fake': False, 'confidence': 0, 'debug_error': str(e)})

@api_view(['POST'])
def categorize(request):
    try:
        txt = request.data.get('title', '') + " " + request.data.get('description', '')
        
        prompt = f"""
        Categorize this civic issue.
        Issue: "{txt}"
        
        Categories: Roads, Electricity, Water, Sanitation, Traffic, Public Transport, Billing, Technical Support, Profile, Other
        
        Return ONLY a JSON: {{"category": "string", "confidence": 0.0 to 1.0}}
        """
        
        response_text = ask_gemini(prompt)
        if response_text:
             clean_text = response_text.replace('```json', '').replace('```', '')
             data = json.loads(clean_text)
             return Response(data)
             
        return Response({'category': 'General'})

    except Exception as e:
        logger.error(f"Categorize Error: {e}")
        return Response({'category': 'General'})

@api_view(['POST'])
def find_duplicates(request):
    # Delegate to the function in advanced_ai
    return check_semantic_duplicate(request)

@api_view(['POST'])
def get_embedding(request):
    try:
        text = request.data.get('text', '')
        if not text or not GEMINI_API_KEY: return Response({'embedding': []})
        
        # Use Gemini Embeddings
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document",
            title="Civic Issue"
        )
        return Response({'embedding': result['embedding']})
    except Exception as e:
        return Response({'embedding': []})

@api_view(['POST'])
def analyze_image(request):
    try:
        image_url = request.data.get('imageUrl')
        if not image_url: return Response({'tags': []})
        return Response(analyze_image_url(image_url))
    except:
        return Response({'tags': []})

@api_view(['POST'])
def generate_caption_view(request):
    try:
        image_url = request.data.get('imageUrl')
        if not image_url: return Response({'description': ''})
        caption = generate_caption(image_url)
        return Response({'description': caption})
    except Exception as e:
        logger.error(f"Generate Caption Error: {e}")
        return Response({'description': ''})
