#!/usr/bin/env python3
"""
Test script to verify customer_location is populated in qualified_leads table
"""

import requests
import json
from datetime import datetime

# Configuration
FASTAPI_URL = "http://localhost:8000"
TEST_LEAD_UID = "TEST_LEAD_001"

def test_customer_location_population():
    """Test that customer_location is populated when a lead is qualified"""
    
    print("🧪 Testing customer_location population in qualified_leads...")
    
    # Test data for lead qualification
    qualification_data = {
        "lead_uid": TEST_LEAD_UID,
        "customer_name": "Test Customer",
        "customer_mobile_number": "9876543210",
        "source": "website",
        "sub_source": "google_ads",
        "cre_name": "Test CRE",
        "lead_category": "New Car",
        "model_interested": "Innova",
        "first_remark": "Interested in buying",
        "variant": "VX",
        "buying_plan": "Cash",
        "finance_option": "No",
        "profession": "Business",
        "test_drive_type": "Yes",
        "trade_in": "No",
        "branch": "Mount Road",
        "customer_location": "Chennai, Tamil Nadu",  # This should be populated
        "followup_note": "Follow up next week"
    }
    
    try:
        # Step 1: Login as CRE user (you'll need to adjust credentials)
        login_data = {
            "username": "cre",  # Adjust based on your test user
            "password": "cre123"  # Adjust based on your test user
        }
        
        print("📝 Step 1: Logging in as CRE user...")
        login_response = requests.post(f"{FASTAPI_URL}/api/auth/login", json=login_data)
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return False
            
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")
        
        # Step 2: Qualify a lead
        print("📝 Step 2: Qualifying lead with customer_location...")
        qualify_response = requests.post(
            f"{FASTAPI_URL}/api/leads/{TEST_LEAD_UID}/qualify",
            json=qualification_data,
            headers=headers
        )
        
        if qualify_response.status_code != 200:
            print(f"❌ Lead qualification failed: {qualify_response.text}")
            return False
            
        print("✅ Lead qualified successfully")
        
        # Step 3: Check if customer_location is populated in qualified_leads
        print("📝 Step 3: Checking qualified_leads table...")
        qualified_leads_response = requests.get(
            f"{FASTAPI_URL}/api/qualified-leads",
            headers=headers
        )
        
        if qualified_leads_response.status_code != 200:
            print(f"❌ Failed to fetch qualified leads: {qualified_leads_response.text}")
            return False
            
        qualified_leads = qualified_leads_response.json()
        
        # Find our test lead
        test_lead = None
        for lead in qualified_leads:
            if lead.get("lead_uid") == TEST_LEAD_UID:
                test_lead = lead
                break
                
        if not test_lead:
            print(f"❌ Test lead not found in qualified_leads")
            return False
            
        # Check if customer_location is populated
        customer_location = test_lead.get("customer_location")
        if customer_location == "Chennai, Tamil Nadu":
            print("✅ customer_location is correctly populated in qualified_leads!")
            print(f"   Location: {customer_location}")
            return True
        else:
            print(f"❌ customer_location not populated correctly")
            print(f"   Expected: 'Chennai, Tamil Nadu'")
            print(f"   Actual: '{customer_location}'")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

def cleanup_test_data():
    """Clean up test data"""
    print("🧹 Cleaning up test data...")
    # You might want to add cleanup logic here
    pass

if __name__ == "__main__":
    print("🚀 Starting customer_location test...")
    print("=" * 50)
    
    success = test_customer_location_population()
    
    print("=" * 50)
    if success:
        print("🎉 All tests passed! customer_location is working correctly.")
    else:
        print("💥 Tests failed! Please check the implementation.")
        
    cleanup_test_data()

