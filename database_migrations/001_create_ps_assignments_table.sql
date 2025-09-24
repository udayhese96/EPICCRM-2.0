-- Create PS Assignments table
-- This table manages the assignment of PS users to Sales Team Leaders

CREATE TABLE IF NOT EXISTS ps_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ps_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sales_team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a PS user can only be assigned to one sales team leader
    UNIQUE(ps_user_id),
    
    -- Ensure both users exist and have correct roles
    CONSTRAINT check_ps_user_role CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = ps_user_id AND role = 'ps'
        )
    ),
    CONSTRAINT check_sales_team_leader_role CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = sales_team_leader_id AND role = 'sales_team_leader'
        )
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ps_assignments_ps_user_id ON ps_assignments(ps_user_id);
CREATE INDEX IF NOT EXISTS idx_ps_assignments_sales_team_leader_id ON ps_assignments(sales_team_leader_id);
CREATE INDEX IF NOT EXISTS idx_ps_assignments_created_at ON ps_assignments(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ps_assignments_updated_at 
    BEFORE UPDATE ON ps_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE ps_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for admins - can do everything
CREATE POLICY "Admins can manage all ps_assignments" ON ps_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy for branch heads - can manage assignments in their branch
CREATE POLICY "Branch heads can manage ps_assignments in their branch" ON ps_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'branch_head'
            AND branch = (
                SELECT branch FROM users 
                WHERE id = ps_user_id
            )
        )
    );

-- Policy for sales team leaders - can read their own assignments
CREATE POLICY "Sales team leaders can read their assignments" ON ps_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'sales_team_leader'
            AND id = sales_team_leader_id
        )
    );

-- Policy for PS users - can read their own assignment
CREATE POLICY "PS users can read their assignment" ON ps_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'ps'
            AND id = ps_user_id
        )
    );
