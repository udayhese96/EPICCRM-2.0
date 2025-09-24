-- Create a test team leader user for login testing

INSERT INTO users (
    username,
    email,
    password_hash,
    full_name,
    phone,
    role,
    branch,
    is_active
) VALUES (
    'team_leader_test',
    'teamleader@epiccrm.com',
    'password123', -- In production, this should be hashed
    'Test Team Leader',
    '9876543210',
    'team_leader',
    'Mount Road',
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    branch = EXCLUDED.branch,
    is_active = EXCLUDED.is_active;

-- Verify the user was created
SELECT id, username, email, role, branch, is_active FROM users WHERE role = 'team_leader';
