-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('company_name', '"EPIC CRM"', 'Company name displayed in the application'),
('company_logo', '""', 'Company logo URL'),
('default_lead_assignment', '"round_robin"', 'Default lead assignment method: round_robin, manual, branch_based'),
('email_notifications', 'true', 'Enable email notifications'),
('lead_auto_assignment', 'true', 'Enable automatic lead assignment'),
('max_leads_per_user', '50', 'Maximum leads per user'),
('session_timeout', '480', 'Session timeout in minutes'),
('password_policy', '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_special": false}', 'Password policy settings')
ON CONFLICT (key) DO NOTHING;

-- Insert default branch (headquarters)
INSERT INTO public.branches (id, name, code, address, city, state, phone, email, status) VALUES
('00000000-0000-0000-0000-000000000001', 'Headquarters', 'HQ', '123 Business Street', 'Business City', 'BC', '+1-555-0100', 'hq@epiccrm.com', 'active')
ON CONFLICT (id) DO NOTHING;

-- Create default admin user (this will be created when first admin signs up)
-- The trigger will handle profile creation automatically
