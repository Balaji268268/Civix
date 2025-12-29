
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input, decode_predictions
from tensorflow.keras.preprocessing import image
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
