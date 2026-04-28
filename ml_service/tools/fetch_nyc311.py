#!/usr/bin/env python3
"""
fetch_nyc311.py — Download + clean NYC 311 service requests into the Civix
D1 (category_text) / D5 (duplicate_pairs) flat schema.

Source (verified free, no API key):
  2010-2019: https://data.cityofnewyork.us/resource/76ig-c548.csv
  2020-present: https://data.cityofnewyork.us/resource/erm2-nwe9.csv
Docs: https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/76ig-c548

Stdlib only. Usage:
  python3 fetch_nyc311.py --start-year 2015 --end-year 2023 \
      --rows-per-year 4000 --out ../datasets/processed/nyc311_v1.jsonl \
      --raw-dir ../datasets/raw --seed 42

Notes:
  * NYC 311 text is the templated `Descriptor` field (clean, short). It is
    Layer A data per docs/datasets/DATASET_PLAN.md — strong category signal,
    NOT representative of messy citizen prose. Keep that in the data card.
  * We sample by `Complaint Type` (stratified) so no single type dominates.
  * Unmapped complaint types are kept with category_id=null and counted,
    never guessed.
"""
import argparse
import csv
import hashlib
import io
import json
import random
import sys
from collections import Counter, defaultdict
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DS_2010_2019 = "76ig-c548"
DS_2020_PRE = "erm2-nwe9"
BASE = "https://data.cityofnewyork.us/resource/{ds}.csv"

# --- Category mapping: NYC Complaint Type -> civix taxonomy.json (v4) category_id ---
# Versioned: any change must bump MAPPING_VERSION and be noted in the data card.
# v2: aligned to taxonomy v4 (street_lighting split, sewerage_drainage split,
#     flood_management, health_hospitals, trees, gas_fire_hazards, public_conveniences).
MAPPING_VERSION = 2
CATEGORY_MAP = {
    # street lighting (separate dept from power utility in Indian municipalities)
    "street light system": "street_lighting",
    # electricity / power utility
    "electrical hazard": "electricity",
    "power company complaint": "electricity",
    "overhead wires": "electricity",
    # roads
    "pothole": "roads",
    "sidewalk and accessibility": "roads",
    "street name sign": "roads",
    "road construction": "roads",
    "vacant lot": "roads",
    "fence and gate": "roads",
    # water supply
    "water system": "water_supply",
    "water pressure": "water_supply",
    # sewerage & drainage / flood
    "sewer": "sewerage_drainage",
    "steam": "sewerage_drainage",
    "blocked hydrant": "sewerage_drainage",
    "flood": "flood_management",
    "storm sewer / manhole": "flood_management",
    # solid waste / sanitation
    "sanitation condition": "solid_waste",
    "missed collection (non-recyclables)": "solid_waste",
    "missed collection (recyclables)": "solid_waste",
    "missed collection (bulky)": "solid_waste",
    "compost & recycling": "solid_waste",
    "holiday collection": "solid_waste",
    "foul odor": "solid_waste",
    "dead animal": "solid_waste",
    "insect condition": "solid_waste",
    "rat condition": "solid_waste",
    "junk and scraps": "solid_waste",
    "illegal dumping": "solid_waste",
    # building inspection / encroachment / safety
    "dereliction of building": "building_inspection",
    "fire hazard": "gas_fire_hazards",
    "gas hazard": "gas_fire_hazards",
    "explosion / fire": "gas_fire_hazards",
    "dog runs and dog pens": "public_safety",
    # traffic
    "traffic - signal condition": "traffic",
    "traffic signal condition": "traffic",
    "traffic - stop sign": "traffic",
    "traffic - street light": "traffic",
    "signal condition": "traffic",
    "parking meter": "traffic",
    "hydraulic signal problem": "traffic",
    "illegal parking": "traffic",
    # transport
    "bike/rack or rack": "public_transport",
    "bus - signal": "public_transport",
    "highway": "public_transport",
    "railroad": "public_transport",
    # noise
    "noise - residential": "noise",
    "noise - commercial": "noise",
    "noise - construction/demolition": "noise",
    "noise - park": "noise",
    "noise - vehicle": "noise",
    "noise - sirens": "noise",
    "noise - street/music/singing": "noise",
    # parks & public space
    "park": "parks_public_space",
    "graffiti": "parks_public_space",
    "swim area": "parks_public_space",
    "boat": "parks_public_space",
    "pier": "parks_public_space",
    "playground": "parks_public_space",
    "tree related": "trees",
    "street tree": "trees",
    # public health / hospitals
    "health": "health_hospitals",
    "aids/disease": "health_hospitals",
    "pharmacy": "health_hospitals",
    "food service": "health_hospitals",
    "clinic": "health_hospitals",
    "vaccination": "health_hospitals",
    "public toilet": "public_conveniences",
    "drinking fountain": "public_conveniences",
    # personal / out-of-public-taxonomy -> other (kept, flagged)
    "cable tv out": "other",
    "housing / building": "other",
    "heat/hot water": "other",
    "plumbing": "other",
    "ventilation": "other",
    "pest condition": "other",
    "elevator": "other",
    "antenna / dish / cable": "other",
    "concealed/illegal use": "other",
}

WANT_COLS = [
    "Unique ID", "Created Date", "Complaint Type", "Descriptor", "Sub Category",
    "Department", "Status", "Borough", "Address", "Latitude", "Longitude",
    "Intake Type",
]


