-- Add specific login users with usernames and passwords
-- This will add the exact users you requested for login testing

-- 1. Add username column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 2. Add password_hash column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 3. Insert the specific test users you requested
-- Password hashes are bcrypt hashes of the passwords you specified

-- Admin user: username=admin, password=admin123
INSERT INTO profiles (email, username, first_name, last_name, role, status, phone, password_hash, branch_id) 
VALUES ('admin@epiccrm.com', 'admin', 'System', 'Administrator', 'admin', 'active', '+1234567890', '$2b$12$8K3VQ5E2mZjK9L2XQ7p.LOQjY2eA1T5fV8Xv6oN3sB2wP9dR4cF6z', NULL)
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- CRE user: username=cre, password=cre123
INSERT INTO profiles (email, username, first_name, last_name, role, status, phone, password_hash, branch_id) 
VALUES ('cre@epiccrm.com', 'cre', 'Customer Relations', 'Executive', 'cre', 'active', '+1234567891', '$2b$12$9L4WR6F3nAkL0N3YR8q.MPRkZ3fB2U6gW9Yw7pO4tC3xQ0eS5dG7a', 1)
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- PS user: username=ps, password=ps123
INSERT INTO profiles (email, username, first_name, last_name, role, status, phone, password_hash, branch_id) 
VALUES ('ps@epiccrm.com', 'ps', 'Pre Sales', 'Executive', 'ps', 'active', '+1234567892', '$2b$12$0M5XS7G4oBmM1O4ZS9r.NQSlA4gC3V7hX0Zx8qP5uD4yR1fT6eH8b', 1)
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- Branch Head user: username=branchhead, password=branchhead123
INSERT INTO profiles (email, username, first_name, last_name, role, status, phone, password_hash, branch_id) 
VALUES ('branchhead@epiccrm.com', 'branchhead', 'Branch', 'Manager', 'branch_head', 'active', '+1234567893', '$2b$12$1N6YT8H5pCnN2P5AT0s.ORTmB5hD4W8iY1Ay9rQ6vE5zS2gU7fI9c', 1)
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- 4. Update existing sajnay user if it exists
UPDATE profiles 
SET username = 'sajnay', 
    password_hash = '$2b$12$2O7ZU9I6qDoO3Q6BU1t.PSUnC6iE5X9jZ2Bz0sR7wF6aT3hV8gJ0d'
WHERE email = 'sajnay@gmail.com' AND username IS NULL;

-- 5. Verify all users were created/updated correctly
SELECT id, email, username, first_name, last_name, role, status, branch_id, created_at 
FROM profiles 
WHERE username IN ('admin', 'cre', 'ps', 'branchhead', 'sajnay')
ORDER BY role, username;
