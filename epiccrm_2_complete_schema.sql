-- EPICCRM 2.0 Complete Database Schema
-- Based on existing Ather CRM System structure
-- This replicates the entire workflow and data structure

-- ========================================
-- 1. USER MANAGEMENT TABLES
-- ========================================

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT NOW(),
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- CRE Users Table
CREATE TABLE IF NOT EXISTS cre_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    branch_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    auto_assign_count INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT NOW(),
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PS Users Table
CREATE TABLE IF NOT EXISTS ps_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    branch VARCHAR(100) NOT NULL,
    branch_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT NOW(),
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Branch Head Users Table
CREATE TABLE IF NOT EXISTS bh_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    branch VARCHAR(100) NOT NULL,
    branch_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT NOW(),
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 2. BRANCH MANAGEMENT
-- ========================================

CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    manager_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 3. LEAD MANAGEMENT TABLES
-- ========================================

-- Main Lead Master Table
CREATE TABLE IF NOT EXISTS lead_master (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(20) UNIQUE NOT NULL,
    date DATE,
    customer_name VARCHAR(100),
    customer_mobile_number VARCHAR(15),
    alternate_mobile_number VARCHAR(20),
    source VARCHAR(50),
    sub_source TEXT,
    campaign VARCHAR(100),
    cre_name VARCHAR(100),
    cre_id UUID,
    lead_category VARCHAR(20),
    model_interested TEXT,
    branch VARCHAR(50),
    branch_id INTEGER,
    ps_name VARCHAR(100),
    ps_id UUID,
    assigned VARCHAR(10) DEFAULT 'No',
    lead_status VARCHAR(50),
    follow_up_date TIMESTAMP,
    
    -- Call tracking fields
    first_call_date DATE,
    first_remark TEXT,
    second_call_date DATE,
    second_remark TEXT,
    third_call_date DATE,
    third_remark TEXT,
    fourth_call_date DATE,
    fourth_remark TEXT,
    fifth_call_date DATE,
    fifth_remark TEXT,
    sixth_call_date DATE,
    sixth_remark TEXT,
    seventh_call_date DATE,
    seventh_remark TEXT,
    
    final_status VARCHAR(20),
    test_drive_status BOOLEAN,
    out_of_station_location VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    cre_assigned_at TIMESTAMP,
    ps_assigned_at TIMESTAMP,
    won_timestamp TIMESTAMP,
    lost_timestamp TIMESTAMP,
    tat DOUBLE PRECISION,
    
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (cre_id) REFERENCES cre_users(id),
    FOREIGN KEY (ps_id) REFERENCES ps_users(id)
);

-- Activity Leads Table (for events/activities)
CREATE TABLE IF NOT EXISTS activity_leads (
    id SERIAL PRIMARY KEY,
    activity_uid VARCHAR UNIQUE,
    uid VARCHAR,
    activity_name VARCHAR(100) NOT NULL,
    activity_location VARCHAR(100),
    ps_name VARCHAR(100),
    ps_id UUID,
    location VARCHAR(100),
    customer_name VARCHAR(100),
    customer_location VARCHAR(100),
    customer_profession VARCHAR(100),
    gender VARCHAR(10),
    interested_model VARCHAR(100),
    remarks TEXT,
    lead_status VARCHAR(50),
    lead_category VARCHAR(50),
    month VARCHAR(20),
    date DATE,
    customer_phone_number VARCHAR(15),
    cre_assigned TEXT,
    cre_id UUID,
    final_status TEXT,
    
    -- PS Follow-up tracking
    ps_followup_date_ts TIMESTAMP,
    ps_first_call_date TIMESTAMP,
    ps_first_call_remark TEXT,
    ps_second_call_date TIMESTAMP,
    ps_second_call_remark TEXT,
    ps_third_call_date TIMESTAMP,
    ps_third_call_remark TEXT,
    ps_fourth_call_date TIMESTAMP,
    ps_fourth_call_remark TEXT,
    ps_fifth_call_date TIMESTAMP,
    ps_fifth_call_remark TEXT,
    ps_sixth_call_date TIMESTAMP,
    ps_sixth_call_remark TEXT,
    ps_seventh_call_date TIMESTAMP,
    ps_seventh_call_remark TEXT,
    
    -- CRE Follow-up tracking
    cre_first_call_date TIMESTAMP,
    cre_first_call_remark TEXT,
    cre_second_call_date TIMESTAMP,
    cre_second_call_remark TEXT,
    cre_third_call_date TIMESTAMP,
    cre_third_call_remark TEXT,
    cre_fourth_call_date TIMESTAMP,
    cre_fourth_call_remark TEXT,
    cre_fifth_call_date TIMESTAMP,
    cre_fifth_call_remark TEXT,
    cre_sixth_call_date TIMESTAMP,
    cre_sixth_call_remark TEXT,
    cre_seventh_call_date TIMESTAMP,
    cre_seventh_call_remark TEXT,
    cre_followup_date TIMESTAMP,
    
    test_drive_done BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (ps_id) REFERENCES ps_users(id),
    FOREIGN KEY (cre_id) REFERENCES cre_users(id)
);

