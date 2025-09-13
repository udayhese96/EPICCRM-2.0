#!/usr/bin/env python3

import os
from supabase import create_client, Client

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'

print("🔗 Testing Supabase connection...")

try:
    # Create Supabase client
    supabase: Client = create_client(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_SERVICE_ROLE_KEY']
    )
    print("✅ Supabase client created successfully")
    
    # Test connection by trying to query admin_users table
    print("🔍 Testing admin_users table query...")
    response = supabase.table('admin_users').select('*').limit(1).execute()
    print(f"📊 Admin users response: {response}")
    
    # Test specific user query
    print("🔍 Testing specific user query (admin)...")
    response = supabase.table('admin_users').select('*').eq('username', 'admin').execute()
    print(f"📊 Admin user query result: {response}")
    
    if response.data:
        print(f"✅ Found admin user: {response.data[0]}")
    else:
        print("❌ No admin user found")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
