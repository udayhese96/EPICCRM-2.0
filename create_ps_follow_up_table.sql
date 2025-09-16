-- Create PS Follow-up Master Table
CREATE TABLE IF NOT EXISTS public.ps_follow_up_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_uid VARCHAR(20) NOT NULL,
    ps_id UUID NOT NULL,
    ps_name VARCHAR(100) NOT NULL,
    follow_up_date TIMESTAMP NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_lead_uid FOREIGN KEY (lead_uid) REFERENCES lead_master(uid),
    CONSTRAINT fk_ps_id FOREIGN KEY (ps_id) REFERENCES ps_users(id)
);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_ps_follow_up_lead_uid ON public.ps_follow_up_master(lead_uid);
CREATE INDEX IF NOT EXISTS idx_ps_follow_up_ps_id ON public.ps_follow_up_master(ps_id);
CREATE INDEX IF NOT EXISTS idx_ps_follow_up_status ON public.ps_follow_up_master(status);
CREATE INDEX IF NOT EXISTS idx_ps_follow_up_date ON public.ps_follow_up_master(follow_up_date);
