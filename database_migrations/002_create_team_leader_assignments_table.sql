-- Create team_leader_assignments table
CREATE TABLE IF NOT EXISTS team_leader_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ps_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a PS user can only be assigned to one team leader at a time
    UNIQUE(ps_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_leader_assignments_ps_user_id ON team_leader_assignments(ps_user_id);
CREATE INDEX IF NOT EXISTS idx_team_leader_assignments_team_leader_id ON team_leader_assignments(team_leader_id);

-- Create trigger to update updated_at timestamp
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
