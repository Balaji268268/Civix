#!/usr/bin/env python3
"""
generate_spam_corpus.py — Deterministic, seeded generator for the D2
(spam_text) dataset: the fake/negative class plus hard-negative boundary cases.

Why synthetic here (see docs/datasets/DATASET_PLAN.md §D2):
  No public corpus of "fake civic complaints" exists. The realistic negative
  class has two very different populations:
    a) NON-LANGUAGE  : keyboard mash, random chars, repeated tokens, digit noise
    b) PSEUDO-LANGUAGE: scam/spam templates that read like language
  We generate both with full control (family, seed, mix ratio) so the detector
  can be evaluated per-family, and the same generator can re-emit the exact
  same corpus on re-runs (seed-pinned) for reproducibility.

Stdlib only. Usage:
  python3 generate_spam_corpus.py --total 4000 --out ../datasets/processed/spam_text_v1.jsonl \
      --seed 42

Output rows follow the flat schema (is_fake=1 for spam families, plus
is_fake=0 'boundary' rows that are near-real complaints with light corruption —
the dangerous cases where entropy/TTR rules over-fire).
"""
import argparse
import hashlib
import json
import os
import random
import string

MAPPING_VERSION = 1

# ---------------- Family generators ----------------

QWERTY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]

def gen_random_ascii(rng, n_words=6):
    n = rng.randint(10, 40)
    alphabet = string.ascii_letters + string.digits + " .,!"
    return "".join(rng.choice(alphabet) for _ in range(n))

def gen_keyboard_mash(rng, n_words=5):
    out = []
    for _ in range(rng.randint(3, 8)):
        row = rng.choice(QWERTY_ROWS)
        start = rng.randint(0, len(row) - 3)
        run = row[start:start + rng.randint(3, 10)]
        if rng.random() < 0.25:
            row2 = rng.choice(QWERTY_ROWS)
            run = run + row2[:rng.randint(1, 4)]
        out.append(run)
    return " ".join(out)

def gen_repeated_word(rng, n_words=10):
    word = rng.choice(["water", "pothole", "garbage", "light", "road", "fix",
                       "urgent", "help", "no", "stop", "civic", "complaint"])
    n = rng.randint(6, 40)
    sep = rng.choice([" ", " ", " ", ",", "  "])
    return (word + sep) * n

def gen_repeated_char(rng, n_words=10):
    base = rng.choice(["a", "s", "1", "2", "0", "x", "@", "12", "45", "qw"])
    return base * rng.randint(15, 120)

LOREM_WORDS = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
               "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore",
               "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam",
               "quis", "nostrud", "exercitation", "ullamco", "laboris"]

def gen_lorem(rng, n_words=12):
    n = rng.randint(8, 30)
    return " ".join(rng.choice(LOREM_WORDS) for _ in range(n))

def gen_mixed_script(rng, n_words=8):
    """Random codepoint mash across Latin / Devanagari / Telugu blocks."""
    blocks = [
        range(0x0041, 0x005B),      # Latin A-Z
        range(0x0905, 0x093F),      # Devanagari
        range(0x0C05, 0x0C4E),      # Telugu
    ]
    n = rng.randint(10, 50)
    return "".join(chr(rng.choice(rng.choice(blocks))) for _ in range(n))

def gen_symbol_digit(rng, n_words=6):
    parts = []
    for _ in range(rng.randint(3, 10)):
        kind = rng.random()
        if kind < 0.5:
            parts.append("".join(rng.choice(string.digits) for _ in range(rng.randint(4, 12))))
        else:
            parts.append("".join(rng.choice("!@#$%^&*?-_") for _ in range(rng.randint(3, 10))))
    sep = rng.choice(["", " ", ""])
    return sep.join(parts) if parts else "12345"

SCAM_TEMPLATES = [
    "CONGRATULATIONS! You have won a FREE trip. Click now: {url}",
    "Your Civix account will be deleted in 24h. Verify here: {url}",
    "Bank alert: suspicious login detected. Reset password immediately {url}",
    "You are selected for a government cash benefit. Apply: {url}",
    "URGENT OTP required: {otp}. Do not share. Verify at {url}",
    "Crypto investment opportunity — 10x returns guaranteed. DM us.",
    "Cheap medicines available. WhatsApp 9xxxxxxx for catalog.",
    "EARN FROM HOME. No experience needed. Sign up: {url}",
    "Your electricity bill payment failed. Re-pay now to avoid disconnection: {url}",
    "Lottery winner! Claim your prize within 6 hours: {url}",
    "Free movie tickets for you and a friend. Register: {url}",
    "We need you to verify your mobile number. Send OTP to confirm.",
    "Buy watches cheap! Best rates, no questions. Call now.",
    "Part-time job offer — work 2 hrs/day, earn big. Join: {url}",
    "Dating site for singles in your city. Subscribe free: {url}",
    "This is a test message. Ignore. Forward to 10 friends.",
    "SUBSCRIBE FOR FREE!!! AMAZING OFFER!!! CLICK CLICK CLICK",
    "Your parcel is stuck at customs. Pay duty now: {url}",
    "AI robot: I am not real. This is a spam sample {i}.",
    "GOLD RATE today. Call for investment tips. 100% profit.",
]
FAKE_URLS = ["http://bit.ly/{n}", "https://t.me/{n}", "www.free-offer-{n}.xyz", "bit.ly/{n}"]

