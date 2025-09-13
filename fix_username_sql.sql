-- Fix for adding username column and test users to profiles table
-- This approach handles the UUID generation more reliably

-- 1. Add username column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 2. Add password_hash column for storing hashed passwords
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 3. First, let's check if the id column has a default UUID generator
-- If not, we'll add it
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Insert test users without specifying id (let it auto-generate)
INSERT INTO profiles (email, username, first_name, last_name, role, status, phone, password_hash) 
VALUES 
    ('admin@epiccrm.com', 'admin', 'System', 'Administrator', 'admin', 'active', '+1234567890', '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'),
    ('branchhead@epiccrm.com', 'branchhead', 'Branch', 'Manager', 'branch_head', 'active', '+1234567891', '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'),
    ('cre2@epiccrm.com', 'cre', 'Customer', 'Executive', 'cre', 'active', '+1234567892', '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'),
    ('ps@epiccrm.com', 'ps', 'Pre Sales', 'Executive', 'ps', 'active', '+1234567893', '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m')
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash;

-- 5. Update existing user (sajnay@gmail.com) with username if it exists
UPDATE profiles 
SET username = 'sajnay', password_hash = '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'
WHERE email = 'sajnay@gmail.com' AND username IS NULL;

-- 6. Verify the data was inserted correctly
SELECT id, email, username, first_name, last_name, role, status FROM profiles ORDER BY created_at DESC;
