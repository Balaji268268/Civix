import requests
import json

# Use a session to persist cookies (important for CSRF)
session = requests.Session()

print("1. Fetching CSRF Token...")
try:
    csrf_resp = session.get('http://localhost:5000/api/csrf-token')
    if csrf_resp.status_code != 200:
        print(f"Failed to get CSRF token: {csrf_resp.status_code}")
        exit(1)
        
    csrf_token = csrf_resp.json().get('csrfToken')
    print(f"   Token: {csrf_token}")
    
    # Headers for next request
    headers = {
        'X-CSRF-Token': csrf_token,
        'Content-Type': 'application/json'
    }

    # 2. Submit High Priority Issue
    payload = {
        'title': 'Emergency Fire Report', 
        'description': 'There is a massive fire in the downtown market area. Lives are at risk. Please send help immediately.',
        'phone': '9999999999',
        'email': 'test@example.com',
        'location': 'Downtown Market',
        'isPrivate': False,
        'notifyByEmail': False
    }

    print("\n2. Submitting High Priority Issue...")
    resp = session.post('http://localhost:5000/api/issues', json=payload, headers=headers)
    
    print(f"   Response: {resp.status_code}")
    if resp.status_code == 201:
        data = resp.json()
        issue_id = data['issue']['_id']
        priority = data['issue'].get('priority', 'Unknown')
        print(f"   SUCCESS! Issue Created: {issue_id}")
        print(f"   Priority: {priority}")
        
        if priority == "High":
             print("\n   [PASS] Issue classified as High Priority. Admin Notification should be created.")
        else:
             print(f"\n   [FAIL] Expected High Priority, got {priority}.")
             
    else:
        print(f"   Failed: {resp.text}")

except Exception as e:
    print(f"Script Error: {e}")
