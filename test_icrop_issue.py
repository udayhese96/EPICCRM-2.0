#!/usr/bin/env python3
"""
Test script to check ICROP ID issue for lead LD000529
"""

import os
import sys
from supabase import create_client, Client

# Add backend to path
sys.path.append('backend')

def test_icrop_issue():
    """Test if lead LD000529 exists with ICROP ID"""
    
    # Supabase configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
    SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "your-anon-key")
    
    # Create Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        print("🔍 Testing ICROP ID issue for lead LD000529...")
        
        # Check if lead exists in lead_master
        response = supabase.table('lead_master').select('*').eq('uid', 'LD000529').execute()
        
        if response.data:
            lead = response.data[0]
            print(f"✅ Lead LD000529 found in lead_master:")
            print(f"   - Customer: {lead.get('customer_name', 'N/A')}")
            print(f"   - ICROP ID: {lead.get('icrop_id', 'NULL')}")
            print(f"   - Lead Status: {lead.get('lead_status', 'N/A')}")
            print(f"   - CRE Name: {lead.get('cre_name', 'N/A')}")
            
            # Check if it should appear in Sanjay's leads
            if lead.get('cre_name') == 'Sanjay':
                print("✅ Lead is assigned to Sanjay - should appear in API")
            else:
                print(f"⚠️ Lead is assigned to {lead.get('cre_name')} - won't appear in Sanjay's API")
                
        else:
            print("❌ Lead LD000529 not found in lead_master table")
            
        # Also check qualified_leads table
        print("\n🔍 Checking qualified_leads table...")
        ql_response = supabase.table('qualified_leads').select('*').eq('lead_uid', 'LD000529').execute()
        
        if ql_response.data:
            ql_lead = ql_response.data[0]
            print(f"✅ Lead LD000529 found in qualified_leads:")
            print(f"   - ICROP ID: {ql_lead.get('icrop_id', 'NULL')}")
        else:
            print("❌ Lead LD000529 not found in qualified_leads table")
            
    except Exception as e:
        print(f"❌ Error testing ICROP issue: {e}")

if __name__ == "__main__":
    test_icrop_issue()
