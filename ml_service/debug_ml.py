try:
    print("1. Importing CrossEncoder...")
    from sentence_transformers import CrossEncoder
    print("   Success.")
    
    print("2. Loading Model...")
    model = CrossEncoder('cross-encoder/nli-distilroberta-base')
    print("   Success. Model loaded.")
    
    print("3. Predicting...")
    scores = model.predict([('test issue', 'High Priority')])
    print(f"   Success. Score: {scores}")

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
