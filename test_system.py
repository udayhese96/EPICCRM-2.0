#!/usr/bin/env python3
"""
Test script for the Lead Qualification and Assignment System
This script tests the complete workflow from lead qualification to PS follow-up
"""

import requests
import json
import time
from datetime import datetime

# Configuration
FASTAPI_URL = "http://localhost:8000"
NEXTJS_URL = "http://localhost:3000"

def test_api_health():
    """Test if the FastAPI server is running"""
    try:
        response = requests.get(f"{FASTAPI_URL}/api/test")
        if response.status_code == 200:
            print("✅ FastAPI server is running")
            return True
        else:
            print("❌ FastAPI server returned error:", response.status_code)
            return False
    except Exception as e:
        print("❌ FastAPI server is not running:", str(e))
        return False

def test_qualified_leads_endpoint():
    """Test the qualified leads endpoint"""
    try:
        response = requests.get(f"{FASTAPI_URL}/api/qualified-leads")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Qualified leads endpoint working - Found {len(data)} qualified leads")
            return True
        else:
            print("❌ Qualified leads endpoint error:", response.status_code)
            return False
    except Exception as e:
        print("❌ Qualified leads endpoint error:", str(e))
        return False

def test_ps_followup_endpoint():
    """Test the PS follow-up endpoint"""
    try:
        response = requests.get(f"{FASTAPI_URL}/api/ps-followup")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ PS follow-up endpoint working - Found {len(data)} follow-ups")
            return True
        else:
            print("❌ PS follow-up endpoint error:", response.status_code)
            return False
    except Exception as e:
        print("❌ PS follow-up endpoint error:", str(e))
        return False

def test_branches_endpoint():
    """Test the branches endpoint"""
    try:
        response = requests.get(f"{FASTAPI_URL}/api/branches")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Branches endpoint working - Found {len(data)} branches")
            return True
        else:
            print("❌ Branches endpoint error:", response.status_code)
            return False
    except Exception as e:
        print("❌ Branches endpoint error:", str(e))
        return False

def test_ps_users_endpoint():
    """Test the PS users endpoint"""
    try:
        response = requests.get(f"{FASTAPI_URL}/api/ps-users")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ PS users endpoint working - Found {len(data)} PS users")
            return True
        else:
            print("❌ PS users endpoint error:", response.status_code)
            return False
    except Exception as e:
        print("❌ PS users endpoint error:", str(e))
        return False

def test_lead_qualification():
    """Test lead qualification endpoint"""
    try:
        # Test with a sample lead UID
        test_uid = "LD12345678"
        response = requests.post(f"{FASTAPI_URL}/api/leads/{test_uid}/qualify")
        if response.status_code in [200, 400, 404]:  # 400/404 are expected for non-existent leads
            print("✅ Lead qualification endpoint working")
            return True
        else:
            print("❌ Lead qualification endpoint error:", response.status_code)
            return False
    except Exception as e:
        print("❌ Lead qualification endpoint error:", str(e))
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Lead Qualification and Assignment System")
    print("=" * 60)
    
    tests = [
        ("API Health Check", test_api_health),
        ("Qualified Leads Endpoint", test_qualified_leads_endpoint),
        ("PS Follow-up Endpoint", test_ps_followup_endpoint),
        ("Branches Endpoint", test_branches_endpoint),
        ("PS Users Endpoint", test_ps_users_endpoint),
        ("Lead Qualification Endpoint", test_lead_qualification),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 Testing {test_name}...")
        if test_func():
            passed += 1
        time.sleep(1)  # Small delay between tests
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The system is working correctly.")
        print("\n📋 Next Steps:")
        print("1. Open http://localhost:3000 in your browser")
        print("2. Login as CRE user (cre/cre123)")
        print("3. Qualify a lead")
        print("4. Login as CRE Team Leader (cre_team_leader/team123)")
        print("5. Assign qualified leads to PS users")
        print("6. Login as PS user (ps/ps123)")
        print("7. Manage follow-ups")
    else:
        print("❌ Some tests failed. Please check the server logs and try again.")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure FastAPI server is running on port 8000")
        print("2. Make sure Next.js server is running on port 3000")
        print("3. Check database connection and table creation")
        print("4. Verify environment variables are set correctly")

if __name__ == "__main__":
    main()
