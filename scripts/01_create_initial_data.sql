-- Create initial lead statuses
INSERT INTO lead_statuses (name, description, color, order_index, is_active) VALUES
('New', 'Newly created lead', '#3B82F6', 1, true),
('Contacted', 'Initial contact made', '#F59E0B', 2, true),
('Qualified', 'Lead has been qualified', '#10B981', 3, true),
('Proposal', 'Proposal sent to lead', '#8B5CF6', 4, true),
('Negotiation', 'In negotiation phase', '#F97316', 5, true),
('Closed Won', 'Successfully closed deal', '#059669', 6, true),
('Closed Lost', 'Deal was lost', '#DC2626', 7, true),
('On Hold', 'Lead is on hold', '#6B7280', 8, true);

-- Create initial lead sources
INSERT INTO lead_sources (name, description, is_active) VALUES
('Website', 'Leads from company website', true),
('Social Media', 'Leads from social media platforms', true),
('Email Campaign', 'Leads from email marketing', true),
('Cold Call', 'Leads from cold calling', true),
('Referral', 'Leads from referrals', true),
('Trade Show', 'Leads from trade shows and events', true),
('Partner', 'Leads from business partners', true),
('Advertisement', 'Leads from paid advertisements', true),
('Direct Mail', 'Leads from direct mail campaigns', true),
('Other', 'Other lead sources', true);

-- Create initial user roles
INSERT INTO authentication_userrole (name, description, permissions) VALUES
('Admin', 'Full system administrator access', '{"can_manage_users": true, "can_delete_leads": true, "can_view_all_data": true, "can_manage_settings": true}'),
('Manager', 'Team manager with oversight capabilities', '{"can_view_team_data": true, "can_assign_leads": true, "can_generate_reports": true, "can_manage_activities": true}'),
('Sales Rep', 'Sales representative with lead management access', '{"can_create_leads": true, "can_edit_own_leads": true, "can_create_activities": true, "can_view_own_data": true}'),
('Viewer', 'Read-only access to assigned data', '{"can_view_own_data": true}');
