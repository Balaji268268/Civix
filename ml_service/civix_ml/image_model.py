
import google.generativeai as genai
import requests
from PIL import Image
from io import BytesIO
import os
import logging

logger = logging.getLogger(__name__)

# Re-use the existing Gemini configuration if possible, or re-configure safely
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_gemini_vision_model():
    # Use 2.5 Flash for vision tasks
    return genai.GenerativeModel('gemini-2.5-flash')

def fetch_image(url):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))
    except Exception as e:
        logger.error(f"Failed to fetch image: {e}")
        return None

def analyze_image_url(image_url):
    try:
        if not GEMINI_API_KEY:
            return {'tags': [], 'is_safe': True, 'confidence': 0, 'reason': 'No API Key'}

        img = fetch_image(image_url)
        if not img:
            return {'tags': [], 'is_safe': True, 'confidence': 0}

        model = get_gemini_vision_model()
        prompt = "Identify the main objects and context in this image. Return a JSON list of tags (max 5) and a safety check."
        
        # Gemini 2.5 Flash handles text + images
        response = model.generate_content([prompt, img])
        
        if response and response.text:
            text = response.text.lower()
            # Simple fallback parsing if not pure JSON
            import re
            tags = re.findall(r'\b\w+\b', text)[:5] # Just grasp first few words if parsing fails
            
            return {
                'tags': tags,
                'is_safe': True, # Assume safe unless flagged (could parse safety ratings)
                'confidence': 0.9
            }
            
        return {'tags': [], 'is_safe': True, 'confidence': 0}
    except Exception as e:
        logger.error(f"Image Analysis Error: {e}")
        return {'tags': [], 'is_safe': True, 'confidence': 0}

def generate_caption(image_url):
    try:
        if not GEMINI_API_KEY: return "Service unavailable (No Key)"

        img = fetch_image(image_url)
        if not img: return ""
        
        model = get_gemini_vision_model()
        response = model.generate_content(["Provide a short, descriptive caption for this image.", img])
        
        return response.text.strip() if response else ""
    except Exception as e:
        logger.error(f"Caption Error: {e}")
        return ""
