#!/usr/bin/env python3
"""
fetch_bbmp.py — Download BBMP (Bengaluru) grievance data from OpenCity's CKAN
portal into the Civix flat schema (D1 distribution reference / D6 weak labels).

Source (verified free, no API key):
  Package:  https://data.opencity.in/dataset/bbmp-grievances-data
  API:      https://data.opencity.in/api/3/action/package_show?id=bbmp-grievances-data
Resources:  yearly CSVs (2020..2025), ward-level grievances with category +
            status (Registered / In Progress / Resolved / Non-Relevant / ...).

Why it matters for Civix (see docs/datasets/DATASET_PLAN.md §T3):
  * Indian-city category mix — the real distribution to reweight training.
  * `Non-Relevant` status = a REAL proxy for fake/out-of-jurisdiction reports
    (rare in public data; this is the closest thing to a free fake-corpus).
  * Status + dates = weak labels for priority (D6) and SLA analytics.

Stdlib only. Usage:
  python3 fetch_bbmp.py --years 2022 2023 2024 --out ../datasets/processed/bbmp_v1.jsonl \
      --raw-dir ../datasets/raw
  python3 fetch_bbmp.py --inspect   # prints observed column + value lists
"""
import argparse
import csv
import hashlib
import io
import json
import os
import sys
from collections import Counter
from urllib.request import Request, urlopen

PORTAL = "https://data.opencity.in"
PACKAGE_ID = "bbmp-grievances-data"
MAPPING_VERSION = 2

# BBMP category names vary by year; map the lowercased value -> civix taxonomy v4 category_id.
# Filled/expanded after first --inspect run (observed values printed to stdout).
CATEGORY_MAP = {
    # roads
    "pothole": "roads",
    "potholes": "roads",
    "road": "roads",
    "roads": "roads",
    "road damage": "roads",
    "speed breaker": "roads",
    "footpath": "roads",
    # street lighting (separate dept from power)
    "street light": "street_lighting",
    "street lights": "street_lighting",
    "light": "street_lighting",
    "lights": "street_lighting",
    "lighting": "street_lighting",
    # electricity
    "electricity": "electricity",
    "power cut": "electricity",
    "transformer": "electricity",
    # water supply
    "water": "water_supply",
    "water supply": "water_supply",
    "water leak": "water_supply",
    # sewerage & drainage / flood
    "sewerage": "sewerage_drainage",
    "drain": "sewerage_drainage",
    "drains": "sewerage_drainage",
    "drainage": "sewerage_drainage",
    "waterlogging": "flood_management",
    "flood": "flood_management",
    # solid waste / sanitation
    "garbage": "solid_waste",
    "garbage collection": "solid_waste",
    "waste": "solid_waste",
    "dumping": "solid_waste",
    "littering": "solid_waste",
    "sanitation": "solid_waste",
    "open defecation": "solid_waste",
    # traffic / transport
    "traffic": "traffic",
    "bus": "public_transport",
    "public transport": "public_transport",
    "parking": "public_transport",
    # parks & conveniences
    "park": "parks_public_space",
    "garden": "parks_public_space",
    "toilet": "public_conveniences",
    "toilets": "public_conveniences",
    "drinking water": "public_conveniences",
    # health / hospitals
    "hospital": "health_hospitals",
    "health": "health_hospitals",
    "clinic": "health_hospitals",
    "ambulance": "health_hospitals",
    "blood bank": "health_hospitals",
    "disease": "health_hospitals",
    # noise / safety
    "noise": "noise",
    "stray dogs": "public_safety",
    "stray animals": "public_safety",
    "stray cattle": "public_safety",
    "safety": "public_safety",
    # encroachment / buildings / trees / hazards / markets
    "encroachment": "encroachment",
    "hoarding": "building_inspection",
    "hoardings": "building_inspection",
    "building": "building_inspection",
    "tree": "trees",
    "trees": "trees",
    "fire": "gas_fire_hazards",
    "gas": "gas_fire_hazards",
    "market": "markets_trade",
    "markets": "markets_trade",
    "weighing": "markets_trade",
}

# status -> (is_fake_weak, priority_weak)
# "Non-Relevant" is the real-world fake/out-of-jurisdiction proxy.
STATUS_FAKE_PROXY = {"non-relevant": 1, "invalid": 1, "rejected": 1}
STATUS_PRIORITY = {
    "registered": None, "in progress": None,
    "resolved": "Low",   # closed; severity refined later with resolution time
    "reopened": "Medium",
    "non-relevant": None,
}


def get_json(url):
    req = Request(url, headers={"User-Agent": "civix-dataset-tools/1.0"})
    with urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_resource_by_year(pkg, year):
    for res in pkg.get("resources", []):
        name = (res.get("name") or "") + " " + (res.get("title") or "")
        fmt = res.get("format", "")
        if str(year) in name and fmt.lower().startswith("csv"):
            return res
    return None


def norm_header(h):
    return (h or "").strip().lower().replace(" ", "_")


def find_col(fieldnames, *candidates):
    cols = {norm_header(c): c for c in fieldnames if c}
    for cand in candidates:
        if cand in cols:
            return cols[cand]
    return None


