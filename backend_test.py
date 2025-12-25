#!/usr/bin/env python3
"""
Backend API Testing for Hawklets Landing Page
Tests the waitlist endpoints with comprehensive scenarios
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend environment
BACKEND_URL = "https://progress-verify.preview.emergentagent.com/api"

def test_post_waitlist():
    """Test POST /api/waitlist endpoint"""
    print("=" * 60)
    print("TESTING POST /api/waitlist")
    print("=" * 60)
    
    # Test 1: Valid email with name
    print("\n1. Testing valid email with name...")
    test_data = {
        "email": "john.doe@example.com",
        "name": "John Doe"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/waitlist", json=test_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("message") == "Successfully added to waitlist":
                print("✅ PASS: Valid email with name")
            else:
                print("❌ FAIL: Unexpected response format")
        else:
            print("❌ FAIL: Expected 200 status code")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    # Test 2: Valid email without name
    print("\n2. Testing valid email without name...")
    test_data = {
        "email": "jane.smith@example.com"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/waitlist", json=test_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("message") == "Successfully added to waitlist":
                print("✅ PASS: Valid email without name")
            else:
                print("❌ FAIL: Unexpected response format")
        else:
            print("❌ FAIL: Expected 200 status code")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    # Test 3: Duplicate email (should return 400)
    print("\n3. Testing duplicate email...")
    test_data = {
        "email": "john.doe@example.com",
        "name": "John Duplicate"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/waitlist", json=test_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "already registered" in data.get("detail", "").lower():
                print("✅ PASS: Duplicate email properly rejected")
            else:
                print("❌ FAIL: Wrong error message for duplicate")
        else:
            print("❌ FAIL: Expected 400 status code for duplicate")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    # Test 4: Invalid email format
    print("\n4. Testing invalid email format...")
    test_data = {
        "email": "invalid-email",
        "name": "Invalid User"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/waitlist", json=test_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 422:
            print("✅ PASS: Invalid email format properly rejected")
        else:
            print("❌ FAIL: Expected 422 status code for invalid email")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    # Test 5: Missing email field
    print("\n5. Testing missing email field...")
    test_data = {
        "name": "No Email User"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/waitlist", json=test_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 422:
            print("✅ PASS: Missing email field properly rejected")
        else:
            print("❌ FAIL: Expected 422 status code for missing email")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

def test_get_waitlist():
    """Test GET /api/waitlist endpoint"""
    print("\n" + "=" * 60)
    print("TESTING GET /api/waitlist")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BACKEND_URL}/waitlist", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "count" in data and "data" in data:
                print("✅ PASS: GET waitlist returns proper format")
                print(f"Total entries: {data.get('count')}")
                
                # Check if entries are sorted by created_at descending
                entries = data.get("data", [])
                if len(entries) > 1:
                    # Check if sorted properly (most recent first)
                    timestamps = []
                    for entry in entries:
                        if hasattr(entry, 'created_at'):
                            timestamps.append(entry.created_at)
                        elif isinstance(entry, dict) and 'created_at' in entry:
                            timestamps.append(entry['created_at'])
                    
                    if len(timestamps) > 1:
                        is_sorted = all(timestamps[i] >= timestamps[i+1] for i in range(len(timestamps)-1))
                        if is_sorted:
                            print("✅ PASS: Entries properly sorted by created_at descending")
                        else:
                            print("❌ FAIL: Entries not properly sorted")
                    else:
                        print("ℹ️  INFO: Cannot verify sorting with current data structure")
                else:
                    print("ℹ️  INFO: Less than 2 entries, cannot verify sorting")
            else:
                print("❌ FAIL: Unexpected response format")
        else:
            print("❌ FAIL: Expected 200 status code")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

def main():
    """Run all backend tests"""
    print("HAWKLETS BACKEND API TESTING")
    print(f"Testing against: {BACKEND_URL}")
    print(f"Test started at: {datetime.now()}")
    
    # Test POST endpoint
    test_post_waitlist()
    
    # Test GET endpoint
    test_get_waitlist()
    
    print("\n" + "=" * 60)
    print("TESTING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()