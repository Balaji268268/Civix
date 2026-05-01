#!/usr/bin/env python3
"""
generate_citizen_corpus.py — Layer B synthetic *citizen* complaint corpus (D1/D5/D6).

Replaces the DEPRECATED mock dataset (ml_service/datasets/civic_data.csv — do
not use it). The old file was 8 fixed templates; this generator produces
complaints the way real citizens write them:

  * semantic frame first  : {dept, subtype, location, time, severity, consequence}
  * stochastic surface    : case variants, typos, abbreviations, code-mixing
                            tokens, fragments, emoji, urgency fillers
  * geographic realism    : 60% of complaints cluster around 8 "hotspots"
                            (±300 m) so the corpus contains NATURAL duplicate
                            clusters for D5 threshold calibration; 40% uniform
  * priority heuristics   : dept risk table + urgency words -> High/Medium/Low

Deterministic: same --seed => byte-identical output (manifest records seed+sha).
Stdlib only. Usage:
  python3 tools/generate_citizen_corpus.py --total 12000 \
      --out ../datasets/processed/category_text_v1.jsonl --seed 7
"""
import argparse
import hashlib
import json
import math
import os
import random
import re
import string

TAXONOMY_PATH = os.path.join(os.path.dirname(__file__), "..", "taxonomy.json")
MAPPING_VERSION = 1

CITY = {"name": "Vijayawada", "lat": 16.5062, "lng": 80.6480}

# 8 hotspots (roads/wards) — ~300 m jitter creates natural dup clusters
HOTSPOTS = [
    (16.5345, 80.6370, "MG Road"), (16.4870, 80.6560, "Railway Station Area"),
    (16.5210, 80.6730, "Bus Stand Junction"), (16.4990, 80.6400, "Old Market"),
    (16.5450, 80.6520, "Hospital Road"), (16.4780, 80.6430, "Temple Street"),
    (16.5380, 80.6650, "Lake View Road"), (16.5050, 80.6250, "Industrial Area Entrance"),
]
STREETS = [
    "near the school gate", "behind the bank", "opposite the chai shop",
    "corner of the park", "under the flyover", "at the junction", "midway of the lane",
    "outside the sweet shop", "near the water tank", "by the bus bay",
    "in front of the pharmacy", "towards the college", "at the footpath",
    "behind the mosque", "near the gymkhana", "on the service lane",
]

TIME_PHRASES = ["since last week", "for 3 days now", "since the monsoon started",
                "for 2 months", "since yesterday", "for a week", "again this week"]
CONSEQUENCES = [
    "one accident already happened", "residents are very disturbed",
    "old people cannot cross safely", "it is getting worse every day",
    "waste is spreading disease", "two wheelers are skidding",
    "women feel unsafe passing there at night", "vehicles cannot pass",
    "it is a big problem for our colony", "no one is responding",
]
URGENCY = ["urgent", "please fix soon", "asap", "very urgent", "kripya jaldi karo",
           "pls help", "please do something", "action needed"]

