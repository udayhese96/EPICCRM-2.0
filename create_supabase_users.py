#!/usr/bin/env python3
"""
Create test users in Supabase Auth
"""
import os
from supabase import create_client, Client

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'

def create_test_users():
    """Create test users in Supabase Auth"""
    try:
        print("🔗 Connecting to Supabase...")
        
        # Create client with service role key
        supabase: Client = create_client(
            os.environ['SUPABASE_URL'],
            os.environ['SUPABASE_SERVICE_ROLE_KEY']
        )
        
        print("✅ Connected to Supabase!")
        
        # Test users to create
        test_users = [
            {
                "email": "admin@epiccrm.com",
                "password": "admin123",
                "role": "admin"
            },
            {
                "email": "cre@epiccrm.com", 
                "password": "cre123",
                "role": "cre"
            },
            {
                "email": "ps@epiccrm.com",
                "password": "ps123", 
                "role": "ps"
            },
            {
                "email": "branchhead@epiccrm.com",
                "password": "branch123",
                "role": "branch_head"
            }
        ]
        
        print("👥 Creating test users in Supabase Auth...")
        
        for user_data in test_users:
            try:
                # Create user in Supabase Auth
                response = supabase.auth.admin_create_user({
                    "email": user_data["email"],
                    "password": user_data["password"],
                    "email_confirm": True,
                    "user_metadata": {
                        "role": user_data["role"]
                    }
                })
                
                if response.user:
                    print(f"✅ Created user: {user_data['email']} ({user_data['role']})")
                else:
                    print(f"⚠️ Failed to create user: {user_data['email']}")
                    
            except Exception as e:
                print(f"⚠️ Error creating user {user_data['email']}: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Supabase Auth users creation completed!")
        print("=" * 60)
        print("💻 You can now login with:")
        print("   • admin@epiccrm.com / admin123")
        print("   • cre@epiccrm.com / cre123") 
        print("   • ps@epiccrm.com / ps123")
        print("   • branchhead@epiccrm.com / branch123")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create users: {e}")
        return False

if __name__ == "__main__":
    create_test_users()
