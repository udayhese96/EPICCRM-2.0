#!/usr/bin/env python3
"""
Test script for FastAPI analytics endpoints with authentication
"""

import requests
import json
import sys

FASTAPI_BASE_URL = "http://localhost:8000"

def get_auth_token():
    """Get authentication token by logging in"""
    try:
        # You'll need to replace these with actual credentials
        login_data = {
            "username": "admin",  # Replace with actual admin username
            "password": "admin123"  # Replace with actual admin password
        }
        
        response = requests.post(f"{FASTAPI_BASE_URL}/api/auth/login", json=login_data, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return data.get('access_token')
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{FASTAPI_BASE_URL}/analytics/health", timeout=5)
        print(f"Health Check Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Service Status: {data.get('status')}")
            print(f"Database: {data.get('database')}")
            return True
        else:
            print(f"Health check failed: {response.text}")
            return False
    except Exception as e:
        print(f"Health check error: {e}")
        return False

def test_ps_performance(branch="Cuddalore", auth_token=None):
    """Test the PS performance endpoint"""
    try:
        headers = {}
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'
            
        response = requests.get(
            f"{FASTAPI_BASE_URL}/analytics/sales-manager/ps-performance",
            params={"branch": branch},
            headers=headers,
            timeout=10
        )
        print(f"\nPS Performance Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success: {data.get('success')}")
            print(f"Branch: {data.get('branch')}")
            print(f"Requested By: {data.get('requested_by')}")
            print(f"User Role: {data.get('user_role')}")
            print(f"Total Records: {data.get('total_records', 0)}")
            print(f"Data Points: {len(data.get('data', []))}")
            
            # Show KPI Cards data
            kpi_cards = data.get('kpi_cards', {})
            if kpi_cards:
                print("\nKPI Cards:")
                for key, card in kpi_cards.items():
                    if 'percentage' in card:
                        print(f"  {card['label']}: {card['value']} ({card['percentage']}%)")
                    else:
                        print(f"  {card['label']}: {card['value']}")
            
            # Show PS Rankings data
            ps_rankings = data.get('ps_rankings', [])
            if ps_rankings:
                print("\nPS Rankings:")
                for ranking in ps_rankings[:5]:  # Show top 5
                    print(f"  #{ranking['rank']}: {ranking['ps_name']} - Won: {ranking['won_leads']}, Booked: {ranking['booked_leads']}")
                if len(ps_rankings) > 5:
                    print(f"  ... and {len(ps_rankings) - 5} more")
            
            # Show first few data points
            if data.get('data'):
                print("\nSample Data:")
                for i, item in enumerate(data['data'][:3]):
                    print(f"  {i+1}. {item}")
                if len(data['data']) > 3:
                    print(f"  ... and {len(data['data']) - 3} more")
            return True
        else:
            print(f"PS Performance failed: {response.text}")
            return False
    except Exception as e:
        print(f"PS Performance error: {e}")
        return False

def test_source_analytics(branch="Cuddalore", auth_token=None):
    """Test the source analytics endpoint"""
    try:
        headers = {}
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'
        
        response = requests.get(
            f"{FASTAPI_BASE_URL}/analytics/sales-manager/source-analytics",
            params={"branch": branch},
            headers=headers,
            timeout=10
        )
        print(f"\nSource Analytics Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success: {data.get('success')}")
            print(f"Branch: {data.get('branch')}")
            print(f"Requested By: {data.get('requested_by')}")
            print(f"User Role: {data.get('user_role')}")
            print(f"Total Records: {data.get('total_records', 0)}")
            print(f"Data Points: {len(data.get('data', []))}")
            
            # Show first few data points
            if data.get('data'):
                print("\nSample Source Data:")
                for i, item in enumerate(data['data'][:5]):
                    source_type = "Main Source" if item.get('is_main_source') else "Sub Source"
                    print(f"  {i+1}. {item.get('source')} - {item.get('count')} leads, {item.get('won')} won ({item.get('conversion_percentage')}%) - {source_type}")
                if len(data['data']) > 5:
                    print(f"  ... and {len(data['data']) - 5} more")
            return True
        else:
            print(f"Source Analytics failed: {response.text}")
            return False
    except Exception as e:
        print(f"Source Analytics error: {e}")
        return False

def test_branch_summary(branch="Cuddalore", auth_token=None):
    """Test the branch summary endpoint"""
    try:
        headers = {}
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'
        
        response = requests.get(
            f"{FASTAPI_BASE_URL}/analytics/sales-manager/branch-summary",
            params={"branch": branch},
            headers=headers,
            timeout=10
        )
        print(f"\nBranch Summary Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success: {data.get('success')}")
            print(f"Branch: {data.get('branch')}")
            print(f"Requested By: {data.get('requested_by')}")
            print(f"User Role: {data.get('user_role')}")
            summary = data.get('data', {})
            print(f"Total Leads: {summary.get('total_leads', 0)}")
            print(f"Total PS: {summary.get('total_ps', 0)}")
            print(f"Conversion Rate: {summary.get('conversion_rate', 0)}%")
            return True
        else:
            print(f"Branch Summary failed: {response.text}")
            return False
    except Exception as e:
        print(f"Branch Summary error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing FastAPI Analytics Endpoints with Authentication")
    print("=" * 60)
    
    # Test health check first
    if not test_health_check():
        print("\n❌ Health check failed. Make sure FastAPI backend is running.")
        print("Start it with: python fastapi_app/main.py")
        sys.exit(1)
    
    # Get authentication token
    print("\n🔐 Getting authentication token...")
    auth_token = get_auth_token()
    
    if not auth_token:
        print("❌ Failed to get authentication token. Please check credentials.")
        print("You may need to update the username/password in this script.")
        sys.exit(1)
    
    print("✅ Authentication token obtained")
    
    # Test PS performance with authentication
    test_ps_performance("Cuddalore", auth_token)
    
    # Test Source Analytics with authentication
    test_source_analytics("Cuddalore", auth_token)
    
    # Test branch summary with authentication
    test_branch_summary("Cuddalore", auth_token)
    
    # Test without authentication (should fail)
    print("\n🚫 Testing without authentication (should fail):")
    test_ps_performance("Cuddalore", None)
    
    print("\n✅ Testing completed!")
    print("\n📋 API Usage Examples:")
    print("1. PS Performance: GET /analytics/sales-manager/ps-performance?branch=Cuddalore")
    print("   Headers: Authorization: Bearer <token>")
    print("2. Source Analytics: GET /analytics/sales-manager/source-analytics?branch=Cuddalore")
    print("   Headers: Authorization: Bearer <token>")
    print("3. Branch Summary: GET /analytics/sales-manager/branch-summary?branch=Cuddalore")
    print("   Headers: Authorization: Bearer <token>")