# dept -> list of (subtype, template). {loc},{time},{detail} slots filled at render.
PHRASES = {
    "roads": [
        ("pothole", "Deep pothole at {loc}, vehicles getting damaged, please repair."),
        ("pothole", "Huge pothole on {loc}, my tyre got punctured yesterday."),
        ("road_damage", "Road surface broken and uneven near {loc}, {detail}."),
        ("footpath", "Footpath is damaged at {loc}, pedestrians are walking on the road."),
        ("open_manhole", "Manhole cover is open at {loc}, very dangerous, children play there."),
        ("speed_breaker", "Speed breaker broken at {loc}, accidents are happening."),
        ("crack", "Cracks spreading across the road at {loc}, it will become a big pothole in rain."),
        ("bridge_damage", "Cracks appearing on the bridge near {loc}, needs inspection."),
    ],
    "street_lighting": [
        ("light_out", "Street light not working at {loc} {time}, the area is completely dark."),
        ("light_flickering", "Street light flickering at {loc}, gives shock when touched."),
        ("light_broken", "Street light bulb broken at {loc}, {detail}."),
        ("pole_bent", "Street light pole bent after a truck hit at {loc}."),
        ("area_unlit", "Whole stretch is unlit at {loc} {time}, people are afraid to walk at night."),
        ("light_not_working_night", "Street lights off every night at {loc}, no response from anyone."),
    ],
    "electricity": [
        ("power_cut", "Power cut in {loc} {time}, transformer is making strange noise."),
        ("transformer_issue", "Transformer near {loc} is sparking, burning smell, {detail}."),
        ("hanging_wires", "Hanging wires near {loc} are sparking at night, children pass by daily."),
        ("pole_fallen", "Electric pole leaning towards the road at {loc}, may fall anytime."),
        ("voltage_fluctuation", "Voltage fluctuations in {loc}, appliances are getting damaged."),
        ("meter_fault", "Street meter box damaged and open at {loc}, danger to people."),
    ],
    "water_supply": [
        ("no_water", "No water supply at {loc} for {time}, we buy tanker water daily."),
        ("low_pressure", "Very low water pressure at {loc}, upper floors are not getting water."),
        ("dirty_water", "Water coming out is muddy and colored at {loc}, {detail}."),
        ("pipe_burst", "Water pipe burst near {loc}, water is wasting on the road since morning."),
        ("damaged_tank", "Open water tank with broken roof at {loc}, getting contaminated."),
    ],
    "sewerage_drainage": [
        ("drain_clogged", "Drain is clogged and overflowing at {loc}, bad smell spreading in the lane."),
        ("sewage_overflow", "Sewage water entering our lane at {loc} after every rain."),
        ("open_drain", "Open drain full of garbage at {loc}, mosquitoes are breeding."),
        ("sewage_leak", "Sewage tank leaking near {loc}, stink is unbearable {time}."),
        ("manhole_sewage", "Sewage oozing from manhole at {loc}, slippery road."),
    ],
    "flood_management": [
        ("waterlogging", "Waterlogging at {loc} after light rain, one foot water standing for days."),
        ("storm_drain_blocked", "Storm drain blocked at {loc}, water is entering houses."),
        ("bank_erosion", "River bank erosion near {loc}, houses are at risk this monsoon."),
        ("underwater_area", "Underwater area at {loc}, buses are not able to pass {time}."),
    ],
    "solid_waste": [
        ("garbage_not_collected", "Garbage not collected at {loc} for {time}, heap is growing."),
        ("illegal_dumping", "Construction waste dumped on the field near {loc}, {detail}."),
        ("overflow_bin", "Dustbin overflowing at {loc}, stray dogs are scattering the trash."),
        ("street_unclean", "Street is not cleaned at {loc} {time}, dust and waste everywhere."),
        ("construction_debris", "Old furniture and debris dumped on the footpath at {loc}."),
        ("market_waste", "Rotting market waste lying at {loc}, foul smell and flies."),
        ("dead_animal", "Dead dog lying at {loc} for 2 days, please remove it urgently."),
        ("foul_odour", "Foul odour from the drain corner at {loc}, health issue for kids."),
    ],
    "traffic": [
        ("signal_fault", "Traffic signal not working at {loc} {time}, chaotic traffic."),
        ("illegal_parking", "Vehicles parked on both sides at {loc}, only one lane left for traffic."),
        ("road_encroachment", "Shopkeepers encroaching the road at {loc}, cars cannot pass."),
        ("no_zebra", "No zebra crossing for school children at {loc}, very risky."),
        ("traffic_jam", "Heavy traffic jam every day at {loc}, no diversion arranged."),
        ("wrong_side_driving", "Wrong side driving and overspeeding near {loc}, request strict action."),
        ("road_blocked", "Road half blocked by construction at {loc}, honking every minute."),
        ("sign_broken", "Traffic sign board broken/falling at {loc}."),
    ],
    "public_transport": [
        ("bus_stop_damaged", "Bus stop bench and shelter damaged at {loc}, no cover in rain."),
        ("bus_service", "Bus not stopping at {loc} stop, passengers are left behind."),
        ("auto_stand", "Auto rickshaw stand chaotic at {loc}, no meter used, common people suffering."),
        ("parking_lot", "Parking lot gate broken at {loc}, bikes are being stolen."),
        ("bus_route_gap", "No bus route covering {loc}, employees struggling every day."),
    ],
    "health_hospitals": [
        ("hospital_facility", "Waiting room of the hospital at {loc} is overcrowded, no seating, no fans."),
        ("clinic_phc", "No doctor on duty at the primary health center {loc} {time}."),
        ("ambulance", "Ambulance not available at the health center {loc} when we needed it."),
        ("blood_bank", "Blood bank at {loc} has no stock, we had to travel to another city."),
        ("health_camp", "Request: free health camp for elderly in {loc}, no camp since last year."),
        ("food_safety", "Dirty and expired food at the vendors near {loc}, health hazard."),
        ("disease_outbreak", "Fever cases increasing in {loc} area, request health team survey."),
        ("public_hygiene", "Dirty surroundings near the clinic at {loc}, infection risk."),
    ],
    "parks_public_space": [
        ("park_bench", "Park benches broken and seats dirty at {loc}, elderly people cannot sit."),
        ("playground_equipment", "Playground swing broken at {loc}, a child got injured last week."),
        ("park_washroom", "Park washroom at {loc} has no water and is very dirty."),
        ("park_lighting", "Park is unlit at night at {loc}, families afraid to use it."),
        ("gate_locked", "Park gate locked during day at {loc}, reason unknown."),
        ("garden_unclean", "Garden at {loc} full of dry leaves and waste, no gardener since {time}."),
    ],
    "public_conveniences": [
        ("public_toilet", "Public toilet at {loc} has no water, very dirty, people use open areas."),
        ("drinking_water_stand", "Drinking water stand broken at {loc}, no alternate arrangement."),
        ("shelter_bench", "Bus shelter bench broken at {loc}, standing in sun/rain."),
        ("street_furniture", "Public water pipeline / street furniture damaged at {loc}."),
    ],
    "noise": [
        ("construction_noise", "Construction noise at {loc} starting at 6 am, people cannot sleep."),
        ("loudspeaker", "Loudspeaker and music noise at {loc} till midnight, request action."),
        ("factory_noise", "Factory noise in the residential area {loc} all day."),
        ("vehicle_noise", "Trucks and loud vehicles near the school at {loc} during school hours."),
        ("late_night_noise", "Late night loud activities at {loc}, repeated complaints, no action."),
    ],
    "public_safety": [
        ("stray_dogs", "Stray dogs attacking children near {loc}, bitten two kids this month."),
        ("stray_cattle", "Stray cattle on the road at {loc} causing near-miss accidents."),
        ("unsafe_area", "Unlit and uneven footpath at {loc}, women not safe at night."),
        ("broken_fence", "Broken fence at {loc}, people entering the restricted area."),
        ("suspicious_activity", "Suspicious activity near {loc} at night, request patrolling."),
        ("unsafe_crossing", "Unsafe crossing near the temple at {loc}, no barrier, no light."),
    ],
    "encroachment": [
        ("footpath_blocked", "Shopkeeper blocked the whole footpath at {loc} with tables and chairs."),
        ("road_blocked_structure", "Temporary structure encroaching the public road at {loc}."),
        ("canal_encroached", "Container houses built on the canal at {loc}, blocking the drain."),
        ("unauthorized_awning", "Unauthorized awnings over the road at {loc}, reducing width."),
    ],
    "building_inspection": [
        ("structure_dilapidating", "Old building wall is cracking and falling near {loc}, people below are at risk."),
        ("hoarding_falling", "Hoardings and billboards damaged at {loc}, falling during wind."),
        ("illegal_construction", "Illegal construction going on at {loc} without permit."),
        ("ceiling_damage_public", "Ceiling of the public hall at {loc} is crumbling, unsafe."),
    ],
    "trees": [
        ("branch_over_wires", "Tree branch fallen towards the wires at {loc}, sparking risk."),
        ("dead_tree_road", "Dead tree standing in the middle of the road at {loc}."),
        ("roots_breaking_pavement", "Tree roots breaking the footpath at {loc}, tripping hazard."),
        ("pruning_needed", "Tree branches overhanging shops and wires at {loc}, need pruning."),
    ],
    "gas_fire_hazards": [
        ("gas_leak", "Strong gas smell near {loc}, residents evacuated, very dangerous."),
        ("street_fire", "Fire in the field at {loc}, smoke spreading towards houses."),
        ("flammable_storage", "Oil drums and flammable storage kept openly on the street at {loc}."),
        ("smoke_hazard", "Continuous smoke from the workshop at {loc}, breathing problem for nearby residents."),
    ],
    "markets_trade": [
        ("rigged_weighing", "Weighing machine rigged at the market at {loc}, we get less weight."),
        ("rotting_stock", "Rotting vegetables and meat lying in front of shops at {loc} market."),
        ("market_hygiene", "Dirty water, no drains in the meat section of {loc} market, flies everywhere."),
        ("weighing_machine_fault", "Public weighing machine at {loc} market not calibrated, complaints from farmers."),
    ],
    "other": [
        ("general_query", "General issue near {loc}, details in the description."),
        ("suggestion", "Suggestion for improvement at {loc}, would help the community."),
        ("unclassified", "Something is wrong at {loc}, not sure which department, please look into it."),
    ],
}

