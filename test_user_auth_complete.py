#!/usr/bin/env python3
"""
Complete user authentication test covering all available endpoints.
Tests: registration, login, current user, refresh token, account update, and deletion.
"""

import requests
import json
import sys
import time

# Configuration
BASE_URL = "https://hawklets.com/api"
API_KEY = "51e93a68b99c61732b0920819f679e98491b751456e672e841a52536dcf0c7b1"

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with API key header."""
    url = f"{BASE_URL}{endpoint}"
    
    # Default headers
    request_headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    # Add custom headers if provided
    if headers:
        request_headers.update(headers)
    
    # Remove Content-Type for GET requests without body
    if method.upper() == "GET" and not data:
        request_headers.pop("Content-Type", None)
    
    try:
        response = requests.request(
            method=method,
            url=url,
            json=data,
            headers=request_headers,
            timeout=10
        )
        
        return {
            "status": response.status_code,
            "data": response.json() if response.text else {},
            "headers": dict(response.headers)
        }
    except Exception as e:
        return {
            "status": 0,
            "data": {"error": str(e)},
            "headers": {}
        }

def test_registration():
    """Test user registration endpoint."""
    print("\n1. Testing Registration (POST /auth/register)")
    
    # Generate unique test data
    timestamp = int(time.time())
    test_email = f"test_user_{timestamp}@example.com"
    test_display_name = f"Test User {timestamp}"
    test_password = f"TestPassword{timestamp}!"
    
    data = {
        "email": test_email,
        "display_name": test_display_name,
        "password": test_password
    }
    
    result = make_request("POST", "/auth/register", data)
    
    print(f"   Status: {result['status']}")
    
    if result['status'] == 200:
        user_id = result['data'].get('id')
        print(f"   [OK] Registration successful!")
        print(f"   User ID: {user_id}")
        print(f"   Email: {test_email}")
        return True, test_email, test_password, user_id, test_display_name
    else:
        print(f"   [FAIL] Registration failed: {result['data']}")
        return False, None, None, None, None

def test_login(email, password):
    """Test user login endpoint with email field."""
    print("\n2. Testing Login (POST /auth/login)")
    
    data = {
        "email": email,
        "password": password
    }
    
    result = make_request("POST", "/auth/login", data)
    
    print(f"   Status: {result['status']}")
    
    if result['status'] == 200:
        access_token = result['data'].get('access_token')
        refresh_token = result['data'].get('refresh_token')
        
        if access_token and refresh_token:
            print(f"   [OK] Login successful!")
            print(f"   Access Token: {access_token[:30]}...")
            print(f"   Refresh Token: {refresh_token[:30]}...")
            return True, access_token, refresh_token
        else:
            print(f"   [FAIL] Login response missing tokens")
    else:
        print(f"   [FAIL] Login failed: {result['data']}")
    
    return False, None, None

def test_get_current_user(access_token):
    """Test GET /auth/me endpoint."""
    print("\n3. Testing Get Current User (GET /auth/me)")
    
    if not access_token:
        print("   [FAIL] No access token available")
        return False
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    result = make_request("GET", "/auth/me", headers=headers)
    
    print(f"   Status: {result['status']}")
    
    if result['status'] == 200:
        user_data = result['data']
        print(f"   [OK] Get current user successful!")
        print(f"   User ID: {user_data.get('id')}")
        print(f"   Email: {user_data.get('email')}")
        print(f"   Display Name: {user_data.get('display_name')}")
        return True
    else:
        print(f"   [FAIL] Get current user failed: {result['data']}")
        return False

def test_refresh_token(refresh_token):
    """Test refresh token endpoint with JSON body."""
    print("\n4. Testing Refresh Token (POST /auth/refresh)")
    
    if not refresh_token:
        print("   [FAIL] No refresh token available")
        return False, None, None
    
    data = {
        "refresh_token": refresh_token
    }
    
    result = make_request("POST", "/auth/refresh", data)
    
    print(f"   Status: {result['status']}")
    
    if result['status'] == 200:
        new_access_token = result['data'].get('access_token')
        new_refresh_token = result['data'].get('refresh_token')
        
        if new_access_token:
            print(f"   [OK] Refresh token successful!")
            print(f"   New Access Token: {new_access_token[:30]}...")
            
            if new_refresh_token:
                print(f"   New Refresh Token: {new_refresh_token[:30]}...")
            
            return True, new_access_token, new_refresh_token
        else:
            print(f"   [FAIL] Refresh response missing access token")
    else:
        print(f"   [FAIL] Refresh token failed: {result['data']}")
    
    return False, None, None

def test_account_update(access_token, original_display_name):
    """Test account update endpoint."""
    print("\n5. Testing Account Update (PUT /auth/update)")
    
    if not access_token:
        print("   [FAIL] No access token available")
        return False, None
    
    new_display_name = f"Updated {original_display_name}"
    
    data = {
        "display_name": new_display_name,
        "password": "NewPassword123!"  # Optional: update password
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    result = make_request("PUT", "/auth/update", data, headers)
    
    print(f"   Status: {result['status']}")
    
    if result['status'] == 200:
        updated_name = result['data'].get('display_name')
        if updated_name == new_display_name:
            print(f"   [OK] Account update successful!")
            print(f"   New Display Name: {updated_name}")
            return True, new_display_name
        else:
            print(f"   [FAIL] Account update response doesn't match")
    else:
        print(f"   [FAIL] Account update failed: {result['data']}")
    
    return False, original_display_name

def test_account_deletion(access_token):
    """Test account deletion endpoint."""
    print("\n6. Testing Account Deletion (DELETE /auth/delete)")
    
    if not access_token:
        print("   [FAIL] No access token available")
        return False
    
    data = {
        "confirm": True
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    result = make_request("DELETE", "/auth/delete", data, headers)
    
    print(f"   Status: {result['status']}")
    
    if result['status'] == 200:
        print(f"   [OK] Account deletion successful!")
        return True
    else:
        print(f"   [FAIL] Account deletion failed: {result['data']}")
    
    return False

def test_deleted_account_access(access_token):
    """Verify that deleted account can no longer access protected endpoints."""
    print("\n7. Testing Deleted Account Access (should fail)")
    
    if not access_token:
        print("   [SKIP] No access token available")
        return True  # Not a failure
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    result = make_request("GET", "/auth/me", headers=headers)
    
    print(f"   Status: {result['status']}")
    
    # Should fail with 401 or 404
    if result['status'] in [401, 404, 403]:
        print(f"   [OK] Deleted account access correctly rejected")
        return True
    else:
        print(f"   [WARN] Deleted account still accessible (status: {result['status']})")
        return False

def main():
    """Main entry point."""
    print("="*60)
    print("COMPLETE USER AUTHENTICATION TEST")
    print("="*60)
    print(f"Testing API at: {BASE_URL}")
    print("="*60)
    
    # Track test results
    results = {}
    
    # Test 1: Registration
    reg_success, email, password, user_id, display_name = test_registration()
    results['registration'] = reg_success
    if not reg_success:
        print("\n[ABORT] Registration failed, cannot continue with other tests")
        sys.exit(1)
    
    # Test 2: Login
    login_success, access_token, refresh_token = test_login(email, password)
    results['login'] = login_success
    if not login_success:
        print("\n[ABORT] Login failed, cannot continue with other tests")
        sys.exit(1)
    
    # Test 3: Get Current User
    results['get_current_user'] = test_get_current_user(access_token)
    
    # Test 4: Refresh Token
    refresh_success, new_access_token, new_refresh_token = test_refresh_token(refresh_token)
    results['refresh_token'] = refresh_success
    
    # Use new tokens if refresh was successful
    if refresh_success and new_access_token:
        access_token = new_access_token
    if refresh_success and new_refresh_token:
        refresh_token = new_refresh_token
    
    # Test 5: Account Update
    update_success, updated_display_name = test_account_update(access_token, display_name)
    results['account_update'] = update_success
    
    # Test 6: Account Deletion
    results['account_deletion'] = test_account_deletion(access_token)
    
    # Test 7: Verify deletion
    results['deleted_account_access'] = test_deleted_account_access(access_token)
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    test_names = {
        'registration': '1. Registration (POST /auth/register)',
        'login': '2. Login (POST /auth/login)',
        'get_current_user': '3. Get Current User (GET /auth/me)',
        'refresh_token': '4. Refresh Token (POST /auth/refresh)',
        'account_update': '5. Account Update (PUT /auth/update)',
        'account_deletion': '6. Account Deletion (DELETE /auth/delete)',
        'deleted_account_access': '7. Deleted Account Access Check'
    }
    
    passed = 0
    total = len(results)
    
    for test_key, test_description in test_names.items():
        success = results.get(test_key, False)
        status = "[OK] PASS" if success else "[FAIL] FAIL"
        print(f"{test_description:45} {status}")
        if success:
            passed += 1
    
    print("="*60)
    print(f"TOTAL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("="*60)
    
    if passed == total:
        print("\n[SUCCESS] All user authentication endpoints are working correctly!")
        print("The API now supports complete user account management lifecycle.")
    else:
        print(f"\n[WARNING] {total - passed} test(s) failed")
        print("Some endpoints may need further investigation.")
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)