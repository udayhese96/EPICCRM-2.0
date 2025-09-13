-- Add the exact login users you requested with simple password storage
-- This approach stores passwords in plain text for now (will be hashed by backend)

-- 1. Add username column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 2. Add password_hash column to profiles table  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 3. Insert the specific test users you requested
-- We'll store the actual passwords you want for now

-- Admin user: username=admin, password=admin123
INSERT INTO profiles (email, username, first_name, last_name, role, status, phone, password_hash, branch_id) 
VALUES ('admin@epiccrm.com', 'admin', 'System', 'Administrator', 'admin', 'active', '+1234567890', 'admin123', NULL)
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    branch_id = EXCLUDED.branch_id;

-- CRE user: username=cre, password=cre123
INSERT INTO profiles (email, username, first_name, last_name, role, status, phone, password_hash, branch_id) 
VALUES ('cre@epiccrm.com', 'cre', 'Customer Relations', 'Executive', 'cre', 'active', '+1234567891', 'cre123', 1)
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    branch_id = EXCLUDED.branch_id;

-- PS user: username=ps, password=ps123
INSERT INTO profiles (email, username, first_name, last_name, role, status, phone, password_hash, branch_id) 
VALUES ('ps@epiccrm.com', 'ps', 'Pre Sales', 'Executive', 'ps', 'active', '+1234567892', 'ps123', 1)
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    branch_id = EXCLUDED.branch_id;

-- Branch Head user: username=branchhead, password=branchhead123
INSERT INTO profiles (email, username, first_name, last_name, role, status, phone, password_hash, branch_id) 
VALUES ('branchhead@epiccrm.com', 'branchhead', 'Branch', 'Manager', 'branch_head', 'active', '+1234567893', 'branchhead123', 1)
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    branch_id = EXCLUDED.branch_id;

-- 4. Update existing sajnay user if it exists
UPDATE profiles 
SET username = 'sajnay', 
    password_hash = 'sajnay123'
WHERE email = 'sajnay@gmail.com';

-- 5. Verify all users were created/updated correctly
SELECT id, email, username, first_name, last_name, role, status, branch_id, created_at 
FROM profiles 
WHERE username IN ('admin', 'cre', 'ps', 'branchhead', 'sajnay')
ORDER BY role, username;
