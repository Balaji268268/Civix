
import pandas as pd
import random
import os

# vocabulary
locations = ["Main St", "5th Avenue", "Sector 4", "Gandhi Nagar", "MG Road", "Central Park", "Market Area", 
             "Highway 66", "Railway Station", "Bus Stand", "City Center", "Industrial Area", "Suburbs", 
             "School Zone", "Hospital Road", "River Bank", "Flyover", "Underpass"]

priorities = ["High", "Medium", "Low"]

categories = {
    "Roads": ["pothole", "broken road", "uneven surface", "bad road condition", "manhole open", "speed breaker issue"],
    "Water Supply": ["water leakage", "no water supply", "dirty water", "pipe burst", "low pressure", "contaminated water"],
    "Electricity": ["street light off", "power cut", "transformer spark", "hanging wires", "electric pole fell"],
    "Sanitation": ["garbage pile", "overflowing dustbin", "bad smell", "dead animal", "clogged drain", "sewage overflow"],
    "Traffic": ["traffic signal broken", "traffic jam", "illegal parking", "wrong side driving", "road blocked"],
    "Safety": ["stray dogs", "unlit area", "suspicious activity", "unsafe crossing", "broken fence"],
    "Public Transport": ["bus late", "bus stop broken", "rude conductor", "overcrowded bus"],
    "Noise": ["loud music", "construction noise", "factory noise", "late night party"],
    "General": ["park maintenance", "lost property", "general query", "request information"]
}

spam_phrases = [
    "click this link", "free money", "lottery winner", "buy watches", "cheap meds", "verify account", 
    "earn from home", "dating site", "crypto investment", "job offer", "sign up now", "subscribe for free"
]

# Generators
def generate_valid_issue():
    cat = random.choice(list(categories.keys()))
    issue = random.choice(categories[cat])
    loc = random.choice(locations)
    
    templates = [
        f"There is a {issue} at {loc}.",
        f"We are facing {issue} problems in {loc}.",
        f"Please fix the {issue} near {loc}.",
        f"Severe {issue} observed at {loc}, urgent help needed.",
        f"{issue} reported by residents of {loc}.",
        f"Complaining about {issue} near {loc}.",
        f"The {issue} at {loc} is very dangerous.",
        f"Urgent attention required for {issue} in {loc}."
    ]
    
    text = random.choice(templates)
    
    # Priority logic (semi-realistic)
    if "urgent" in text.lower() or "dangerous" in text.lower() or cat in ["Electricity", "Water Supply"]:
         prior = "High"
    elif cat in ["Roads", "Sanitation"]:
         prior = "Medium"
    else:
         prior = "Low"
         
    return text, prior, cat, 0 # is_fake = 0

def generate_spam_issue():
    phrase = random.choice(spam_phrases)
    text = f"{phrase} {random.randint(100,999)}"
    return text, "Low", "Spam", 1 # is_fake = 1

# Generate Data
data = []
for _ in range(450): # Generate 450 actual issues (x10 later or loop more)
    data.append(generate_valid_issue())

for _ in range(50): # Generate 50 spams
    data.append(generate_spam_issue())

# Expand to 5000
full_data = []
for _ in range(10): # 500 * 10 = 5000 rows
    for row in data:
       # Add slight variation to avoid exact duplicates if needed, or just repeat
       # For ML training, repeats are okay-ish if we shuffle, but better to vary.
       # Re-generating is better.
       pass

# Re-do with loop for 5000
final_data = []
for i in range(5000):
    if random.random() < 0.05: # 5% spam
        final_data.append(generate_spam_issue())
    else:
        final_data.append(generate_valid_issue())

df = pd.DataFrame(final_data, columns=["text", "priority", "category", "is_fake"])

# Save
file_path = os.path.join(os.path.dirname(__file__), "civic_data.csv")
df.to_csv(file_path, index=False, quotechar='"')
print(f"Generated {len(df)} rows to {file_path}")