def gen_scam_template(rng, n_words=10):
    t = rng.choice(SCAM_TEMPLATES)
    return (t.replace("{url}", rng.choice(FAKE_URLS).format(n=rng.randint(100, 999)))
             .replace("{otp}", str(rng.randint(100000, 999999)))
             .replace("{i}", str(rng.randint(1, 999))))

# ---------------- Hard negatives (near-real complaints, lightly corrupted) ----------------

REAL_FRAMES = [
    ("electric", "The street light near {loc} is not working since last week, please fix it soon."),
    ("roads", "There is a deep pothole on {loc}, a two-wheeler tyre got punctured yesterday."),
    ("sanitation", "Garbage is not being collected from {loc} for three days now, bad smell."),
    ("water", "Water supply at {loc} is very low, we get water only for 2 hours."),
    ("traffic", "Traffic signal at {loc} is blinking, vehicles crossing wrongly, very dangerous."),
    ("roads", "Manhole cover is open at {loc} near the footpath, children play there."),
    ("electric", "Hanging wires near {loc} are sparking at night, please arrange urgent repair."),
    ("sanitation", "Drain is overflowing at {loc}, water coming into the lane with bad smell."),
    ("park", "Broken bench and dirty washroom at {loc} park, needs cleaning and repair."),
    ("transport", "Bus stop at {loc} is damaged, no shelter for commuters in rain."),
]
LOCATIONS = ["MG Road", "Bus Stand junction", "Old Market", "Hospital road", "Railway station area",
             "School gate", "Lake view road", "Temple street", "New Colony main road", "Industrial area entrance"]

def corrupt_mild(rng, text):
    """Light corruption: typos/case/fragment — must stay RECOGNIZABLY real."""
    ops = rng.sample(["typo", "caps", "fragment", "abbrev"], k=rng.randint(1, 2))
    for op in ops:
        if op == "typo" and len(text) > 20:
            i = rng.randint(3, len(text) - 3)
            ch = rng.choice("aeioustnrs")
            text = text[:i] + ch + text[i + 1:]
        elif op == "caps":
            words = text.split()
            if words:
                i = rng.randrange(len(words))
                words[i] = words[i].upper()
                text = " ".join(words)
        elif op == "fragment":
            words = text.split()
            if len(words) > 8:
                text = " ".join(rng.sample(words, k=len(words) - 2))
        elif op == "abbrev":
            text = text.replace("light", "lgt").replace("street", "st").replace("urgent", "urg")
    return text

def gen_boundary(rng):
    cat, frame = rng.choice(REAL_FRAMES)
    text = frame.format(loc=rng.choice(LOCATIONS))
    return cat, corrupt_mild(rng, text)

# ---------------- Runner ----------------

FAMILIES = {
    "random_ascii": gen_random_ascii,
    "keyboard_mash": gen_keyboard_mash,
    "repeated_word": gen_repeated_word,
    "repeated_char": gen_repeated_char,
    "lorem": gen_lorem,
    "mixed_script": gen_mixed_script,
    "symbol_digit": gen_symbol_digit,
    "scam_template": gen_scam_template,
}
DEFAULT_MIX = {
    "random_ascii": 0.10, "keyboard_mash": 0.15, "repeated_word": 0.12,
    "repeated_char": 0.08, "lorem": 0.10, "mixed_script": 0.12,
    "symbol_digit": 0.08, "scam_template": 0.25, "boundary_real": 0.10,
}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--total", type=int, default=4000, help="total rows to emit")
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)

    # Build a weighted family list
    families = list(DEFAULT_MIX)
    weights = [DEFAULT_MIX[f] for f in families]
    rows = []
    for i in range(args.total):
        family = rng.choices(families, weights=weights, k=1)[0]
        if family == "boundary_real":
            cat, text = gen_boundary(rng)
            rows.append({"id": f"syn-spam-v{MAPPING_VERSION}-{i:06d}",
                         "text": text, "text_kind": "synthetic_boundary",
                         "language": "en", "category_id": cat, "priority": None,
                         "is_fake": 0, "spam_family": family, "coords": None, "h3_9": None,
                         "status": None, "created": None, "source": "synthetic:spam_corpus",
                         "source_ref": f"seed={args.seed}", "pii_redacted": True,
                         "labels": {"labeler": "generator", "agreement": 1.0,
                                    "note": "hard negative — near-real, do NOT auto-reject"}})
        else:
            text = FAMILIES[family](rng)
            rows.append({"id": f"syn-spam-v{MAPPING_VERSION}-{i:06d}",
                         "text": text, "text_kind": "synthetic",
                         "language": "en", "category_id": None, "priority": None,
                         "is_fake": 1, "spam_family": family, "coords": None, "h3_9": None,
                         "status": None, "created": None, "source": "synthetic:spam_corpus",
                         "source_ref": f"seed={args.seed}", "pii_redacted": True,
                         "labels": {"labeler": "generator", "agreement": 1.0}})

    with open(args.out, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    fam_counts = {}
    for r in rows:
        fam_counts[r["spam_family"]] = fam_counts.get(r["spam_family"], 0) + 1
    digest = hashlib.sha256(open(args.out, "rb").read()).hexdigest()
    manifest = {
        "generator": "generate_spam_corpus",
        "version": MAPPING_VERSION,
        "seed": args.seed,
        "total": args.total,
        "family_counts": fam_counts,
        "sha256": digest,
        "note": "seed-pinned: same seed => byte-identical output",
    }
    with open(args.out + ".manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print(json.dumps(manifest, indent=2))
    print(f"done: {args.total} rows -> {args.out}")


if __name__ == "__main__":
    main()
