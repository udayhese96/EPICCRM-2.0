-- Fix for adding username column and test users to both users and profiles tables
-- This handles the foreign key constraint between profiles and users

-- 1. First, let's see what tables we have and their structure
-- Run this to understand the schema:
-- \d users
-- \d profiles

-- 2. Add username column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 3. Add password_hash column to profiles table for storing hashed passwords
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 4. We need to insert into users table first (if it exists and is required)
-- Let's try to insert test users into the users table first
INSERT INTO users (id, email) 
VALUES 
    (gen_random_uuid(), 'admin@epiccrm.com'),
    (gen_random_uuid(), 'branchhead@epiccrm.com'),
    (gen_random_uuid(), 'cre2@epiccrm.com'),
    (gen_random_uuid(), 'ps@epiccrm.com')
ON CONFLICT (email) DO NOTHING;

-- 5. Now insert into profiles table, referencing the users we just created
INSERT INTO profiles (id, email, username, first_name, last_name, role, status, phone, password_hash) 
SELECT u.id, u.email, 
    CASE 
        WHEN u.email = 'admin@epiccrm.com' THEN 'admin'
        WHEN u.email = 'branchhead@epiccrm.com' THEN 'branchhead'
        WHEN u.email = 'cre2@epiccrm.com' THEN 'cre'
        WHEN u.email = 'ps@epiccrm.com' THEN 'ps'
    END as username,
    CASE 
        WHEN u.email = 'admin@epiccrm.com' THEN 'System'
        WHEN u.email = 'branchhead@epiccrm.com' THEN 'Branch'
        WHEN u.email = 'cre2@epiccrm.com' THEN 'Customer'
        WHEN u.email = 'ps@epiccrm.com' THEN 'Pre Sales'
    END as first_name,
    CASE 
        WHEN u.email = 'admin@epiccrm.com' THEN 'Administrator'
        WHEN u.email = 'branchhead@epiccrm.com' THEN 'Manager'
        WHEN u.email = 'cre2@epiccrm.com' THEN 'Executive'
        WHEN u.email = 'ps@epiccrm.com' THEN 'Executive'
    END as last_name,
    CASE 
        WHEN u.email = 'admin@epiccrm.com' THEN 'admin'
        WHEN u.email = 'branchhead@epiccrm.com' THEN 'branch_head'
        WHEN u.email = 'cre2@epiccrm.com' THEN 'cre'
        WHEN u.email = 'ps@epiccrm.com' THEN 'ps'
    END as role,
    'active' as status,
    CASE 
        WHEN u.email = 'admin@epiccrm.com' THEN '+1234567890'
        WHEN u.email = 'branchhead@epiccrm.com' THEN '+1234567891'
        WHEN u.email = 'cre2@epiccrm.com' THEN '+1234567892'
        WHEN u.email = 'ps@epiccrm.com' THEN '+1234567893'
    END as phone,
    '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m' as password_hash
FROM users u
WHERE u.email IN ('admin@epiccrm.com', 'branchhead@epiccrm.com', 'cre2@epiccrm.com', 'ps@epiccrm.com')
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash;

-- 6. Handle the existing sajnay@gmail.com user
-- First check if it exists in users table, if not add it
INSERT INTO users (id, email) 
SELECT gen_random_uuid(), 'sajnay@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sajnay@gmail.com');

-- Then update the profile
UPDATE profiles 
SET username = 'sajnay', password_hash = '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'
WHERE email = 'sajnay@gmail.com';

-- 7. Verify the data was inserted correctly
SELECT p.id, p.email, p.username, p.first_name, p.last_name, p.role, p.status 
FROM profiles p 
ORDER BY p.created_at DESC;
