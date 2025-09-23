-- Add icrop_id column to tables if it doesn't exist
-- This ensures ICROP ID is available across all dashboards

-- Add icrop_id to lead_master table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_master' 
        AND column_name = 'icrop_id'
    ) THEN
        ALTER TABLE lead_master ADD COLUMN icrop_id VARCHAR(50);
        COMMENT ON COLUMN lead_master.icrop_id IS 'ICROP ID assigned by CRE ICROP user';
    END IF;
END $$;

-- Add icrop_id to ps_followup_master table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ps_followup_master' 
        AND column_name = 'icrop_id'
    ) THEN
        ALTER TABLE ps_followup_master ADD COLUMN icrop_id VARCHAR(50);
        COMMENT ON COLUMN ps_followup_master.icrop_id IS 'ICROP ID assigned by CRE ICROP user';
    END IF;
END $$;

-- Verify columns exist
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('lead_master', 'ps_followup_master', 'qualified_leads')
AND column_name = 'icrop_id'
ORDER BY table_name;
