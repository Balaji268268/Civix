import requests
import json

# Use a session
session = requests.Session()

def check_analytics():
    print("\n--- Checking Admin Analytics API ---")
    try:
        # Note: This endpoint is protected in backend/controllers/analyticsController.js?
        # Let's check routes/analytics.js to see if it needs auth.
        # Assuming it does, this might fail with 401, but let's see the response code.
        resp = session.get('http://localhost:5000/api/admin/analytics')
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_analytics()
