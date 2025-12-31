from rest_framework.decorators import api_view
from rest_framework.response import Response
from sentence_transformers import CrossEncoder, SentenceTransformer, util
import numpy as np
import re
import logging
from civix_ml.image_model import analyze_image_url

# Configure Logging
logger = logging.getLogger(__name__)

# --- HYBRID MODEL ENGINE ---
# Lazy load global variables
_BI_ENCODER = None
_CROSS_ENCODER = None

def get_bi_encoder():
    global _BI_ENCODER
    if _BI_ENCODER is None:
        try:
            print("1. Lazy Loading Bi-Encoder (all-MiniLM-L6-v2)...")
            _BI_ENCODER = SentenceTransformer('all-MiniLM-L6-v2')
            print("   [✓] Bi-Encoder Ready.")
        except Exception as e:
             logger.error(f"Bi-Encoder Load Failed: {e}")
    return _BI_ENCODER

def get_cross_encoder():
    global _CROSS_ENCODER
    if _CROSS_ENCODER is None:
        try:
            print("2. Lazy Loading Cross-Encoder (nli-distilroberta-base)...")
            # This model outputs 3 scores: Contradiction, Entailment, Neutral
            _CROSS_ENCODER = CrossEncoder('cross-encoder/nli-distilroberta-base')
            print("   [✓] Cross-Encoder Ready.")
        except Exception as e:
            logger.error(f"Cross-Encoder Load Failed: {e}")
    return _CROSS_ENCODER

# --- DEFINITIONS ---

PRIORITY_LABELS = [
    "High Priority: Emergency, danger, life-threatening, fire, deep potholes, financial fraud, security breach.",
    "Medium Priority: Service disruption, billing usage, broken infrastructure, water leaks, traffic jam.",
    "Low Priority: General inquiry, feedback, routine maintenance, suggestions, cosmetic issues."
]
PRIORITY_KEYS = ["High", "Medium", "Low"]

CATEGORIES_LABELS = [
    "Roads: Potholes, broken pavement, street damage.",
    "Electricity: Power outage, voltage fluctuation, blackout.",
    "Water: Leaking pipes, sewage, contaminated water, no supply.",
    "Sanitation: Garbage, waste, cleaning, dirty streets.",
    "Traffic: Jam, signals, blocking, parking.",
    "Public Transport: Bus, metro, train delays, routing.",
    "Billing: Incorrect bill, overcharge, payment issues, refund, deduction.",
    "Technical Support: App crash, login, profile errors, bugs.",
    "Profile: Personal details, address, phone number updates.",
    "Other: Miscellaneous queries."
]
CATEGORIES_KEYS = ["Roads", "Electricity", "Water", "Sanitation", "Traffic", "Public Transport", "Billing", "Technical Support", "Profile", "Other"]

# --- HELPER: GIBBERISH DETECTION (Layer 1) ---
def is_likely_gibberish(text):
    if not text or len(text) < 3: return True
    if re.search(r'(.)\1{4,}', text): return True 
    unique_chars = len(set(text.lower()))
    if len(text) > 10 and unique_chars < 4: return True 
    smash_patterns = [r'asdf', r'qwer', r'zxcv', r'hjkl']
    for pat in smash_patterns:
        if re.search(pat, text.lower()): return True
    
    # --- PRO: SPAM & PRANK FILTERS ---
    spam_triggers = [
        r'free money', r'click here', r'subscribe', r'buy now', r'discount', 
        r'lottery', r'winner', r'crypto', r'dating', r'casino'
    ]
    for trig in spam_triggers:
        if re.search(trig, text.lower()): return True

    prank_triggers = [
        r'alien', r'zombie', r'ghost', r'monster', r'invasion', 
        r'ufo', r'superman', r'batman', r'joke', r'prank', r'stuck in tree'
    ]
    for trig in prank_triggers:
        if re.search(trig, text.lower()): return True

    return False

# --- API ENDPOINTS ---

# --- HELPER: KEYWORD BOOSTING ---
def check_keyword_boost(text):
    critical_keywords = ['fire', 'blast', 'explosion', 'murder', 'blood', 'accident', 'collision', 'death', 'dead', 'collapse', 'killed', 'injured']
    text_lower = text.lower()
    for kw in critical_keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
            return True
    return False

