-- Add username column to profiles table and create test users
-- Run this in your Supabase SQL Editor

-- 1. Add username column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 2. Add password_hash column for storing hashed passwords
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 3. Insert test users with usernames and passwords (with UUID generation)
INSERT INTO profiles (id, email, username, first_name, last_name, role, status, phone, password_hash) 
VALUES 
    (gen_random_uuid(), 'admin@epiccrm.com', 'admin', 'System', 'Administrator', 'admin', 'active', '+1234567890', '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'),
    (gen_random_uuid(), 'branchhead@epiccrm.com', 'branchhead', 'Branch', 'Manager', 'branch_head', 'active', '+1234567891', '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'),
    (gen_random_uuid(), 'cre2@epiccrm.com', 'cre', 'Customer', 'Executive', 'cre', 'active', '+1234567892', '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'),
    (gen_random_uuid(), 'ps@epiccrm.com', 'ps', 'Pre Sales', 'Executive', 'ps', 'active', '+1234567893', '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m')
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash;

-- 4. Update existing user (sajnay@gmail.com) with username
UPDATE profiles 
SET username = 'sajnay', password_hash = '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'
WHERE email = 'sajnay@gmail.com' AND username IS NULL;
