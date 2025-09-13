-- Fix profiles table to handle UUID generation and add login users
-- This will solve the null id constraint error

-- 1. First, let's make sure the id column has a proper default UUID generator
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Add username column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 3. Add password_hash column if it doesn't exist  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 4. Now insert users without specifying id (let PostgreSQL auto-generate)
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

-- Update existing sajnay user if it exists
UPDATE profiles 
SET username = 'sajnay', 
    password_hash = 'sajnay123'
WHERE email = 'sajnay@gmail.com';

-- Verify the users were created successfully
SELECT id, email, username, first_name, last_name, role, status, branch_id, created_at 
FROM profiles 
WHERE username IN ('admin', 'cre', 'ps', 'branchhead', 'sajnay')
ORDER BY role, username;
