import time
import unittest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from civix_ml.pipelines.text import (
    normalize_text,
    redact_pii,
    calculate_entropy,
    extract_char_stats,
    extract_lexicon_matches,
    process_text_bundle
)

class TestTextPipeline(unittest.TestCase):
    def test_normalize_unicode_and_whitespace(self):
        raw = "  Deep   pothole \u200B on \t M.G. Road \n near school   "
        normalized = normalize_text(raw)
        self.assertEqual(normalized, "Deep pothole on M.G. Road near school")

    def test_pii_redaction(self):
        text = "Call me at +91 9876543210 or email citizen.support@test.gov regarding the open manhole."
        redacted = redact_pii(text)
        self.assertIn("[PHONE]", redacted)
        self.assertIn("[EMAIL]", redacted)
        self.assertNotIn("9876543210", redacted)
        self.assertNotIn("citizen.support@test.gov", redacted)

    def test_lexicon_extraction(self):
        text = "there is a dangerous open manhole and street light is flickering on the road"
        matches = extract_lexicon_matches(text)
        self.assertIn("open_manhole", matches)

    def test_urgency_detection(self):
        bundle_urgent = process_text_bundle("🚨 Sparking wires fell on the road! Urgent danger of electric shock!")
        self.assertGreaterEqual(bundle_urgent["urgency_score"], 0.6)
        self.assertFalse(bundle_urgent["has_negation"])

        bundle_normal = process_text_bundle("Request to add a bench in the neighborhood park.")
        self.assertLess(bundle_normal["urgency_score"], 0.4)

    def test_entropy_and_spam_features(self):
        gibberish = "asdfghjklqwertyuiopzxcvbnm"
        rep_spam = "water water water water water water water water"
        
        bundle_gibberish = process_text_bundle(gibberish)
        bundle_rep = process_text_bundle(rep_spam)
        
        self.assertGreater(bundle_gibberish["char_stats"]["entropy"], 0)
        self.assertLess(bundle_rep["word_stats"]["ttr"], 0.25)

    def test_pipeline_benchmark(self):
        sample_text = "Huge pothole filled with dirty water near bus stand junction. 9876543210 please repair asap!"
        start = time.time()
        for _ in range(100):
            bundle = process_text_bundle(sample_text)
        duration_ms = (time.time() - start) * 1000 / 100
        print(f"\nTextBundle average latency: {duration_ms:.3f}ms")
        self.assertLess(duration_ms, 50.0) # Gate: p95 < 50ms

if __name__ == '__main__':
    unittest.main()
