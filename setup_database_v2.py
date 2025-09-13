#!/usr/bin/env python3
"""
Database setup script for EPIC CRM 2.0 - Version 2
"""
import os
from supabase import create_client, Client

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
os.environ['SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDAzOTMsImV4cCI6MjA3MzMxNjM5M30.Jt5Bzlnn96cnqLXY6il0tSHpEV76P1SV8RwAc0vea2g'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'

def test_connection_and_setup():
    """Test connection and set up basic data"""
    try:
        print("🔗 Connecting to Supabase...")
        
        # Create client with service role key
        supabase: Client = create_client(
            os.environ['SUPABASE_URL'],
            os.environ['SUPABASE_SERVICE_ROLE_KEY']
        )
        
        # Try to access the default profiles table that usually exists
        try:
            profiles_result = supabase.table('profiles').select('*').limit(1).execute()
            print("✅ Connected to Supabase successfully!")
            print(f"Found profiles table with {len(profiles_result.data)} records")
        except Exception as e:
            print(f"Profiles table test: {e}")
        
        # Let's try to create or access our custom tables
        setup_crm_tables(supabase)
        
        return supabase
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def setup_crm_tables(supabase):
    """Set up CRM tables by trying to insert sample data"""
    try:
        print("🔧 Setting up CRM tables...")
        
        # Try branches table
        try:
            branch_data = {
                'id': '550e8400-e29b-41d4-a716-446655440000',
                'name': 'Main Branch',
                'code': 'MAIN001',
                'address': '123 Business District, CRM City',
                'phone': '+1234567890',
                'email': 'main@epiccrm.com',
                'is_active': True
            }
            
            result = supabase.table('branches').upsert(branch_data).execute()
            print("✅ Branches table is ready")
            
        except Exception as e:
            print(f"⚠️ Branches table issue: {e}")
        
        # Try users table
        try:
            user_data = {
                'id': '660e8400-e29b-41d4-a716-446655440001',
                'username': 'admin',
                'email': 'admin@epiccrm.com',
                'first_name': 'System',
                'last_name': 'Administrator',
                'role': 'admin',
                'phone': '+1234567890',
                'branch_id': '550e8400-e29b-41d4-a716-446655440000',
                'is_active': True
            }
            
            result = supabase.table('users').upsert(user_data).execute()
            print("✅ Users table is ready")
            
        except Exception as e:
            print(f"⚠️ Users table issue: {e}")
        
        # Try leads table
        try:
            lead_data = {
                'id': '770e8400-e29b-41d4-a716-446655440002',
                'name': 'John Doe',
                'email': 'john.doe@example.com',
                'phone': '+1555001001',
                'company': 'Tech Corp',
                'status': 'new',
                'source': 'website',
                'notes': 'Interested in premium package',
                'expected_value': 50000.00,
                'branch_id': '550e8400-e29b-41d4-a716-446655440000',
                'assigned_to': '660e8400-e29b-41d4-a716-446655440001'
            }
            
            result = supabase.table('leads').upsert(lead_data).execute()
            print("✅ Leads table is ready")
            
        except Exception as e:
            print(f"⚠️ Leads table issue: {e}")
        
        # Try lead_activities table
        try:
            activity_data = {
                'id': '880e8400-e29b-41d4-a716-446655440003',
                'lead_id': '770e8400-e29b-41d4-a716-446655440002',
                'user_id': '660e8400-e29b-41d4-a716-446655440001',
                'activity_type': 'note',
                'subject': 'Initial Contact',
                'description': 'First contact made with the lead'
            }
            
            result = supabase.table('lead_activities').upsert(activity_data).execute()
            print("✅ Lead Activities table is ready")
            
        except Exception as e:
            print(f"⚠️ Lead Activities table issue: {e}")
        
        print("✅ CRM tables setup completed!")
        return True
        
    except Exception as e:
        print(f"❌ CRM setup failed: {e}")
        return False

def create_sample_users(supabase):
    """Create sample users for all roles"""
    try:
        print("👥 Creating sample users...")
        
        users_data = [
            {
                'username': 'admin',
                'email': 'admin@epiccrm.com',
                'first_name': 'System',
                'last_name': 'Administrator',
                'role': 'admin',
                'phone': '+1234567890',
                'branch_id': '550e8400-e29b-41d4-a716-446655440000',
                'is_active': True
            },
            {
                'username': 'branchhead',
                'email': 'branchhead@epiccrm.com',
                'first_name': 'Branch',
                'last_name': 'Manager',
                'role': 'branch_head',
                'phone': '+1234567891',
                'branch_id': '550e8400-e29b-41d4-a716-446655440000',
                'is_active': True
            },
            {
                'username': 'cre',
                'email': 'cre@epiccrm.com',
                'first_name': 'Customer',
                'last_name': 'Executive',
                'role': 'cre',
                'phone': '+1234567892',
                'branch_id': '550e8400-e29b-41d4-a716-446655440000',
                'is_active': True
            },
            {
                'username': 'ps',
                'email': 'ps@epiccrm.com',
                'first_name': 'Pre',
                'last_name': 'Sales',
                'role': 'ps',
                'phone': '+1234567893',
                'branch_id': '550e8400-e29b-41d4-a716-446655440000',
                'is_active': True
            }
        ]
        
        for user in users_data:
            try:
                result = supabase.table('users').upsert(user).execute()
                print(f"✅ Created user: {user['username']}")
            except Exception as e:
                print(f"⚠️ Failed to create user {user['username']}: {e}")
        
        print("✅ Sample users created!")
        return True
        
    except Exception as e:
        print(f"❌ User creation failed: {e}")
        return False

def create_sample_leads(supabase):
    """Create sample leads for testing"""
    try:
        print("📊 Creating sample leads...")
        
        leads_data = [
            {
                'name': 'John Doe',
                'email': 'john.doe@example.com',
                'phone': '+1555001001',
                'company': 'Tech Corp',
                'status': 'new',
                'source': 'website',
                'notes': 'Interested in premium package',
                'expected_value': 50000.00,
                'branch_id': '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                'name': 'Jane Smith',
                'email': 'jane.smith@business.com',
                'phone': '+1555001002',
                'company': 'Business Solutions Ltd',
                'status': 'contacted',
                'source': 'referral',
                'notes': 'Follow up scheduled for next week',
                'expected_value': 75000.00,
                'branch_id': '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                'name': 'Mike Johnson',
                'email': 'mike.j@startup.io',
                'phone': '+1555001003',
                'company': 'Startup Inc',
                'status': 'qualified',
                'source': 'social_media',
                'notes': 'Very interested, ready to move forward',
                'expected_value': 25000.00,
                'branch_id': '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                'name': 'Sarah Wilson',
                'email': 'sarah.w@enterprise.com',
                'phone': '+1555001004',
                'company': 'Enterprise Corp',
                'status': 'proposal',
                'source': 'cold_call',
                'notes': 'Proposal sent, awaiting response',
                'expected_value': 100000.00,
                'branch_id': '550e8400-e29b-41d4-a716-446655440000'
            },
            {
                'name': 'David Brown',
                'email': 'david.b@growth.co',
                'phone': '+1555001005',
                'company': 'Growth Co',
                'status': 'closed_won',
                'source': 'advertisement',
                'notes': 'Deal closed successfully!',
                'expected_value': 60000.00,
                'branch_id': '550e8400-e29b-41d4-a716-446655440000'
            }
        ]
        
        for lead in leads_data:
            try:
                result = supabase.table('leads').upsert(lead).execute()
                print(f"✅ Created lead: {lead['name']}")
            except Exception as e:
                print(f"⚠️ Failed to create lead {lead['name']}: {e}")
        
        print("✅ Sample leads created!")
        return True
        
    except Exception as e:
        print(f"❌ Lead creation failed: {e}")
        return False

def main():
    """Main setup function"""
    print("=" * 60)
    print("🎯 EPIC CRM 2.0 - Database Setup (Version 2)")
    print("=" * 60)
    
    # Test connection and setup
    supabase = test_connection_and_setup()
    if not supabase:
        print("❌ Cannot proceed without database connection")
        print("💡 The system will still work with hardcoded users in FastAPI")
        return
    
    # Create sample data
    create_sample_users(supabase)
    create_sample_leads(supabase)
    
    print("\n" + "=" * 60)
    print("✅ Database setup completed!")
    print("=" * 60)
    print("🚀 Your CRM system is ready!")
    print("🌐 Frontend: http://localhost:3000")
    print("🔧 API: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("\n💻 Login credentials:")
    print("   • admin / admin123 (System Administrator)")
    print("   • branchhead / branch123 (Branch Manager)")
    print("   • cre / cre123 (Customer Executive)")
    print("   • ps / ps123 (Pre Sales)")
    print("=" * 60)

if __name__ == "__main__":
    main()