ABBR = {"street": "st", "road": "rd", "hospital": "hosp", "urgent": "urg",
        "please": "pls", "children": "kids", "garbage": "gbrg waste"}
HINGLISH = ["bhai", "bhaiya", "jaldi karo", "kripya", "asap please", "no action lete hai",
            "help kar do", "ek week ho gaya", "koi nahi sun raha"]
EMOJI = ["🚨", "⚠️", "🙏", "😠", ""]

DEPT_MIX = [  # (dept, weight) — approximates a real Indian city's complaint mix
    ("roads", 0.16), ("solid_waste", 0.14), ("street_lighting", 0.11),
    ("water_supply", 0.09), ("traffic", 0.08), ("sewerage_drainage", 0.07),
    ("electricity", 0.06), ("public_transport", 0.05), ("parks_public_space", 0.05),
    ("health_hospitals", 0.04), ("flood_management", 0.03), ("noise", 0.03),
    ("public_safety", 0.03), ("encroachment", 0.02), ("building_inspection", 0.02),
    ("trees", 0.02), ("gas_fire_hazards", 0.01), ("markets_trade", 0.01),
    ("public_conveniences", 0.01), ("other", 0.01),
]
DEPT_BASE_PRIORITY = {
    "gas_fire_hazards": "High", "electricity": "High", "water_supply": "Medium",
    "flood_management": "High", "roads": "Medium", "solid_waste": "Low",
    "street_lighting": "Medium", "sewerage_drainage": "Medium", "traffic": "Medium",
    "public_safety": "High", "health_hospitals": "Medium", "building_inspection": "Medium",
    "trees": "Medium", "public_transport": "Low", "parks_public_space": "Low",
    "noise": "Low", "encroachment": "Low", "markets_trade": "Low",
    "public_conveniences": "Low", "other": "Low",
}
HIGH_TRIGGERS = ["sparking", "fire", "gas", "fallen", "open manhole", "attacking",
                 "evacuated", "fall anytime", "injured", "shock", "drowning"]
