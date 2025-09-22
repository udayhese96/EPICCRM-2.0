#!/usr/bin/env python3
"""
Check lead_master table structure and data for LD000529
"""

import os
import sys
from supabase import create_client, Client

# Add backend to path
sys.path.append('backend')

def check_lead_master():
    """Check if icrop_id column exists in lead_master and if LD000529 has data"""
    
    # Supabase configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
    SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "your-anon-key")
    
    # Create Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        print("🔍 Checking lead_master table structure and data for LD000529...")
        
        # Check if lead exists and get all columns
        response = supabase.table('lead_master').select('*').eq('uid', 'LD000529').execute()
        
        if response.data:
            lead = response.data[0]
            print(f"✅ Lead LD000529 found!")
            print(f"   - Customer: {lead.get('customer_name', 'N/A')}")
            print(f"   - ICROP ID: {lead.get('icrop_id', 'NULL')}")
            print(f"   - All columns: {list(lead.keys())}")
            
            # Check if icrop_id column exists
            if 'icrop_id' in lead:
                print(f"✅ icrop_id column exists in lead_master")
                print(f"   - Value: '{lead['icrop_id']}'")
                print(f"   - Type: {type(lead['icrop_id'])}")
                
                # If it's None, try to update it
                if lead['icrop_id'] is None:
                    print("⚠️ ICROP ID is NULL - attempting to set it to '1234512'...")
                    try:
                        update_response = supabase.table('lead_master').update({'icrop_id': '1234512'}).eq('uid', 'LD000529').execute()
                        if update_response.data:
                            print("✅ Successfully updated ICROP ID to '1234512'")
                        else:
                            print("❌ Failed to update ICROP ID")
                    except Exception as e:
                        print(f"❌ Error updating ICROP ID: {e}")
                else:
                    print(f"✅ ICROP ID already set: {lead['icrop_id']}")
            else:
                print("❌ icrop_id column does NOT exist in lead_master table")
                print("   - Need to run the SQL script to add the column")
        else:
            print("❌ Lead LD000529 not found in lead_master table")
            
        # Also check table structure
        print("\n🔍 Checking table structure...")
        try:
            # Try to get a sample record to see all columns
            sample_response = supabase.table('lead_master').select('*').limit(1).execute()
            if sample_response.data:
                sample_lead = sample_response.data[0]
                print(f"✅ Table columns: {list(sample_lead.keys())}")
                if 'icrop_id' in sample_lead:
                    print("✅ icrop_id column exists in table")
                else:
                    print("❌ icrop_id column missing from table")
            else:
                print("❌ No data in lead_master table")
        except Exception as e:
            print(f"❌ Error checking table structure: {e}")
            
    except Exception as e:
        print(f"❌ Error checking lead_master: {e}")

if __name__ == "__main__":
    check_lead_master()
