# --- IMPORTS ---
import logging
import json
import os
import google.generativeai as genai
from api.advanced_ai import (
    ask_gemini, 
    check_semantic_duplicate, 
    analyze_toxicity, 
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

# --- IMAGE VALIDATION FOR SPAM DETECTION ---
@api_view(['POST'])
def validate_issue_image(request):
    """
    Validate if uploaded image is relevant to civic issues.
    Uses Gemini Vision for smart multimodal classification.
    Prevents spam images (memes, selfies, food) from being submitted.
    """
    image_url = request.data.get('imageUrl')
    category = request.data.get('category', 'General')
    
    if not image_url:
        return Response({'is_valid': False, 'reason': 'No image provided'})
    
    if not GEMINI_API_KEY:
        logger.warning("Gemini API key not configured - image validation unavailable")
        return Response({
            'is_valid': True,
            'confidence': 0.0,
            'reason': 'Validation service not configured',
            'requires_manual_review': True
        })
    
    try:
        # Fetch image using existing utility
        from civix_ml.image_model import fetch_image
        img = fetch_image(image_url)
        
        if not img:
            return Response({'is_valid': False, 'reason': 'Failed to load image'})
        
        # Use Gemini Vision (same model already in use)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        Analyze this image for a civic issue report (category: {category}).
        
        Determine if the image is VALID or SPAM:
        
        VALID = Shows actual civic infrastructure problems:
        - Potholes, road damage, cracks
        - Broken public facilities (streetlights, benches, signs)
        - Water/sewage leaks
        - Garbage accumulation
        - Damaged sidewalks, curbs
        - Any real public infrastructure issue
        
        SPAM = Irrelevant content:
        - Selfies, portraits, group photos
        - Food, meals, restaurants
        - Memes, screenshots, text-only images
        - Indoor scenes (unless clearly public building issue)
        - Random objects unrelated to civic issues
        - Pets, animals (unless stray/safety hazard)
        
        Return ONLY this JSON (no markdown):
        {{
            "is_valid": boolean,
            "confidence": 0.0 to 1.0,
            "reason": "brief explanation",
            "detected_content": "what you see in the image"
        }}
        """
        
        response = model.generate_content([prompt, img])
        
        # Parse response
        text = response.text.strip()
        # Remove markdown fences if present
        text = text.replace('```json', '').replace('```', '').strip()
        data = json.loads(text)
        
        return Response({
            'is_valid': data.get('is_valid', True),
            'confidence': data.get('confidence', 0.5),
            'reason': data.get('reason', ''),
            'detected_content': data.get('detected_content', ''),
            'method': 'GEMINI_VISION'
        })
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response: {e}, Response: {text if 'text' in locals() else 'N/A'}")
        return Response({
            'is_valid': True,
            'confidence': 0.0,
            'reason': 'Validation parsing error',
            'requires_manual_review': True
        })
    except Exception as e:
        logger.error(f"Image validation error: {e}")
        # Graceful degradation - allow but flag for manual review
        return Response({
            'is_valid': True,
            'confidence': 0.0,
            'reason': 'Validation service unavailable',
            'requires_manual_review': True
        })