LOW_TRIGGERS = ["suggestion", "request", "dirty", "smell", "bench", "sign"]


def geohash7(lat, lng):
    """Minimal geohash (base32, precision 7 ~153 m) — stand-in for H3 in this
    synthetic corpus; the canonical H3 index is computed in the pipeline."""
    BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    lat_r, lng_r = (-90.0, 90.0), (-180.0, 180.0)
    out, bits, ch, even = [], 0, 0, True
    while len(out) < 7:
        if even:
            mid = (lng_r[0] + lng_r[1]) / 2
            if lng > mid:
                ch |= 1 << (4 - bits); lng_r = (mid, lng_r[1])
            else:
                lng_r = (lng_r[0], mid)
        else:
            mid = (lat_r[0] + lat_r[1]) / 2
            if lat > mid:
                ch |= 1 << (4 - bits); lat_r = (mid, lat_r[1])
            else:
                lat_r = (lat_r[0], mid)
        even = not even
        bits += 1
        if bits == 5:
            out.append(BASE32[ch]); ch, bits = 0, 0
    return "".join(out)


def render_frame(rng, dept, subtype, template):
    if rng.random() < 0.6:
        hla, hlg, hl = rng.choice(HOTSPOTS)  # (lat, lng, name)
        lat = hla + rng.uniform(-0.0027, 0.0027)   # ~±300 m
        lng = hlg + rng.uniform(-0.0033, 0.0033)
        loc = f"{hl} {rng.choice(STREETS)}"
    else:
        lat = CITY["lat"] + rng.uniform(-0.15, 0.15)
        lng = CITY["lng"] + rng.uniform(-0.15, 0.15)
        loc = f"{CITY['name']} {rng.choice(STREETS)}"
    text = template.format(loc=loc, time=rng.choice(TIME_PHRASES),
                           detail=rng.choice(CONSEQUENCES))

    # --- stochastic surface forms (the "messy citizen" layer) ---
    style = rng.random()
    if style < 0.12:
        text = text.upper()
    elif style < 0.20:
        text = "".join(c.upper() if rng.random() < 0.3 else c.lower() for c in text)
    elif style < 0.30:
        text = text.lower()
    # typos (p≈0.5 at least one)
    if rng.random() < 0.5 and len(text) > 20:
        for _ in range(rng.randint(1, 3)):
            i = rng.randint(3, len(text) - 3)
            op = rng.random()
            if op < 0.4:
                text = text[:i] + rng.choice("aeioustn") + text[i + 1:]
            elif op < 0.7:
                text = text[:i] + text[i + 1:]
            else:
                text = text[:i] + rng.choice("aeioustn") + text[i:]
    # abbreviations
    for k, v in ABBR.items():
        if rng.random() < 0.25:
            text = re.sub(rf"\b{k}\b", v, text, flags=re.I)
    # code-mixing + urgency sprinkles
    if rng.random() < 0.35:
        text += " " + rng.choice(HINGLISH)
    if rng.random() < 0.4:
        text += " " + rng.choice(URGENCY)
    # emoji (rare)
    if rng.random() < 0.15:
        text = rng.choice([e for e in EMOJI if e]) + " " + text
    # fragment (drop a few words — real users paste broken sentences)
    if rng.random() < 0.15:
        words = text.split()
        if len(words) > 10:
            text = " ".join(words[:rng.randint(6, len(words))])
    return text.strip(), lat, lng


