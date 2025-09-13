-- Create separate user tables for each role
-- This eliminates foreign key constraints and simplifies the system

-- 1. Drop the problematic profiles table if it exists
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create cre_users table
CREATE TABLE IF NOT EXISTS cre_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    branch_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create ps_users table
CREATE TABLE IF NOT EXISTS ps_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    branch_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create bh_users (branch head users) table
CREATE TABLE IF NOT EXISTS bh_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    branch_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Insert the specific test users you requested

-- Admin user: username=admin, password=admin123
INSERT INTO admin_users (username, password_hash, email, first_name, last_name, phone, status) 
VALUES ('admin', 'admin123', 'admin@epiccrm.com', 'System', 'Administrator', '+1234567890', 'active');

-- CRE user: username=cre, password=cre123
INSERT INTO cre_users (username, password_hash, email, first_name, last_name, phone, branch_id, status) 
VALUES ('cre', 'cre123', 'cre@epiccrm.com', 'Customer Relations', 'Executive', '+1234567891', 1, 'active');

-- PS user: username=ps, password=ps123
INSERT INTO ps_users (username, password_hash, email, first_name, last_name, phone, branch_id, status) 
VALUES ('ps', 'ps123', 'ps@epiccrm.com', 'Pre Sales', 'Executive', '+1234567892', 1, 'active');

-- Branch Head user: username=branchhead, password=branchhead123
INSERT INTO bh_users (username, password_hash, email, first_name, last_name, phone, branch_id, status) 
VALUES ('branchhead', 'branchhead123', 'branchhead@epiccrm.com', 'Branch', 'Manager', '+1234567893', 1, 'active');

-- 7. Verify all users were created successfully
SELECT 'admin' as role, id, username, email, first_name, last_name, status FROM admin_users
UNION ALL
SELECT 'cre' as role, id, username, email, first_name, last_name, status FROM cre_users
UNION ALL
SELECT 'ps' as role, id, username, email, first_name, last_name, status FROM ps_users
UNION ALL
SELECT 'branch_head' as role, id, username, email, first_name, last_name, status FROM bh_users
ORDER BY role, username;
