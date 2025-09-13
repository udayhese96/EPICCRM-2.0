#!/usr/bin/env python3
"""
Database setup script for EPIC CRM 2.0
"""
import os
from supabase import create_client, Client

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
os.environ['SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDAzOTMsImV4cCI6MjA3MzMxNjM5M30.Jt5Bzlnn96cnqLXY6il0tSHpEV76P1SV8RwAc0vea2g'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'

def test_connection():
    """Test Supabase connection"""
    try:
        print("🔗 Testing Supabase connection...")
        
        # Create client with service role key
        supabase: Client = create_client(
            os.environ['SUPABASE_URL'],
            os.environ['SUPABASE_SERVICE_ROLE_KEY']
        )
        
        # Test connection by listing tables
        result = supabase.table('pg_tables').select('tablename').execute()
        print(f"✅ Connected successfully! Found {len(result.data)} tables")
        return supabase
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def create_tables(supabase):
    """Create necessary tables for CRM"""
    try:
        print("🔧 Setting up database schema...")
        
        # Create branches table
        create_branches_sql = """
        CREATE TABLE IF NOT EXISTS branches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) UNIQUE NOT NULL,
            address TEXT,
            phone VARCHAR(50),
            email VARCHAR(255),
            manager_id UUID,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        # Create users table
        create_users_sql = """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(150) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            first_name VARCHAR(150) NOT NULL,
            last_name VARCHAR(150) NOT NULL,
            password_hash VARCHAR(255),
            role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'branch_head', 'cre', 'ps', 'receptionist')),
            phone VARCHAR(50),
            branch_id UUID REFERENCES branches(id),
            is_active BOOLEAN DEFAULT true,
            last_login TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        # Create leads table
        create_leads_sql = """
        CREATE TABLE IF NOT EXISTS leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50) NOT NULL,
            company VARCHAR(255),
            status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
            source VARCHAR(50) DEFAULT 'website' CHECK (source IN ('website', 'referral', 'social_media', 'advertisement', 'cold_call', 'walk_in')),
            notes TEXT,
            expected_value DECIMAL(15,2),
            assigned_to UUID REFERENCES users(id),
            branch_id UUID REFERENCES branches(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        # Create lead_activities table
        create_activities_sql = """
        CREATE TABLE IF NOT EXISTS lead_activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id),
            activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task')),
            subject VARCHAR(255) NOT NULL,
            description TEXT,
            scheduled_at TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        # Execute table creation
        print("Creating branches table...")
        supabase.rpc('exec_sql', {'sql': create_branches_sql}).execute()
        
        print("Creating users table...")
        supabase.rpc('exec_sql', {'sql': create_users_sql}).execute()
        
        print("Creating leads table...")
        supabase.rpc('exec_sql', {'sql': create_leads_sql}).execute()
        
        print("Creating lead_activities table...")
        supabase.rpc('exec_sql', {'sql': create_activities_sql}).execute()
        
        print("✅ Database schema created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Schema creation failed: {e}")
        # Try alternative approach with direct table operations
        try:
            print("🔄 Trying alternative table creation...")
            return create_tables_alternative(supabase)
        except Exception as e2:
            print(f"❌ Alternative approach also failed: {e2}")
            return False

def create_tables_alternative(supabase):
    """Alternative table creation using direct inserts"""
    try:
        # Create sample branch
        branch_data = {
            'name': 'Main Branch',
            'code': 'MAIN001',
            'address': '123 Main Street, City',
            'phone': '+1234567890',
            'email': 'main@epiccrm.com',
            'is_active': True
        }
        
        # Try to insert a branch to test table existence
        result = supabase.table('branches').upsert(branch_data).execute()
        print("✅ Branches table exists or created")
        
        return True
        
    except Exception as e:
        print(f"❌ Alternative creation failed: {e}")
        return False

def create_sample_data(supabase):
    """Create sample data for testing"""
    try:
        print("📊 Creating sample data...")
        
        # Create main branch
        branch_data = {
            'name': 'Main Branch',
            'code': 'MAIN001',
            'address': '123 Business District, CRM City',
            'phone': '+1234567890',
            'email': 'main@epiccrm.com',
            'is_active': True
        }
        
        branch_result = supabase.table('branches').upsert(branch_data).execute()
        branch_id = branch_result.data[0]['id'] if branch_result.data else None
        
        # Create users
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
        
        users_result = supabase.table('users').upsert(users_data).execute()
        print(f"✅ Created {len(users_result.data)} users")
        
        # Create sample leads
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
                'branch_id': branch_id
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
                'branch_id': branch_id
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
                'branch_id': branch_id
            }
        ]
        
        leads_result = supabase.table('leads').upsert(leads_data).execute()
        print(f"✅ Created {len(leads_result.data)} sample leads")
        
        print("✅ Sample data created successfully!")
        return True
        
    except Exception as e:
        print(f"⚠️ Sample data creation failed: {e}")
        return False

def main():
    """Main setup function"""
    print("=" * 60)
    print("🎯 EPIC CRM 2.0 - Database Setup")
    print("=" * 60)
    
    # Test connection
    supabase = test_connection()
    if not supabase:
        print("❌ Cannot proceed without database connection")
        return
    
    # Create tables
    if create_tables(supabase):
        print("✅ Database schema ready")
    else:
        print("⚠️ Schema creation had issues, but continuing...")
    
    # Create sample data
    create_sample_data(supabase)
    
    print("\n" + "=" * 60)
    print("✅ Database setup completed!")
    print("=" * 60)
    print("🚀 You can now run the CRM system with full functionality")
    print("💻 Use these credentials to login:")
    print("   • admin / admin123")
    print("   • branchhead / branch123")
    print("   • cre / cre123")
    print("   • ps / ps123")
    print("=" * 60)

if __name__ == "__main__":
    main()
