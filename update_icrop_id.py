#!/usr/bin/env python3
"""
Update ICROP ID for lead LD000529
"""

import os
import sys
from supabase import create_client, Client

# Add backend to path
sys.path.append('backend')

def update_icrop_id():
    """Update ICROP ID for lead LD000529"""
    
    # Supabase configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
    SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "your-anon-key")
    
    # Create Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        print("🔍 Checking current ICROP ID for lead LD000529...")
        
        # First, check current value
        response = supabase.table('lead_master').select('uid, customer_name, icrop_id').eq('uid', 'LD000529').execute()
        
        if response.data:
            lead = response.data[0]
            print(f"✅ Lead LD000529 found!")
            print(f"   - Customer: {lead.get('customer_name', 'N/A')}")
            print(f"   - Current ICROP ID: {lead.get('icrop_id', 'NULL')}")
            
            # Update the ICROP ID
            print("\n🔧 Updating ICROP ID to '1234512'...")
            update_response = supabase.table('lead_master').update({'icrop_id': '1234512'}).eq('uid', 'LD000529').execute()
            
            if update_response.data:
                updated_lead = update_response.data[0]
                print(f"✅ Successfully updated ICROP ID!")
                print(f"   - New ICROP ID: {updated_lead.get('icrop_id', 'NULL')}")
                
                # Verify the update
                print("\n🔍 Verifying the update...")
                verify_response = supabase.table('lead_master').select('uid, icrop_id').eq('uid', 'LD000529').execute()
                if verify_response.data:
                    verify_lead = verify_response.data[0]
                    print(f"✅ Verification successful!")
                    print(f"   - Lead UID: {verify_lead.get('uid')}")
                    print(f"   - ICROP ID: {verify_lead.get('icrop_id')}")
                    return True
                else:
                    print("❌ Verification failed - could not fetch updated lead")
                    return False
            else:
                print("❌ Failed to update ICROP ID")
                return False
        else:
            print("❌ Lead LD000529 not found in lead_master table")
            return False
            
    except Exception as e:
        print(f"❌ Error updating ICROP ID: {e}")
        return False

if __name__ == "__main__":
    success = update_icrop_id()
    if success:
        print("\n🎉 ICROP ID update completed successfully!")
        print("   Now refresh your CRE dashboard to see the ICROP ID!")
    else:
        print("\n❌ ICROP ID update failed!")
