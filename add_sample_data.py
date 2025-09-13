#!/usr/bin/env python3
"""
Add sample data to the CRM database
"""
import os
from supabase import create_client, Client

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'

def add_sample_data():
    """Add sample data directly"""
    try:
        print("🔗 Connecting to Supabase...")
        
        # Create client with service role key
        supabase: Client = create_client(
            os.environ['SUPABASE_URL'],
            os.environ['SUPABASE_SERVICE_ROLE_KEY']
        )
        
        print("✅ Connected to Supabase!")
        
        # First, add a branch
        print("🏢 Adding sample branch...")
        branch_data = {
            'name': 'Main Branch',
            'code': 'MAIN001',
            'address': '123 Business District, CRM City',
            'phone': '+1234567890',
            'email': 'main@epiccrm.com',
            'is_active': True
        }
        
        branch_result = supabase.table('branches').insert(branch_data).execute()
        if branch_result.data:
            branch_id = branch_result.data[0]['id']
            print(f"✅ Created branch with ID: {branch_id}")
        else:
            print("❌ Failed to create branch")
            return
        
        # Add users
        print("👥 Adding sample users...")
        users_data = [
            {
                'username': 'admin',
                'email': 'admin@epiccrm.com',
                'first_name': 'System',
                'last_name': 'Administrator',
                'role': 'admin',
                'phone': '+1234567890',
                'branch_id': branch_id,
                'is_active': True
            },
            {
                'username': 'branchhead',
                'email': 'branchhead@epiccrm.com',
                'first_name': 'Branch',
                'last_name': 'Manager',
                'role': 'branch_head',
                'phone': '+1234567891',
                'branch_id': branch_id,
                'is_active': True
            },
            {
                'username': 'cre',
                'email': 'cre@epiccrm.com',
                'first_name': 'Customer',
                'last_name': 'Executive',
                'role': 'cre',
                'phone': '+1234567892',
                'branch_id': branch_id,
                'is_active': True
            },
            {
                'username': 'ps',
                'email': 'ps@epiccrm.com',
                'first_name': 'Pre',
                'last_name': 'Sales',
                'role': 'ps',
                'phone': '+1234567893',
                'branch_id': branch_id,
                'is_active': True
            }
        ]
        
        user_ids = {}
        for user_data in users_data:
            try:
                user_result = supabase.table('users').insert(user_data).execute()
                if user_result.data:
                    user_id = user_result.data[0]['id']
                    user_ids[user_data['username']] = user_id
                    print(f"✅ Created user: {user_data['username']} (ID: {user_id})")
                else:
                    print(f"❌ Failed to create user: {user_data['username']}")
            except Exception as e:
                print(f"❌ Error creating user {user_data['username']}: {e}")
        
        # Add sample leads
        print("📊 Adding sample leads...")
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
                'branch_id': branch_id,
                'assigned_to': user_ids.get('cre')
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
                'branch_id': branch_id,
                'assigned_to': user_ids.get('cre')
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
                'branch_id': branch_id,
                'assigned_to': user_ids.get('ps')
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
                'branch_id': branch_id,
                'assigned_to': user_ids.get('branchhead')
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
                'branch_id': branch_id,
                'assigned_to': user_ids.get('cre')
            }
        ]
        
        lead_ids = []
        for lead_data in leads_data:
            try:
                lead_result = supabase.table('leads').insert(lead_data).execute()
                if lead_result.data:
                    lead_id = lead_result.data[0]['id']
                    lead_ids.append(lead_id)
                    print(f"✅ Created lead: {lead_data['name']} (ID: {lead_id})")
                else:
                    print(f"❌ Failed to create lead: {lead_data['name']}")
            except Exception as e:
                print(f"❌ Error creating lead {lead_data['name']}: {e}")
        
        # Add sample activities
        print("📝 Adding sample activities...")
        if lead_ids and user_ids:
            activities_data = [
                {
                    'lead_id': lead_ids[0],
                    'user_id': user_ids.get('cre'),
                    'activity_type': 'note',
                    'subject': 'Initial Contact',
                    'description': 'First contact made with the lead via website form'
                },
                {
                    'lead_id': lead_ids[1],
                    'user_id': user_ids.get('cre'),
                    'activity_type': 'call',
                    'subject': 'Follow-up Call',
                    'description': 'Discussed requirements and pricing options'
                },
                {
                    'lead_id': lead_ids[2],
                    'user_id': user_ids.get('ps'),
                    'activity_type': 'meeting',
                    'subject': 'Demo Meeting',
                    'description': 'Product demonstration completed successfully'
                }
            ]
            
            for activity_data in activities_data:
                try:
                    if activity_data['user_id']:  # Only if user exists
                        activity_result = supabase.table('lead_activities').insert(activity_data).execute()
                        if activity_result.data:
                            print(f"✅ Created activity: {activity_data['subject']}")
                        else:
                            print(f"❌ Failed to create activity: {activity_data['subject']}")
                except Exception as e:
                    print(f"❌ Error creating activity {activity_data['subject']}: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Sample data added successfully!")
        print("=" * 60)
        print("📊 Summary:")
        print(f"   • 1 Branch created")
        print(f"   • {len(user_ids)} Users created")
        print(f"   • {len(lead_ids)} Leads created")
        print(f"   • Activities created")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to add sample data: {e}")
        return False

if __name__ == "__main__":
    add_sample_data()