def fetch_csv(ds, soql_where, limit, offset=0):
    """Fetch one Socrata CSV page as list-of-dicts. Stdlib only."""
    params = urlencode({
        "$limit": limit,
        "$offset": offset,
        "$select": ",".join(WANT_COLS),
        **({"$where": soql_where} if soql_where else {}),
    })
    url = f"{BASE.format(ds=ds)}?{params}"
    req = Request(url, headers={"User-Agent": "civix-dataset-tools/1.0"})
    with urlopen(req, timeout=120) as resp:
        text = resp.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    return [dict(r) for r in reader]


def clean_row(r, source, mapping):
    ct = (r.get("Complaint Type") or "").strip()
    descriptor = (r.get("Descriptor") or "").strip()
    sub = (r.get("Sub Category") or "").strip()
    # Text the model sees: complaint type + descriptor (+ sub category).
    parts = [p for p in (ct, descriptor, sub) if p]
    text = " - ".join(parts)
    if len(text) < 4:
        return None
    uid = (r.get("Unique ID") or "").strip()
    if not uid:
        return None
    lat = r.get("Latitude") or None
    lng = r.get("Longitude") or None
    try:
        coords = [float(lat), float(lng)] if lat and lng else None
    except ValueError:
        coords = None
    cat = mapping.get(ct.lower())
    return {
        "id": f"nyc-{source}-{uid}",
        "text": text,
        "text_kind": "templated_short",
        "language": "en",
        "category_id": cat,  # None => unmapped, counted in report
        "priority": None,    # D6: filled later by weak-label pass (BBMP status / urgency lexicon)
        "is_fake": 0,        # 311 intake is curated; real positive by construction
        "spam_family": None,
        "coords": coords,
        "h3_9": None,        # computed by a post-pass if h3 lib available, else left null
        "status": (r.get("Status") or "").strip() or None,
        "created": (r.get("Created Date") or "").strip() or None,
        "source": f"nyc311:{source}",
        "source_ref": uid,
        "pii_redacted": True,  # NYC strips PII at source; still redacted again in pipeline
        "labels": {"labeler": "auto-department-field", "agreement": 1.0},
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--start-year", type=int, default=2015)
    ap.add_argument("--end-year", type=int, default=2023)
    ap.add_argument("--rows-per-type", type=int, default=1000,
                    help="reservoir sample size per Complaint Type (keeps classes balanced)")
    ap.add_argument("--out", required=True, help="output processed JSONL path")
    ap.add_argument("--raw-dir", required=True, help="directory for raw page cache")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--max-pages", type=int, default=400,
                    help="safety cap: max Socrata pages fetched (10k rows each)")
    args = ap.parse_args()
    rng = random.Random(args.seed)

    import os
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    os.makedirs(args.raw_dir, exist_ok=True)

    # Reservoir per complaint type: keeps memory bounded and classes balanced.
    reservoir = defaultdict(list)
    seen_per_type = Counter()
    counts = Counter()
    unmapped = Counter()
    total_seen = 0
    pages = 0

    for year in range(args.start_year, args.end_year + 1):
        ds = DS_2010_2019 if year <= 2019 else DS_2020_PRE
        soql = f"created_date >= '{year}-01-01T00:00:00' AND created_date < '{year + 1}-01-01T00:00:00'"
        offset = 0
        page_size = 10000
        year_rows = 0
        while pages < args.max_pages:
            try:
                page = fetch_csv(ds, soql, page_size, offset)
            except Exception as e:  # noqa: BLE001
                print(f"[warn] fetch failed at offset {offset}: {e}", file=sys.stderr)
                break
            if not page:
                break
            pages += 1
            # cache raw page (small: only wanted columns)
            raw_path = f"{args.raw_dir}/nyc311_{ds}_y{year}_o{offset}.csv"
            with open(raw_path, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=WANT_COLS)
                w.writeheader()
                w.writerows(page)

            for r in page:
                total_seen += 1
                ct = (r.get("Complaint Type") or "").strip()
                if not ct:
                    continue
                k = ct.lower()
                i = seen_per_type[k]
                if i < args.rows_per_type:
                    reservoir[k].append(r)
                else:
                    j = rng.randint(0, i)
                    if j < args.rows_per_type:
                        reservoir[k][j] = r
                seen_per_type[k] += 1
                year_rows += 1
                counts[ct] += 1
                if k not in CATEGORY_MAP:
                    unmapped[ct] += 1
            if len(page) < page_size:
                break
            offset += page_size
            print(f"  year {year}: fetched {year_rows} rows so far", file=sys.stderr)

    # Emit
    n_out = 0
    n_null = 0
    with open(args.out, "w", encoding="utf-8") as f:
        for ct in sorted(reservoir):
            for r in reservoir[ct]:
                row = clean_row(r, DS_2010_2019 if args.start_year <= 2019 else DS_2020_PRE, CATEGORY_MAP)
                if row is None:
                    continue
                if row["category_id"] is None:
                    n_null += 1
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
                n_out += 1

    report = {
        "tool": "fetch_nyc311",
        "mapping_version": MAPPING_VERSION,
        "years": [args.start_year, args.end_year],
        "seed": args.seed,
        "total_seen": total_seen,
        "rows_written": n_out,
        "rows_unmapped_category": n_null,
        "top_unmapped": unmapped.most_common(10),
        "types_seen": len(counts),
        "top_types": counts.most_common(15),
        "output": args.out,
        "output_sha256": hashlib.sha256(open(args.out, "rb").read()).hexdigest(),
    }
    with open(os.path.join(os.path.dirname(os.path.abspath(args.out)), "nyc311_fetch_report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(json.dumps({k: v for k, v in report.items() if k not in ("top_unmapped", "top_types")}, indent=2))
    print(f"done: {n_out} rows -> {args.out}")


if __name__ == "__main__":
    main()
