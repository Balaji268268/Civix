#!/usr/bin/env python3
"""
dataset_report.py — Profile a processed JSONL/CSV dataset and emit a quality
report (markdown + JSON). This is the QC gate from DATASET_PLAN.md: no dataset
is "locked" without its report.

Checks:
  * row count, per-label class balance + imbalance ratio
  * text length distribution (p10/50/90), short-text ratio (spam signal)
  * exact-duplicate rate + near-duplicate rate (prefix-hash, 12 chars)
  * language sample sanity (ASCII/Latin ratio vs script)
  * label coverage (null counts per label field)
  * source mix (Layer A/B/C per DATASET_PLAN.md)

Stdlib only. Usage:
  python3 dataset_report.py --in ../datasets/processed/category_text_v1.jsonl \
      --name category_text_v1 --out ../datasets/reports/category_text_v1.md
  python3 dataset_report.py --in data.csv --name x --label category_id --out r.md
"""
import argparse
import csv
import hashlib
import json
import os
from collections import Counter


def load(path):
    if path.endswith(".csv"):
        with open(path, newline="", encoding="utf-8") as f:
            return list(csv.DictReader(f))
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def pct(n, d):
    return 0.0 if d == 0 else 100.0 * n / d


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--out", required=True, help="markdown report path")
    ap.add_argument("--label", default="category_id", help="primary label field")
    ap.add_argument("--min-class", type=int, default=800,
                    help="QC gate: minimum rows per primary class")
    args = ap.parse_args()
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)

    rows = load(args.inp)
    n = len(rows)
    if n == 0:
        print("EMPTY DATASET", file=__import__("sys").stderr)
        return

    texts = [(r.get("text") or "") for r in rows]
    lengths = sorted(len(t) for t in texts)
    def q(p):
        return lengths[min(n - 1, int(p * n))]

    labels = Counter(str(r.get(args.label, "<null>")) for r in rows)
    sources = Counter()
    for r in rows:
        s = r.get("source", "?")
        layer = "A" if s.startswith(("nyc311", "bbmp")) else "B" if s.startswith("synthetic") else "C" if s.startswith("app") else "?"
        sources[f"layer{layer}:{s.split(':')[0]}"] += 1

    # duplicates — split synthetic vs real: synthetic corpora are DELIBERATELY
    # near-duplicate-rich (controlled clusters for duplicate-detection
    # calibration); leakage risk lives only in real/external data.
    def near_dup_count(ts):
        pref, hits = Counter(), 0
        for t in ts:
            p = t[:12].lower()
            if pref[p] > 0:
                hits += 1
            pref[p] += 1
        return hits

    exact = Counter(texts)
    n_exact_dups = sum(c - 1 for c in exact.values() if c > 1)
    real_texts = [t for t, r in zip(texts, rows) if not str(r.get("source", "")).startswith("synthetic")]
    syn_texts = [t for t, r in zip(texts, rows) if str(r.get("source", "")).startswith("synthetic")]
    n_near_real = near_dup_count(real_texts)
    n_near_syn = near_dup_count(syn_texts)

    # language sanity: script composition
    scripts = Counter()
    sample = texts[: min(2000, n)]
    for t in sample:
        for ch in t:
            o = ord(ch)
            if 0x0900 <= o <= 0x097F:
                scripts["devanagari"] += 1
            elif 0x0C00 <= o <= 0x0C7F:
                scripts["telugu"] += 1
            elif o < 0x0250:
                scripts["latin"] += 1
            else:
                scripts["other"] += 1

    nulls = Counter()
    for field in ("category_id", "priority", "is_fake", "coords", "status"):
        if any(field in r for r in rows[:50]):
            nulls[field] = sum(1 for r in rows if r.get(field) in (None, "", "null"))

    min_class_ok = all(c >= args.min_class for k, c in labels.items() if k != "<null>")
    n_near_all = n_near_real + n_near_syn
    gates = {
        "min_class_support": {"pass": min_class_ok, "limit": args.min_class},
        "exact_dup_rate_lt_15pct": {"pass": pct(n_exact_dups, n) < 15, "value": round(pct(n_exact_dups, n), 2)},
        # Near-dup gate applies to REAL rows only (synthetic is intentionally
        # cluster-rich for duplicate-calibration). If no real rows, gate is N/A.
        "near_dup_real_rows_lt_30pct": {
            "pass": (pct(n_near_real, len(real_texts)) < 30) if real_texts else True,
            "value": round(pct(n_near_real, len(real_texts)), 2) if real_texts else "n/a",
        },
        "no_zero_texts": {"pass": q(0) > 0, "value": q(0)},
    }
    all_pass = all(g["pass"] for g in gates.values())

    report = {
        "dataset": args.name,
        "input": args.inp,
        "input_sha256": hashlib.sha256(open(args.inp, "rb").read()).hexdigest(),
        "rows": n,
        "primary_label": args.label,
        "class_balance": labels.most_common(),
        "imbalance_ratio": round(labels.most_common(1)[0][1] / max(1, labels.most_common()[-1][1]), 1),
        "text_len": {"p10": q(0.10), "p50": q(0.5), "p90": q(0.9), "min": q(0), "max": q(1)},
        "exact_dup_rows": n_exact_dups,
        "near_dup_rows_real": n_near_real,
        "near_dup_rows_synthetic": n_near_syn,
        "source_mix": sources.most_common(),
        "script_composition_sample": scripts.most_common(),
        "null_label_counts": dict(nulls),
        "gates": gates,
        "all_gates_pass": all_pass,
    }
    with open(args.out + ".json", "w") as f:
        json.dump(report, f, indent=2)

    md = [f"# Dataset Report — {args.name}", ""]
    md.append(f"- **rows:** {n}  ")
    md.append(f"- **input sha256:** `{report['input_sha256'][:24]}…`  ")
    md.append(f"- **text length (chars):** p10={q(0.1)} / p50={q(0.5)} / p90={q(0.9)}  ")
    md.append(f"- **exact duplicates:** {n_exact_dups} ({pct(n_exact_dups, n):.1f}%) | near-dup(real): {n_near_real} | near-dup(synthetic, by design): {n_near_syn}  ")
    md.append("")
    md.append("## Class balance (`%s`)" % args.label)
    md.append("")
    md.append("| value | count | % |")
    md.append("|---|---|---|")
    for k, c in labels.most_common():
        md.append(f"| {k} | {c} | {pct(c, n):.1f} |")
    md.append("")
    md.append("## Source mix (Layer A=real-external, B=synthetic, C=app)")
    md.append("")
    md.append("| source | rows |")
    md.append("|---|---|")
    for k, c in sources.most_common():
        md.append(f"| {k} | {c} |")
    md.append("")
    md.append("## QC gates")
    md.append("")
    md.append("| gate | pass | value |")
    md.append("|---|---|---|")
    for gname, g in gates.items():
        md.append(f"| {gname} | {'✅' if g['pass'] else '❌'} | {g.get('value', '')} |")
    md.append("")
    md.append(f"**Overall: {'✅ ALL PASS' if all_pass else '❌ FAILURES PRESENT'}**")
    with open(args.out, "w") as f:
        f.write("\n".join(md))
    print(f"report: {args.out} (all_pass={all_pass})")


if __name__ == "__main__":
    main()
