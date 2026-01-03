
# import tensorflow as tf (Lazy load)
# from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input, decode_predictions (Lazy load)
# from tensorflow.keras.preprocessing import image (Lazy load)
import numpy as np
import requests
from io import BytesIO
from PIL import Image

# Lazy loader to avoid high memory usage on startup
_model = None

def get_model():
    global _model
    if _model is None:
        print("Loading MobileNetV2 Model...")
        from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2
        _model = MobileNetV2(weights='imagenet')
    return _model

def analyze_image_url(image_url):
    try:
        model = get_model()
        
        # Download image
        response = requests.get(image_url)
        img = Image.open(BytesIO(response.content))
        img = img.resize((224, 224))
        
        # Preprocess
        from tensorflow.keras.preprocessing import image
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions
        
        x = image.img_to_array(img)
        x = np.expand_dims(x, axis=0)
        x = preprocess_input(x)
        
        # Predict
        preds = model.predict(x)
        decoded = decode_predictions(preds, top=3)[0]
        
        tags = [label for (_, label, prob) in decoded]
        return {
            'tags': tags,
            'is_safe': True, # Placeholder for explicit content check
            'confidence': float(decoded[0][2])
        }
    except Exception as e:
        print(f"Image Analysis Error: {e}")
        return {'tags': [], 'is_safe': True, 'confidence': 0}

# Stub for Missing Function
def generate_caption(image_url):
    # BLIP or other captioning models are too heavy for Free Tier CPU.
    # Returning a placeholder to prevent crash.
    return "AI Captioning unavailable in Lite Mode."
