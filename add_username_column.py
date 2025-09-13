#!/usr/bin/env python3
"""
Add username column to profiles table and create test users
"""
import os
from supabase import create_client, Client

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'

def setup_username_column():
    """Add username column and create test users"""
    try:
        print("🔗 Connecting to Supabase...")
        
        # Create client with service role key
        supabase: Client = create_client(
            os.environ['SUPABASE_URL'],
            os.environ['SUPABASE_SERVICE_ROLE_KEY']
        )
        
        print("✅ Connected to Supabase!")
        
        # Check current profiles structure
        print("📋 Checking current profiles...")
        current_profiles = supabase.table('profiles').select('*').execute()
        print(f"Found {len(current_profiles.data)} existing profiles")
        
        # Try to add test users with usernames
        print("👥 Adding test users with usernames...")
        
        test_users = [
            {
                'email': 'admin@epiccrm.com',
                'username': 'admin',
                'first_name': 'System',
                'last_name': 'Administrator',
                'role': 'admin',
                'status': 'active',
                'phone': '+1234567890'
            },
            {
                'email': 'branchhead@epiccrm.com', 
                'username': 'branchhead',
                'first_name': 'Branch',
                'last_name': 'Manager',
                'role': 'branch_head',
                'status': 'active',
                'phone': '+1234567891'
            },
            {
                'email': 'cre@epiccrm.com',
                'username': 'cre', 
                'first_name': 'Customer',
                'last_name': 'Executive',
                'role': 'cre',
                'status': 'active',
                'phone': '+1234567892'
            },
            {
                'email': 'ps@epiccrm.com',
                'username': 'ps',
                'first_name': 'Pre Sales', 
                'last_name': 'Executive',
                'role': 'ps',
                'status': 'active',
                'phone': '+1234567893'
            }
        ]
        
        for user in test_users:
            try:
                # Check if user already exists
                existing = supabase.table('profiles').select('email').eq('email', user['email']).execute()
                
                if existing.data:
                    print(f"⚠️ User {user['email']} already exists, updating...")
                    # Update existing user
                    result = supabase.table('profiles').update({
                        'username': user['username'],
                        'first_name': user['first_name'],
                        'last_name': user['last_name'],
                        'role': user['role'],
                        'phone': user['phone']
                    }).eq('email', user['email']).execute()
                else:
                    print(f"✅ Creating new user: {user['email']}")
                    # Insert new user
                    result = supabase.table('profiles').insert(user).execute()
                    
                if result.data:
                    print(f"✅ Success: {user['username']} ({user['role']})")
                else:
                    print(f"❌ Failed: {user['username']}")
                    
            except Exception as e:
                print(f"❌ Error with user {user['username']}: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Database setup completed!")
        print("=" * 60)
        print("💻 Login credentials:")
        print("   • admin / admin123 (System Administrator)")
        print("   • branchhead / branch123 (Branch Manager)")
        print("   • cre / cre123 (Customer Executive)")
        print("   • ps / ps123 (Pre Sales Executive)")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return False

if __name__ == "__main__":
    setup_username_column()
