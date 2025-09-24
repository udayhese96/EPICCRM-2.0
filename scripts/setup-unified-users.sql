-- SQL to set up unified users table with team_leader role support

-- 1. Create team_leader_assignments table (if not exists)
CREATE TABLE IF NOT EXISTS team_leader_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ps_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a PS user can only be assigned to one team leader at a time
    UNIQUE(ps_user_id)
);

-- 2. Create indexes for team_leader_assignments
CREATE INDEX IF NOT EXISTS idx_team_leader_assignments_ps_user_id ON team_leader_assignments(ps_user_id);
CREATE INDEX IF NOT EXISTS idx_team_leader_assignments_team_leader_id ON team_leader_assignments(team_leader_id);

-- 3. Create trigger for team_leader_assignments
CREATE OR REPLACE FUNCTION update_team_leader_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_leader_assignments_updated_at
    BEFORE UPDATE ON team_leader_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_team_leader_assignments_updated_at();

-- 4. Make sure users table has the required columns (if not already present)
-- These ALTER statements are safe to run even if columns already exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 5. Update existing users to have proper roles (adjust as needed)
-- UPDATE users SET role = 'admin' WHERE role IS NULL AND username = 'your_admin_username';
-- UPDATE users SET role = 'ps' WHERE role IS NULL AND username LIKE '%ps%';

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

COMMENT ON TABLE team_leader_assignments IS 'Assigns PS users to team leaders for analytical oversight';
COMMENT ON COLUMN users.role IS 'User role: admin, cre, ps, branch_head, team_leader, etc.';
