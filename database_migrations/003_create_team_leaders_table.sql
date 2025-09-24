-- Create team_leaders table for storing team leader users
CREATE TABLE IF NOT EXISTS team_leaders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    branch VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_leaders_username ON team_leaders(username);
CREATE INDEX IF NOT EXISTS idx_team_leaders_email ON team_leaders(email);
CREATE INDEX IF NOT EXISTS idx_team_leaders_branch ON team_leaders(branch);
CREATE INDEX IF NOT EXISTS idx_team_leaders_is_active ON team_leaders(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_leaders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_leaders_updated_at
    BEFORE UPDATE ON team_leaders
    FOR EACH ROW
    EXECUTE FUNCTION update_team_leaders_updated_at();