-- PS Follow-up Master Table
CREATE TABLE IF NOT EXISTS ps_followup_master (
    id SERIAL PRIMARY KEY,
    lead_uid VARCHAR(20) NOT NULL,
    ps_name VARCHAR(100) NOT NULL,
    ps_id UUID,
    ps_branch VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100),
    customer_mobile_number VARCHAR(15),
    alternate_mobile_number VARCHAR(20),
    source VARCHAR(50),
    cre_name VARCHAR(100),
    cre_id UUID,
    lead_category VARCHAR(20),
    model_interested TEXT,
    follow_up_date DATE,
    lead_status VARCHAR(50),
    
    -- Call tracking
    first_call_date DATE,
    first_call_remark TEXT,
    second_call_date DATE,
    second_call_remark TEXT,
    third_call_date DATE,
    third_call_remark TEXT,
    fourth_call_date DATE,
    fourth_call_remark TEXT,
    fifth_call_date DATE,
    fifth_call_remark TEXT,
    sixth_call_date DATE,
    sixth_call_remark TEXT,
    seventh_call_date DATE,
    seventh_call_remark TEXT,
    
    final_status VARCHAR(20) DEFAULT 'Pending',
    test_drive_done BOOLEAN,
    tat DOUBLE PRECISION,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    ps_assigned_at TIMESTAMP,
    won_timestamp TIMESTAMP,
    lost_timestamp TIMESTAMP,
    
    FOREIGN KEY (ps_id) REFERENCES ps_users(id),
    FOREIGN KEY (cre_id) REFERENCES cre_users(id),
    FOREIGN KEY (lead_uid) REFERENCES lead_master(uid) ON DELETE CASCADE
);

-- Walk-in Leads Table
CREATE TABLE IF NOT EXISTS walkin_leads (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(50),
    customer_name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    customer_location VARCHAR(255),
    model_interested VARCHAR(100),
    occupation VARCHAR(100),
    lead_category VARCHAR(100),
    branch VARCHAR(100) NOT NULL,
    branch_id INTEGER,
    ps_assigned VARCHAR(100) NOT NULL,
    ps_id UUID,
    status VARCHAR(20) DEFAULT 'Pending',
    lead_status VARCHAR(255),
    followup_no INTEGER DEFAULT 1,
    next_followup_date TIMESTAMP,
    
    -- Call tracking
    first_call_date TIMESTAMP,
    first_call_remark TEXT,
    second_call_date TIMESTAMP,
    second_call_remark TEXT,
    third_call_date TIMESTAMP,
    third_call_remark TEXT,
    fourth_call_date TIMESTAMP,
    fourth_call_remark TEXT,
    fifth_call_date TIMESTAMP,
    fifth_call_remark TEXT,
    sixth_call_date TIMESTAMP,
    sixth_call_remark TEXT,
    seventh_call_date TIMESTAMP,
    seventh_call_remark TEXT,
    
    test_drive_done BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (ps_id) REFERENCES ps_users(id)
);

