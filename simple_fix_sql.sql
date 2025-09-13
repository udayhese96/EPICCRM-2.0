-- Simple fix: Just add username to existing profiles
-- This approach avoids foreign key issues by only updating existing records

-- 1. Add username column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 2. Add password_hash column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 3. Update the existing sajnay@gmail.com user with username and password
UPDATE profiles 
SET username = 'sajnay', 
    password_hash = '$2b$12$LQv3c1yqBwlVHpPx7TXz3u.O9.VfqpNj6h2Hq1hF6Wj8A8K6F2H4m'
WHERE email = 'sajnay@gmail.com';

-- 4. If there are other existing users, update them too
-- You can add more UPDATE statements here for existing users

-- 5. Check what we have now
SELECT id, email, username, first_name, last_name, role, status 
FROM profiles 
ORDER BY created_at DESC;
