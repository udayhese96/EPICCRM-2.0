-- EPIC CRM 2.0 - Complete Database Schema
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 3. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 4. Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 5. Create lead_activities table
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_user_id ON lead_activities(user_id);

-- 7. Insert sample branch
INSERT INTO branches (id, name, code, address, phone, email, is_active) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Main Branch',
    'MAIN001',
    '123 Business District, CRM City',
    '+1234567890',
    'main@epiccrm.com',
    true
) ON CONFLICT (id) DO NOTHING;

-- 8. Insert sample users
INSERT INTO users (id, username, email, first_name, last_name, role, phone, branch_id, is_active) 
VALUES 
    (
        '660e8400-e29b-41d4-a716-446655440001',
        'admin',
        'admin@epiccrm.com',
        'System',
        'Administrator',
        'admin',
        '+1234567890',
        '550e8400-e29b-41d4-a716-446655440000',
        true
    ),
    (
        '660e8400-e29b-41d4-a716-446655440002',
        'branchhead',
        'branchhead@epiccrm.com',
        'Branch',
        'Manager',
        'branch_head',
        '+1234567891',
        '550e8400-e29b-41d4-a716-446655440000',
        true
    ),
    (
        '660e8400-e29b-41d4-a716-446655440003',
        'cre',
        'cre@epiccrm.com',
        'Customer',
        'Executive',
        'cre',
        '+1234567892',
        '550e8400-e29b-41d4-a716-446655440000',
        true
    ),
    (
        '660e8400-e29b-41d4-a716-446655440004',
        'ps',
        'ps@epiccrm.com',
        'Pre',
        'Sales',
        'ps',
        '+1234567893',
        '550e8400-e29b-41d4-a716-446655440000',
        true
    )
ON CONFLICT (id) DO NOTHING;

-- 9. Insert sample leads
INSERT INTO leads (id, name, email, phone, company, status, source, notes, expected_value, assigned_to, branch_id) 
VALUES 
    (
        '770e8400-e29b-41d4-a716-446655440001',
        'John Doe',
        'john.doe@example.com',
        '+1555001001',
        'Tech Corp',
        'new',
        'website',
        'Interested in premium package',
        50000.00,
        '660e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440000'
    ),
    (
        '770e8400-e29b-41d4-a716-446655440002',
        'Jane Smith',
        'jane.smith@business.com',
        '+1555001002',
        'Business Solutions Ltd',
        'contacted',
        'referral',
        'Follow up scheduled for next week',
        75000.00,
        '660e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440000'
    ),
    (
        '770e8400-e29b-41d4-a716-446655440003',
        'Mike Johnson',
        'mike.j@startup.io',
        '+1555001003',
        'Startup Inc',
        'qualified',
        'social_media',
        'Very interested, ready to move forward',
        25000.00,
        '660e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440000'
    ),
    (
        '770e8400-e29b-41d4-a716-446655440004',
        'Sarah Wilson',
        'sarah.w@enterprise.com',
        '+1555001004',
        'Enterprise Corp',
        'proposal',
        'cold_call',
        'Proposal sent, awaiting response',
        100000.00,
        '660e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440000'
    ),
    (
        '770e8400-e29b-41d4-a716-446655440005',
        'David Brown',
        'david.b@growth.co',
        '+1555001005',
        'Growth Co',
        'closed_won',
        'advertisement',
        'Deal closed successfully!',
        60000.00,
        '660e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440000'
    )
ON CONFLICT (id) DO NOTHING;

-- 10. Insert sample activities
INSERT INTO lead_activities (id, lead_id, user_id, activity_type, subject, description) 
VALUES 
    (
        '880e8400-e29b-41d4-a716-446655440001',
        '770e8400-e29b-41d4-a716-446655440001',
        '660e8400-e29b-41d4-a716-446655440003',
        'note',
        'Initial Contact',
        'First contact made with the lead via website form'
    ),
    (
        '880e8400-e29b-41d4-a716-446655440002',
        '770e8400-e29b-41d4-a716-446655440002',
        '660e8400-e29b-41d4-a716-446655440003',
        'call',
        'Follow-up Call',
        'Discussed requirements and pricing options'
    ),
    (
        '880e8400-e29b-41d4-a716-446655440003',
        '770e8400-e29b-41d4-a716-446655440003',
        '660e8400-e29b-41d4-a716-446655440004',
        'meeting',
        'Demo Meeting',
        'Product demonstration completed successfully'
    )
ON CONFLICT (id) DO NOTHING;

-- 11. Enable Row Level Security (RLS) for security
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies (basic policies - you can customize these)
-- Allow service role to access everything
CREATE POLICY "Service role can access branches" ON branches
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access lead_activities" ON lead_activities
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can read leads in their branch" ON leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND (users.branch_id = leads.branch_id OR users.role = 'admin')
        )
    );
