"""
Civix NLP Preprocessing Pipeline — Shared TextBundle Producer
Every text model (category, spam, duplicate, matching) consumes this pipeline.
Deterministic, explainable, fast (p95 < 50ms).
"""

import re
import math
import unicodedata
import hashlib
from typing import Dict, Any, List, Set

# --- Lexicon & Patterns ---

PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}|\b\d{10}\b')
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

# Civic Domain Lexicon Multi-word keys -> Canonical Lexicon Tokens
DOMAIN_LEXICON: Dict[str, str] = {
    "open manhole": "open_manhole",
    "manhole cover": "open_manhole",
    "manhole is open": "open_manhole",
    "street light": "street_light",
    "streetlight": "street_light",
    "street lights": "street_light",
    "st light": "street_light",
    "light flickering": "light_flickering",
    "water log": "waterlogging",
    "water logging": "waterlogging",
    "waterlogging": "waterlogging",
    "burst pipe": "pipe_burst",
    "pipe burst": "pipe_burst",
    "leaking pipe": "pipe_burst",
    "water leak": "pipe_burst",
    "garbage dump": "illegal_dumping",
    "dumped garbage": "illegal_dumping",
    "garbage not collected": "garbage_not_collected",
    "power cut": "power_cut",
    "hanging wire": "hanging_wires",
    "hanging wires": "hanging_wires",
    "stray dog": "stray_animals",
    "stray dogs": "stray_animals",
    "stray cattle": "stray_cattle",
    "sewage leak": "sewage_overflow",
    "sewage overflow": "sewage_overflow",
    "drain clogged": "drain_clogged",
    "clogged drain": "drain_clogged",
    "traffic signal": "signal_fault",
    "signal not working": "signal_fault",
    "pothole": "pothole",
    "potholes": "pothole",
    "footpath broken": "footpath",
    "broken footpath": "footpath",
    "gas leak": "gas_leak",
    "illegal construction": "illegal_construction",
    "transformer spark": "transformer_issue",
}

URGENCY_TRIGGERS: Set[str] = {
    "urgent", "urgently", "emergency", "danger", "dangerous", "risk", "risky",
    "spark", "sparking", "fire", "smoke", "shock", "shocking", "accident",
    "fell", "fallen", "injured", "injury", "blood", "death", "hazard", "asap",
    "jaldi", "immediately", "critical"
}

NEGATION_TRIGGERS: Set[str] = {
    "no", "not", "never", "without", "none", "neither", "nahi", "na"
}

# --- Normalization & Cleaning ---

def normalize_text(text: str) -> str:
    """Coerce to string, apply NFKC unicode normalization, strip zero-width characters and collapse whitespace."""
    if text is None:
        return ""
    text = str(text)
    # NFKC Normalize
    text = unicodedata.normalize('NFKC', text)
    # Remove zero-width characters (ZWSP, ZWNJ, etc.)
    text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
    # Collapse multiple whitespace to single space
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def redact_pii(text: str) -> str:
    """Redact phone numbers and emails with [PHONE] and [EMAIL] tokens for ML safety."""
    text = EMAIL_REGEX.sub('[EMAIL]', text)
    text = PHONE_REGEX.sub('[PHONE]', text)
    return text

def calculate_entropy(text: str) -> float:
    """Calculate Shannon entropy of characters (bits per char)."""
    if not text:
        return 0.0
    freq: Dict[str, int] = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    total = len(text)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)
    return entropy

