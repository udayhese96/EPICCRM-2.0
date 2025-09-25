-- Update the existing users table to add team_leader role

-- 1. Add team_leader to the role constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role::text = ANY (
    ARRAY[
      'admin'::character varying,
      'cre'::character varying,
      'ps'::character varying,
      'branch_head'::character varying,
      'cre_team_leader'::character varying,
      'cre_icrop'::character varying,
      'sales_manager'::character varying,
      'team_leader'::character varying
    ]::text[]
  )
);

-- 2. Create team_leader_assignments table
CREATE TABLE IF NOT EXISTS team_leader_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ps_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a PS user can only be assigned to one team leader at a time
    UNIQUE(ps_user_id)
);

-- 3. Create indexes for team_leader_assignments
CREATE INDEX IF NOT EXISTS idx_team_leader_assignments_ps_user_id ON team_leader_assignments(ps_user_id);
CREATE INDEX IF NOT EXISTS idx_team_leader_assignments_team_leader_id ON team_leader_assignments(team_leader_id);

-- 4. Create trigger for team_leader_assignments
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

-- 5. Add comments for documentation
COMMENT ON TABLE team_leader_assignments IS 'Assigns PS users to team leaders for analytical oversight';
COMMENT ON COLUMN users.role IS 'User role: admin, cre, ps, branch_head, cre_team_leader, cre_icrop, sales_manager, team_leader';