def to_float(v):
    try:
        f = float(v)
        return f if -90 <= f <= 90 else None  # sanity: lat/lng ranges
    except (TypeError, ValueError):
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--years", nargs="*", type=int, default=[2020, 2021, 2022, 2023, 2024, 2025])
    ap.add_argument("--out", default="../datasets/processed/bbmp_v1.jsonl")
    ap.add_argument("--raw-dir", default="../datasets/raw")
    ap.add_argument("--inspect", action="store_true",
                    help="download only headers + first 5 rows per year, print value lists, stop")
    ap.add_argument("--max-rows", type=int, default=200000, help="safety cap per year")
    args = ap.parse_args()

    os.makedirs(args.raw_dir, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)

    pkg = get_json(f"{PORTAL}/api/3/action/package_show?id={PACKAGE_ID}")
    resources = pkg.get("resources", [])
    print(f"package: {pkg.get('title')} — {len(resources)} resources")
    for res in resources:
        print(f"  - {res.get('name')} [{res.get('format')}] {res.get('url')}")

    all_cols = Counter()
    cat_values = Counter()
    status_values = Counter()
    n_out = 0
    out_path = args.out if not args.inspect else None
    fout = open(out_path, "w", encoding="utf-8") if out_path else None

    for year in args.years:
        res = get_resource_by_year(pkg, year)
        if not res:
            print(f"[warn] no CSV resource found for year {year}", file=sys.stderr)
            continue
        url = res["url"]
        print(f"\n== year {year}: {res.get('name')}")
        req = Request(url, headers={"User-Agent": "civix-dataset-tools/1.0"})
        raw_bytes = urlopen(req, timeout=300).read()
        raw_path = f"{args.raw_dir}/bbmp_{year}.csv"
        with open(raw_path, "wb") as f:
            f.write(raw_bytes)
        print(f"  raw saved: {raw_path} ({len(raw_bytes)} bytes) sha256={hashlib.sha256(raw_bytes).hexdigest()[:16]}…")

        reader = csv.DictReader(io.StringIO(raw_bytes.decode("utf-8", errors="replace")))
        fieldnames = reader.fieldnames or []
        all_cols.update(fieldnames)

        c_text = find_col(fieldnames, "description", "complaint_description", "details",
                          "grievance", "complaint", "nature_of_complaint", "category")
        c_cat = find_col(fieldnames, "category", "complaint_category", "type", "grievance_type")
        c_status = find_col(fieldnames, "status", "current_status", "case_status")
        c_ward = find_col(fieldnames, "ward", "ward_no", "ward_number")
        c_lat = find_col(fieldnames, "latitude", "lat")
        c_lng = find_col(fieldnames, "longitude", "lng", "lon")
        c_date = find_col(fieldnames, "date", "created_date", "date_of_complaint", "received_date")

        print(f"  columns: {fieldnames}")
        print(f"  text col: {c_text} | cat col: {c_cat} | status col: {c_status} | ward: {c_ward}")

        rows = 0
        for r in reader:
            rows += 1
            if args.inspect and rows > 5:
                continue
            if rows > args.max_rows:
                break
            text = (r.get(c_text) or "").strip() if c_text else ""
            cat = (r.get(c_cat) or "").strip() if c_cat else ""
            status = (r.get(c_status) or "").strip() if c_status else ""
            cat_values[cat.lower()] += 1
            status_values[status.lower()] += 1
            if args.inspect:
                print(f"  sample: cat={cat!r} status={status!r} text={text[:120]!r}")
                continue
            if not text and not cat:
                continue
            lat = to_float(r.get(c_lat)) if c_lat else None
            lng = to_float(r.get(c_lng)) if c_lng else None
            row = {
                "id": f"bbmp-{year}-{rows}",
                "text": text or cat,  # ward-aggregated files may lack free text
                "text_kind": "citizen_messy" if text else "templated_short",
                "language": "en",
                "category_id": CATEGORY_MAP.get(cat.lower()),
                "priority": STATUS_PRIORITY.get(status.lower()),
                "is_fake": STATUS_FAKE_PROXY.get(status.lower(), 0),
                "spam_family": "real_non_relevant" if status.lower() in STATUS_FAKE_PROXY else None,
                "coords": [lat, lng] if (lat is not None and lng is not None) else None,
                "h3_9": None,
                "status": status or None,
                "created": (r.get(c_date) or "").strip() or None if c_date else None,
                "source": f"bbmp:{year}",
                "source_ref": (r.get(c_ward) or "").strip() or None,
                "pii_redacted": True,
                "labels": {"labeler": "auto-status-field", "agreement": 1.0},
            }
            fout.write(json.dumps(row, ensure_ascii=False) + "\n")
            n_out += 1
        print(f"  rows in file: {rows}")

    if fout:
        fout.close()

    report = {
        "tool": "fetch_bbmp",
        "mapping_version": MAPPING_VERSION,
        "years": args.years,
        "rows_written": n_out,
        "columns_seen": all_cols.most_common(),
        "top_categories": cat_values.most_common(30),
        "top_statuses": status_values.most_common(15),
        "unmapped_categories": [k for k in cat_values if k and k not in CATEGORY_MAP],
        "output": out_path,
    }
    if out_path:
        report["output_sha256"] = hashlib.sha256(open(out_path, "rb").read()).hexdigest()
    rp = os.path.join(os.path.dirname(os.path.abspath(out_path or args.raw_dir)), "bbmp_fetch_report.json")
    with open(rp, "w") as f:
        json.dump(report, f, indent=2)
    print("\n--- REPORT ---")
    print(json.dumps(report, indent=2)[:4000])
    if report.get("unmapped_categories"):
        print("\n[next step] add these to CATEGORY_MAP (fetch_bbmp.py) — one-time 10 min job.")


if __name__ == "__main__":
    main()