def extract_char_stats(text: str) -> Dict[str, float]:
    """Extract character composition metrics for statistical spam defense."""
    length = len(text)
    if length == 0:
        return {
            "length": 0,
            "entropy": 0.0,
            "digit_ratio": 0.0,
            "symbol_ratio": 0.0,
            "uppercase_ratio": 0.0,
            "whitespace_ratio": 0.0
        }
    digits = sum(1 for c in text if c.isdigit())
    uppers = sum(1 for c in text if c.isupper())
    spaces = sum(1 for c in text if c.isspace())
    symbols = sum(1 for c in text if not c.isalnum() and not c.isspace())
    
    return {
        "length": length,
        "entropy": round(calculate_entropy(text), 4),
        "digit_ratio": round(digits / length, 4),
        "symbol_ratio": round(symbols / length, 4),
        "uppercase_ratio": round(uppers / length, 4),
        "whitespace_ratio": round(spaces / length, 4)
    }

def extract_lexicon_matches(text_lower: str) -> List[str]:
    """Match domain-specific multi-word phrases and tokens."""
    matches = []
    for phrase, canonical in DOMAIN_LEXICON.items():
        if phrase in text_lower:
            matches.append(canonical)
    return list(set(matches))

def simple_lemmatize(word: str) -> str:
    """Lightweight deterministic lemmatizer for common civic words."""
    w = word.lower()
    if w.endswith('holes'):
        return w[:-1] # potholes -> pothole
    if w.endswith('lights'):
        return w[:-1]
    if w.endswith('pipes'):
        return w[:-1]
    if w.endswith('wires'):
        return w[:-1]
    if w.endswith('drains'):
        return w[:-1]
    if w.endswith('ing') and len(w) > 5:
        # e.g., sparking -> spark, leaking -> leak
        if w.endswith('kking'):
            return w[:-4]
        if w.endswith('tting'):
            return w[:-4]
        return w[:-3]
    if w.endswith('ed') and len(w) > 4:
        return w[:-2]
    if w.endswith('s') and not w.endswith('ss') and len(w) > 3:
        return w[:-1]
    return w

def process_text_bundle(raw_text: str, title: str = "") -> Dict[str, Any]:
    """
    Produce a complete, normalized TextBundle dictionary consumed by all models.
    """
    combined = (f"{title} {raw_text}" if title else raw_text).strip()
    norm_text = normalize_text(combined)
    redacted = redact_pii(norm_text)
    
    # Tokenization
    raw_tokens = re.findall(r'\b[a-zA-Z0-9_-]+\b', redacted.lower())
    lemmas = [simple_lemmatize(t) for t in raw_tokens]
    
    # Text norm without stop-words / punctuation
    common_stopwords = {'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were', 'it', 'this', 'that'}
    meaningful_lemmas = [lem for lem in lemmas if lem not in common_stopwords and len(lem) > 1]
    text_norm = " ".join(meaningful_lemmas)
    
    # Domain Lexicon
    lower_norm = norm_text.lower()
    lexicon_keys = extract_lexicon_matches(lower_norm)
    
    # Urgency & Negation
    urgency_hits = [w for w in raw_tokens if w in URGENCY_TRIGGERS]
    urgency_score = min(1.0, len(urgency_hits) * 0.35 + (0.3 if any(c in combined for c in ['🚨', '⚠️', '🔥', '⚡']) else 0.0))
    has_negation = any(w in NEGATION_TRIGGERS for w in raw_tokens)
    
    # Stats
    char_stats = extract_char_stats(norm_text)
    token_count = len(raw_tokens)
    unique_tokens = len(set(raw_tokens))
    ttr = round(unique_tokens / token_count, 4) if token_count > 0 else 0.0
    
    # Idempotency hash
    content_hash = hashlib.sha256(text_norm.encode('utf-8')).hexdigest()
    
    return {
        "text_raw": raw_text,
        "text_normalized": norm_text,
        "text_redacted": redacted,
        "text_norm": text_norm,
        "tokens": raw_tokens,
        "lemmas": lemmas,
        "lexicon_keys": lexicon_keys,
        "has_negation": has_negation,
        "urgency_score": round(urgency_score, 2),
        "char_stats": char_stats,
        "word_stats": {
            "token_count": token_count,
            "unique_tokens": unique_tokens,
            "ttr": ttr
        },
        "content_hash": content_hash
    }