def priority_of(dept, text):
    low = text.lower()
    if any(t in low for t in HIGH_TRIGGERS) or (dept in ("gas_fire_hazards", "electricity") and rng_urgency(low)):
        return "High"
    if any(t in low for t in LOW_TRIGGERS) and rng_urgency(low) is False:
        return "Low"
    return DEPT_BASE_PRIORITY.get(dept, "Medium")


def rng_urgency(low):
    return any(w in low for w in ("urgent", "urg", "asap", "jaldi", "danger", "shock", "immediately"))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--total", type=int, default=12000)
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)

    tax = json.load(open(TAXONOMY_PATH, encoding="utf-8"))
    # Fail fast on any malformed template (stray braces) before a big run.
    for dept, lst in PHRASES.items():
        for subtype, template in lst:
            try:
                template.format(loc="X", time="Y", detail="Z")
            except (ValueError, KeyError) as e:
                raise SystemExit(f"[bad template] {dept}/{subtype}: {template!r} -> {e}")
    depts = [d["id"] for d in tax["public"]]
    weights = [w for _, w in DEPT_MIX if _ in depts]
    dept_ids = [d for d, _ in DEPT_MIX if d in depts]

    rows = []
    for i in range(args.total):
        dept = rng.choices(dept_ids, weights=weights, k=1)[0]
        subtype, template = rng.choice(PHRASES[dept])
        text, lat, lng = render_frame(rng, dept, subtype, template)
        rows.append({
            "id": f"syn-cit-v{MAPPING_VERSION}-{i:06d}",
            "text": text,
            "text_kind": "synthetic",
            "language": "en",
            "category_id": dept,
            "subtype": subtype,
            "priority": priority_of(dept, text),
            "is_fake": 0,
            "spam_family": None,
            "coords": [round(lat, 6), round(lng, 6)],
            "h3_9": None,
            "geohash_7": geohash7(lat, lng),
            "status": None,
            "created": None,
            "source": "synthetic:citizen_corpus",
            "source_ref": f"seed={args.seed}",
            "pii_redacted": True,
            "labels": {"labeler": "generator", "agreement": 1.0},
        })

    with open(args.out, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    by_dept, by_subtype = {}, {}
    for r in rows:
        by_dept[r["category_id"]] = by_dept.get(r["category_id"], 0) + 1
        by_subtype[r["subtype"]] = by_subtype.get(r["subtype"], 0) + 1
    digest = hashlib.sha256(open(args.out, "rb").read()).hexdigest()
    manifest = {
        "generator": "generate_citizen_corpus",
        "version": MAPPING_VERSION,
        "seed": args.seed,
        "total": args.total,
        "taxonomy_version": tax["version"],
        "dept_counts": by_dept,
        "subtypes_covered": len(by_subtype),
        "sha256": digest,
        "note": "seed-pinned; 60% of rows cluster around 8 hotspots (natural dup clusters for D5)",
    }
    with open(args.out + ".manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print(json.dumps(manifest, indent=2))
    print(f"done: {args.total} rows -> {args.out}")


if __name__ == "__main__":
    main()