-- ========================================
-- 4. CALL TRACKING TABLES
-- ========================================

-- CRE Call Attempt History
CREATE TABLE IF NOT EXISTS cre_call_attempt_history (
    id SERIAL PRIMARY KEY,
    uid VARCHAR,
    call_no VARCHAR NOT NULL,
    attempt INTEGER NOT NULL,
    status VARCHAR NOT NULL,
    cre_name VARCHAR NOT NULL,
    cre_id UUID,
    call_was_recorded BOOLEAN DEFAULT false,
    follow_up_date DATE,
    remarks TEXT,
    final_status TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (uid) REFERENCES lead_master(uid) ON DELETE CASCADE,
    FOREIGN KEY (cre_id) REFERENCES cre_users(id)
);

-- PS Call Attempt History
CREATE TABLE IF NOT EXISTS ps_call_attempt_history (
    id SERIAL PRIMARY KEY,
    uid VARCHAR NOT NULL,
    call_no VARCHAR NOT NULL,
    attempt INTEGER NOT NULL,
    status VARCHAR,
    ps_name VARCHAR,
    ps_id UUID,
    call_was_recorded BOOLEAN DEFAULT false,
    follow_up_date DATE,
    remarks TEXT,
    final_status TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (ps_id) REFERENCES ps_users(id)
);

-- ========================================
-- 5. DUPLICATE MANAGEMENT
-- ========================================

CREATE TABLE IF NOT EXISTS duplicate_leads (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(20) UNIQUE NOT NULL,
    customer_mobile_number VARCHAR(15) UNIQUE NOT NULL,
    customer_name VARCHAR(100),
    original_lead_id INTEGER,
    original_table VARCHAR(50),
    original_record_id VARCHAR(100),
    
    -- Multiple source tracking
    source1 VARCHAR(50) NOT NULL,
    sub_source1 TEXT,
    date1 DATE,
    source2 VARCHAR(50), sub_source2 TEXT, date2 DATE,
    source3 VARCHAR(50), sub_source3 TEXT, date3 DATE,
    source4 VARCHAR(50), sub_source4 TEXT, date4 DATE,
    source5 VARCHAR(50), sub_source5 TEXT, date5 DATE,
    source6 VARCHAR(50), sub_source6 TEXT, date6 DATE,
    source7 VARCHAR(50), sub_source7 TEXT, date7 DATE,
    source8 VARCHAR(50), sub_source8 TEXT, date8 DATE,
    source9 VARCHAR(50), sub_source9 TEXT, date9 DATE,
    source10 VARCHAR(50), sub_source10 TEXT, date10 DATE,
    
    duplicate_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (original_lead_id) REFERENCES lead_master(id) ON DELETE SET NULL
);

-- ========================================
-- 6. AUTO ASSIGNMENT SYSTEM
-- ========================================

