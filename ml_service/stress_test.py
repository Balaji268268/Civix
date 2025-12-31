
import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

test_cases = [
    # 1. Clear High Priority
    {"title": "Fire at Central Market", "description": "Huge flames, people trapped, urgent help needed!", "expected": {"priority": "High", "fake": False}},
    
    # 2. Clear Spam
    {"title": "Free Money", "description": "Click this link to win $10000 instantly! www.scam.com", "expected": {"fake": True}},
    
    # 3. Subtle Spam / Promotional
    {"title": "Best Road Repair Services", "description": "We offer cheap road repairs for your city. Call 555-0199 for a quote.", "expected": {"fake": True}},
    
    # 4. Ambiguous / Short
    {"title": "Broken", "description": "Fix it.", "expected": {"priority": "Low", "category": "Other"}},
    
    # 5. Gibberish
    {"title": "asdfasdf", "description": "qwerqwer zxcv", "expected": {"fake": True}},
    
    # 6. Valid but Poorly Written
    {"title": "road bad", "description": "big hole in stret near park fix fast", "expected": {"category": "Roads", "fake": False}},
    
    # 7. Safe/Valid Test
    {"title": "System Check", "description": "This is a test of the civic reporting system.", "expected": {"fake": False}},
    
    # 8. Adversarial (Urgent but Fake)
    {"title": "ALIEN INVASION", "description": "Aliens are attacking the city center! Send army!", "expected": {"fake": True}},
    
    # 9. Misleading Category
    {"title": "Water falling from sky", "description": "It is raining very heavily.", "expected": {"category": "Other", "priority": "Low"}} 
]

def test_endpoint(endpoint, data):
    try:
        res = requests.post(f"{BASE_URL}/{endpoint}", json=data)
        return res.json()
    except Exception as e:
        return {"error": str(e)}

print(f"{'TEST CASE':<40} | {'PRIORITY':<10} | {'FAKE':<10} | {'CATEGORY':<15} | {'CONF'}")
print("-" * 100)

for case in test_cases:
    payload = {"title": case["title"], "description": case["description"]}
    
    # Priority
    p_res = test_endpoint("predict-priority", payload)
    priority = p_res.get("priority", "N/A")
    
    # Fake
    f_res = test_endpoint("detect-fake", payload)
    is_fake = f_res.get("is_fake", False)
    fake_conf = f_res.get("fake_confidence", 0.0)
    
    # Category
    c_res = test_endpoint("categorize", payload)
    category = c_res.get("category", "N/A")
    
    title_short = (case["title"][:37] + '..') if len(case["title"]) > 37 else case["title"]
    
    print(f"{title_short:<40} | {priority:<10} | {str(is_fake):<10} | {category:<15} | {fake_conf:.2f}")

