// Single Source of Truth for Categories (mirrored from ml_service/taxonomy.json v4)

export const TAXONOMY_VERSION = 4;

export const PUBLIC_CATEGORIES = [
  {
    id: "roads",
    label: "Roads & Bridges",
    dept: "Roads & Bridges Wing",
    subtypes: ["pothole", "road_damage", "footpath", "street_sign", "open_manhole", "speed_breaker", "crack", "bridge_damage"]
  },
  {
    id: "street_lighting",
    label: "Street Lighting",
    dept: "Street Lighting Dept",
    subtypes: ["light_out", "light_flickering", "light_broken", "pole_bent", "area_unlit", "light_not_working_night"]
  },
  {
    id: "electricity",
    label: "Electricity & Power",
    dept: "Power Utility (DISCOM) liaison",
    subtypes: ["power_cut", "transformer_issue", "hanging_wires", "pole_fallen", "voltage_fluctuation", "meter_fault"]
  },
  {
    id: "water_supply",
    label: "Water Supply",
    dept: "Water & Sewerage Dept",
    subtypes: ["no_water", "low_pressure", "dirty_water", "pipe_burst", "damaged_tank"]
  },
  {
    id: "sewerage_drainage",
    label: "Sewerage & Drainage",
    dept: "Water & Sewerage Dept",
    subtypes: ["drain_clogged", "sewage_overflow", "open_drain", "sewage_leak", "manhole_sewage"]
  },
  {
    id: "flood_management",
    label: "Flood & Waterlogging",
    dept: "Disaster Mgmt / Drainage",
    subtypes: ["waterlogging", "storm_drain_blocked", "bank_erosion", "underwater_area"]
  },
  {
    id: "solid_waste",
    label: "Sanitation & Solid Waste",
    dept: "Solid Waste Mgmt Dept",
    subtypes: ["garbage_not_collected", "illegal_dumping", "overflow_bin", "street_unclean", "construction_debris", "market_waste", "dead_animal", "foul_odour"]
  },
  {
    id: "traffic",
    label: "Traffic Management",
    dept: "Traffic Police / Mobility",
    subtypes: ["signal_fault", "illegal_parking", "road_encroachment", "no_zebra", "traffic_jam", "wrong_side_driving", "road_blocked", "sign_broken"]
  },
  {
    id: "public_transport",
    label: "Public Transport & Parking",
    dept: "Transit Dept",
    subtypes: ["bus_stop_damaged", "bus_service", "auto_stand", "parking_lot", "bus_route_gap"]
  },
  {
    id: "health_hospitals",
    label: "Public Health & Hospitals",
    dept: "Public Health / Medical Officer",
    subtypes: ["hospital_facility", "clinic_phc", "ambulance", "blood_bank", "health_camp", "food_safety", "disease_outbreak", "public_hygiene"]
  },
  {
    id: "parks_public_space",
    label: "Parks, Gardens & Public Spaces",
    dept: "Civic Amenities",
    subtypes: ["park_bench", "playground_equipment", "park_washroom", "park_lighting", "gate_locked", "garden_unclean"]
  },
  {
    id: "public_conveniences",
    label: "Public Conveniences",
    dept: "Civic Amenities",
    subtypes: ["public_toilet", "drinking_water_stand", "shelter_bench", "street_furniture"]
  },
  {
    id: "noise",
    label: "Noise Pollution",
    dept: "General Duty / Environment",
    subtypes: ["construction_noise", "loudspeaker", "factory_noise", "vehicle_noise", "late_night_noise"]
  },
  {
    id: "public_safety",
    label: "Public Safety & Stray Animals",
    dept: "General Duty / Animal Mgmt",
    subtypes: ["stray_dogs", "stray_cattle", "unsafe_area", "broken_fence", "suspicious_activity", "unsafe_crossing"]
  },
  {
    id: "encroachment",
    label: "Encroachment & Illegal Occupation",
    dept: "Encroachment Dept",
    subtypes: ["footpath_blocked", "road_blocked_structure", "canal_encroached", "unauthorized_awning"]
  },
  {
    id: "building_inspection",
    label: "Buildings & Hoardings",
    dept: "Building / Development Control",
    subtypes: ["structure_dilapidating", "hoarding_falling", "illegal_construction", "ceiling_damage_public"]
  },
  {
    id: "trees",
    label: "Street Trees",
    dept: "Civic Amenities / Horticulture",
    subtypes: ["branch_over_wires", "dead_tree_road", "roots_breaking_pavement", "pruning_needed"]
  },
  {
    id: "gas_fire_hazards",
    label: "Gas & Fire Hazards",
    dept: "Fire Safety / Gas Co liaison",
    subtypes: ["gas_leak", "street_fire", "flammable_storage", "smoke_hazard"]
  },
  {
    id: "markets_trade",
    label: "Markets, Weighing & Trade Hygiene",
    dept: "Markets & Weights (Dept of Consumer Affairs)",
    subtypes: ["rigged_weighing", "rotting_stock", "market_hygiene", "weighing_machine_fault"]
  },
  {
    id: "other",
    label: "Other / General",
    dept: "General Duty",
    subtypes: ["general_query", "suggestion", "unclassified"]
  }
];

export const PERSONAL_CATEGORIES = [
  { id: "billing", label: "Billing", dept: "Accounts", subtypes: ["bill_amount", "duplicate_bill", "bill_not_received"] },
  { id: "account_access", label: "Account Access", dept: "User Support", subtypes: ["login_issue", "password_reset", "profile_error"] },
  { id: "technical_support", label: "Technical Support", dept: "IT Support", subtypes: ["app_bug", "feature_help", "notification_issue"] },
  { id: "privacy", label: "Privacy", dept: "Compliance", subtypes: ["data_request", "data_removal", "exposure"] },
  { id: "feedback", label: "Feedback", dept: "Public Relations", subtypes: ["praise", "complaint_about_service", "suggestion"] },
  { id: "other", label: "Other", dept: "General Support", subtypes: ["unclassified"] }
];

export const LEGACY_CATEGORY_MAP = {
  "Roads": "roads",
  "Electricity": "electricity",
  "Lighting": "street_lighting",
  "Water": "water_supply",
  "Water Supply": "water_supply",
  "Sanitation": "solid_waste",
  "Garbage": "solid_waste",
  "Waste": "solid_waste",
  "Traffic": "traffic",
  "Public Transport": "public_transport",
  "Safety": "public_safety",
  "Noise": "noise",
  "Parks": "parks_public_space",
  "Hospital": "health_hospitals",
  "Health": "health_hospitals",
  "Drainage": "sewerage_drainage",
  "Flood": "flood_management",
  "Billing": "billing",
  "Profile": "account_access",
  "Account Access": "account_access",
  "Technical Support": "technical_support",
  "Feedback": "feedback",
  "Other": "other",
  "General": "other"
};

export const normalizeCategory = (input) => {
  if (!input) return "other";
  const trimmed = input.trim();
  if (PUBLIC_CATEGORIES.some(c => c.id === trimmed) || PERSONAL_CATEGORIES.some(c => c.id === trimmed)) {
    return trimmed;
  }
  return LEGACY_CATEGORY_MAP[trimmed] || "other";
};

export const getCategoryMeta = (categoryId) => {
  const normalized = normalizeCategory(categoryId);
  return PUBLIC_CATEGORIES.find(c => c.id === normalized) ||
         PERSONAL_CATEGORIES.find(c => c.id === normalized) ||
         PUBLIC_CATEGORIES.find(c => c.id === 'other');
};
