-- Insert initial data for CRM system

-- Insert default user roles
INSERT INTO user_roles (name, description) VALUES
('Admin', 'Full system access and user management'),
('Manager', 'Can manage leads, contacts, and view reports'),
('Sales Rep', 'Can manage assigned leads and contacts'),
('Viewer', 'Read-only access to assigned records')
ON CONFLICT (name) DO NOTHING;

-- Insert default lead statuses
INSERT INTO lead_statuses (name, description, color, order_index) VALUES
('New', 'Newly created lead', '#3B82F6', 1),
('Contacted', 'Initial contact made', '#F59E0B', 2),
('Qualified', 'Lead has been qualified', '#10B981', 3),
('Proposal', 'Proposal sent to lead', '#8B5CF6', 4),
('Negotiation', 'In negotiation phase', '#F97316', 5),
('Won', 'Deal closed successfully', '#059669', 6),
('Lost', 'Deal lost or rejected', '#DC2626', 7),
('On Hold', 'Lead temporarily on hold', '#6B7280', 8)
ON CONFLICT (name) DO NOTHING;

-- Insert default lead sources
INSERT INTO lead_sources (name, description) VALUES
('Website', 'Leads from company website'),
('Social Media', 'Leads from social media platforms'),
('Email Campaign', 'Leads from email marketing'),
('Cold Call', 'Leads from cold calling'),
('Referral', 'Leads from referrals'),
('Trade Show', 'Leads from trade shows and events'),
('Advertisement', 'Leads from paid advertisements'),
('Partner', 'Leads from business partners'),
('Direct Mail', 'Leads from direct mail campaigns'),
('Other', 'Other lead sources')
ON CONFLICT (name) DO NOTHING;

-- Create default admin user (password: admin123)
-- Note: In production, this should be changed immediately
INSERT INTO auth_user (
    username, 
    email, 
    password, 
    first_name, 
    last_name, 
    is_staff, 
    is_superuser
) VALUES (
    'admin',
    'admin@company.com',
    'pbkdf2_sha256$600000$placeholder$hash', -- This will be properly hashed by Django
    'System',
    'Administrator',
    TRUE,
    TRUE
) ON CONFLICT (username) DO NOTHING;

-- Assign admin role to default admin user
INSERT INTO user_role_assignments (user_id, role_id)
SELECT u.id, r.id
FROM auth_user u, user_roles r
WHERE u.username = 'admin' AND r.name = 'Admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