CREATE TABLE IF NOT EXISTS auto_assign_config (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    cre_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(source, cre_id),
    FOREIGN KEY (cre_id) REFERENCES cre_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auto_assign_history (
    id SERIAL PRIMARY KEY,
    lead_uid VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    assigned_cre_id UUID NOT NULL,
    assigned_cre_name VARCHAR(255) NOT NULL,
    cre_total_leads_before INTEGER NOT NULL,
    cre_total_leads_after INTEGER NOT NULL,
    assignment_method VARCHAR(50) DEFAULT 'fair_distribution',
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    updated_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    
    FOREIGN KEY (assigned_cre_id) REFERENCES cre_users(id) ON DELETE CASCADE
);

-- ========================================
-- 7. SECURITY & AUDIT TABLES
-- ========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    user_type VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    username VARCHAR(100),
    user_type VARCHAR(20),
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- ========================================
-- 8. COMMUNICATION TABLES
-- ========================================

CREATE TABLE IF NOT EXISTS call_logs (
    id BIGSERIAL PRIMARY KEY,
    lead_uid TEXT,
    customer_phone TEXT,
    sr_number TEXT,
    call_id TEXT,
    status TEXT,
    agent_extension TEXT,
    callback_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sip_users (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(10) NOT NULL,
    sip_extension VARCHAR(10) UNIQUE NOT NULL,
    sip_password VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    caller_id VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CHECK (user_type IN ('admin', 'cre', 'ps', 'bh'))
);

-- ========================================
-- 9. UTILITY TABLES
-- ========================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CHECK (user_type IN ('admin', 'cre', 'ps', 'bh'))
);

-- ========================================
-- 10. INSERT INITIAL DATA
-- ========================================

-- Insert default branch
INSERT INTO branches (name, code, address, status) 
VALUES ('Main Branch', 'MAIN', 'Head Office', 'active')
ON CONFLICT DO NOTHING;

-- Insert test users
INSERT INTO admin_users (username, password_hash, email, first_name, last_name, phone) 
VALUES ('admin', 'admin123', 'admin@epiccrm.com', 'System', 'Administrator', '+1234567890')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO cre_users (username, password_hash, email, name, first_name, last_name, phone, branch_id) 
VALUES ('cre', 'cre123', 'cre@epiccrm.com', 'CRE User', 'Customer Relations', 'Executive', '+1234567891', 1)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO ps_users (username, password_hash, email, name, first_name, last_name, phone, branch, branch_id) 
VALUES ('ps', 'ps123', 'ps@epiccrm.com', 'PS User', 'Pre Sales', 'Executive', '+1234567892', 'Main Branch', 1)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO bh_users (username, password_hash, email, name, first_name, last_name, phone, branch, branch_id) 
VALUES ('branchhead', 'branchhead123', 'branchhead@epiccrm.com', 'Branch Head', 'Branch', 'Manager', '+1234567893', 'Main Branch', 1)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ========================================
-- 11. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Lead Master Indexes
CREATE INDEX IF NOT EXISTS idx_lead_master_uid ON lead_master(uid);
CREATE INDEX IF NOT EXISTS idx_lead_master_cre_name ON lead_master(cre_name);
CREATE INDEX IF NOT EXISTS idx_lead_master_ps_name ON lead_master(ps_name);
CREATE INDEX IF NOT EXISTS idx_lead_master_final_status ON lead_master(final_status);
CREATE INDEX IF NOT EXISTS idx_lead_master_created_at ON lead_master(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_master_follow_up_date ON lead_master(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_lead_master_mobile ON lead_master(customer_mobile_number);

-- Activity Leads Indexes
CREATE INDEX IF NOT EXISTS idx_activity_leads_activity_uid ON activity_leads(activity_uid);
CREATE INDEX IF NOT EXISTS idx_activity_leads_ps_name ON activity_leads(ps_name);
CREATE INDEX IF NOT EXISTS idx_activity_leads_cre_assigned ON activity_leads(cre_assigned);
CREATE INDEX IF NOT EXISTS idx_activity_leads_final_status ON activity_leads(final_status);

-- User Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_cre_users_username ON cre_users(username);
CREATE INDEX IF NOT EXISTS idx_ps_users_username ON ps_users(username);
CREATE INDEX IF NOT EXISTS idx_bh_users_username ON bh_users(username);

-- Call History Indexes
CREATE INDEX IF NOT EXISTS idx_cre_call_history_uid ON cre_call_attempt_history(uid);
CREATE INDEX IF NOT EXISTS idx_ps_call_history_uid ON ps_call_attempt_history(uid);

-- Audit Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Verify the schema
SELECT 'EPICCRM 2.0 Database Schema Created Successfully' as status;