@api_view(['POST'])
def predict_priority(request):
    try:
        txt = (request.data.get('title', '') + " " + request.data.get('description', '')).strip()
        if not txt: return Response({'priority': 'Low', 'confidence': 1.0})
        
        # Rule -1: Too Short = Low Priority (Prevent hallucinations)
        if len(txt.split()) < 3:
             return Response({'priority': 'Low', 'confidence': 0.8, 'reason': 'Description too vague'})

        # Rule 0: Keyword Boosting (Override Model)
        if check_keyword_boost(txt):
             return Response({'priority': 'High', 'confidence': 1.0, 'reason': 'Critical keyword detected'})

        cross_model = get_cross_encoder()
        bi_model = get_bi_encoder()

        if cross_model:
            pairs = [(txt, label) for label in PRIORITY_LABELS]
            scores = cross_model.predict(pairs) 
            # scores is (N, 3). We want Entailment (Index 1) for roberta-nli
            entailment_scores = scores[:, 1] 
            best_idx = np.argmax(entailment_scores)
            
            # Sigmoid
            confidence = float(1 / (1 + np.exp(-entailment_scores[best_idx])))
            
            return Response({'priority': PRIORITY_KEYS[best_idx], 'confidence': confidence})
            
        elif bi_model: 
            emb = bi_model.encode(txt)
            proto_embs = bi_model.encode(PRIORITY_LABELS)
            scores = util.cos_sim(emb, proto_embs)[0]
            best_idx = np.argmax(scores)
            return Response({'priority': PRIORITY_KEYS[best_idx], 'confidence': float(scores[best_idx])})
            
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

        if is_likely_gibberish(full_text):
            return Response({
                'is_fake': True, 
                'fake_confidence': 0.99, 
                'reason': 'Detected keyboard smashing or gibberish.'
            })

        cross_model = get_cross_encoder()
        bi_model = get_bi_encoder()

        if cross_model:
            # Enhanced Spam Pairs
            spam_pairs = [
                (full_text, "This is a detailed, valid, and serious civic issue report."),
                (full_text, "This is a fake, spam, test, glitch, or nonsense report."),
                (full_text, "This contains promotional content, ads, or irrelevant solicitation."),
                (full_text, "This described an impossible, absurd, or prank event (e.g. aliens).")
            ]
            scores = cross_model.predict(spam_pairs)
            
            valid_score = scores[0][1]
            fake_score = max(scores[1][1], scores[2][1], scores[3][1]) # Take max of "bad" categories
            
            is_semantically_fake = fake_score > valid_score
            fake_conf = float(1 / (1 + np.exp(-fake_score)))
            
            # Thresholding
            final_verdict = is_semantically_fake and fake_conf > 0.4
            
            return Response({
                'is_fake': bool(final_verdict), 
                'fake_confidence': fake_conf,
                'reason': 'Semantic analysis suggests spam or invalid content.' if final_verdict else 'Valid report.'
            })
            
        elif bi_model:
            emb = bi_model.encode(full_text)
            spam_emb = bi_model.encode(["fake nonsense glitch test spam garbage ads promotion"])
            score = float(util.cos_sim(emb, spam_emb)[0][0])
            return Response({'is_fake': score > 0.5, 'fake_confidence': score})
            
        return Response({'is_fake': False, 'confidence': 0.0})

    except Exception as e:
        logger.error(f"Fake Detect Error: {e}")
        return Response({'is_fake': False, 'confidence': 0, 'debug_error': str(e)})

@api_view(['POST'])
def categorize(request):
    try:
        txt = request.data.get('title', '') + " " + request.data.get('description', '')
        
        cross_model = get_cross_encoder()
        bi_model = get_bi_encoder()
        
        if cross_model:
            pairs = [(txt, l) for l in CATEGORIES_LABELS]
            scores = cross_model.predict(pairs)
            entailment_scores = scores[:, 1]
            best_idx = np.argmax(entailment_scores)
            confidence = float(1 / (1 + np.exp(-entailment_scores[best_idx])))

            # Fallback for low confidence
            if confidence < 0.3:
                return Response({'category': 'Other', 'confidence': confidence, 'reason': 'Low confidence'})

            return Response({'category': CATEGORIES_KEYS[best_idx], 'confidence': confidence})
            
        elif bi_model:
            emb = bi_model.encode(txt)
            cat_embs = bi_model.encode(CATEGORIES_LABELS) 
            scores = util.cos_sim(emb, cat_embs)[0]
            best_idx = np.argmax(scores)
            return Response({'category': CATEGORIES_KEYS[best_idx], 'confidence': float(scores[best_idx])})
            
        return Response({'category': 'General'})

    except Exception as e:
        logger.error(f"Categorize Error: {e}")
        return Response({'category': 'General'})

@api_view(['POST'])
def find_duplicates(request):
    try:
        bi_model = get_bi_encoder()
        cross_model = get_cross_encoder()

        if not bi_model: return Response({'duplicates': []})
        
        candidate_title = request.data.get('candidate', {}).get('title', '')
        candidate_desc = request.data.get('candidate', {}).get('description', '')
        existing = request.data.get('existing_issues', [])
        
        if not existing: return Response({'duplicates': []})

        # Step 1: Retrieval (Bi-Encoder)
        cand_emb = bi_model.encode(candidate_title)
        existing_titles = [i.get('title', '') for i in existing]
        title_embs = bi_model.encode(existing_titles)
        
        cos_scores = util.cos_sim(cand_emb, title_embs)[0]
        top_k_indices = [i for i, s in enumerate(cos_scores) if s > 0.4]
        
        potential_dups = []
        if cross_model and top_k_indices:
            # Step 2: Reranking (Cross-Encoder)
            rerank_pairs = []
            for idx in top_k_indices:
                rerank_pairs.append((candidate_desc, existing[idx].get('description', '')))
                
            if rerank_pairs:
                scores = cross_model.predict(rerank_pairs)
                # scores is (N, 3)
                
                for local_idx, scores_arr in enumerate(scores):
                    entailment_score = scores_arr[1]
                    original_idx = top_k_indices[local_idx]
                    
                    if entailment_score > 0.0: # Logit > 0 means prob > 0.5
                         potential_dups.append({
                            'issue_id': existing[original_idx].get('_id') or existing[original_idx].get('complaintId'),
                            'title': existing[original_idx].get('title'),
                            'score': float(1 / (1 + np.exp(-entailment_score)))
                        })
        
        elif not cross_model and top_k_indices:
             for idx in top_k_indices:
                 if cos_scores[idx] > 0.75:
                     potential_dups.append({
                        'issue_id': existing[idx].get('_id'),
                        'title': existing[idx].get('title'),
                        'score': float(cos_scores[idx])
                    })

        return Response({'duplicates': potential_dups})

    except Exception as e:
        logger.error(f"Duplicate Check Error: {e}")
        return Response({'duplicates': []})

@api_view(['POST'])
def get_embedding(request):
    try:
        text = request.data.get('text', '')
        bi_model = get_bi_encoder()
        if bi_model and text:
            vec = bi_model.encode(text).tolist() 
            return Response({'embedding': vec})
        return Response({'embedding': []})
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
