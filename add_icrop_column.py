#!/usr/bin/env python3
"""
Add icrop_id column to lead_master table if it doesn't exist
"""

import os
import sys
from supabase import create_client, Client

# Add backend to path
sys.path.append('backend')

def add_icrop_column():
    """Add icrop_id column to lead_master table"""
    
    # Supabase configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
    SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "your-anon-key")
    
    # Create Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        print("🔧 Adding icrop_id column to lead_master table...")
        
        # First, check if the column already exists
        print("🔍 Checking if icrop_id column exists...")
        try:
            # Try to select icrop_id from lead_master
            response = supabase.table('lead_master').select('icrop_id').limit(1).execute()
            print("✅ icrop_id column already exists in lead_master table")
            return True
        except Exception as e:
            if "column" in str(e).lower() and "does not exist" in str(e).lower():
                print("❌ icrop_id column does not exist - need to add it")
            else:
                print(f"❌ Error checking column: {e}")
                return False
        
        # If we reach here, the column doesn't exist
        print("🔧 Adding icrop_id column to lead_master table...")
        
        # Use RPC to execute SQL
        try:
            # Execute the SQL to add the column
            result = supabase.rpc('exec_sql', {
                'sql': """
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'lead_master' 
                        AND column_name = 'icrop_id'
                    ) THEN
                        ALTER TABLE lead_master ADD COLUMN icrop_id VARCHAR(50);
                        COMMENT ON COLUMN lead_master.icrop_id IS 'ICROP ID assigned by CRE ICROP user';
                    END IF;
                END $$;
                """
            }).execute()
            
            print("✅ Successfully added icrop_id column to lead_master table")
            
            # Now try to set the ICROP ID for LD000529
            print("🔧 Setting ICROP ID for lead LD000529...")
            update_response = supabase.table('lead_master').update({'icrop_id': '1234512'}).eq('uid', 'LD000529').execute()
            
            if update_response.data:
                print("✅ Successfully set ICROP ID '1234512' for lead LD000529")
            else:
                print("❌ Failed to set ICROP ID for lead LD000529")
            
            return True
            
        except Exception as e:
            print(f"❌ Error adding column: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error in add_icrop_column: {e}")
        return False

if __name__ == "__main__":
    success = add_icrop_column()
    if success:
        print("\n🎉 ICROP ID column setup completed!")
    else:
        print("\n❌ ICROP ID column setup failed!")
