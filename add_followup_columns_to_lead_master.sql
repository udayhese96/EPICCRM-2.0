-- Add follow-up columns to lead_master table
-- These columns are needed for the follow-up progression logic (F1, F2, F3, etc.)

-- Add second call columns (F1 - First Follow-up)
ALTER TABLE lead_master
ADD COLUMN IF NOT EXISTS second_call_remark TEXT,
ADD COLUMN IF NOT EXISTS second_call_date TIMESTAMP WITH TIME ZONE;

-- Add third call columns (F2 - Second Follow-up)
ALTER TABLE lead_master
ADD COLUMN IF NOT EXISTS third_call_remark TEXT,
ADD COLUMN IF NOT EXISTS third_call_date TIMESTAMP WITH TIME ZONE;

-- Add fourth call columns (F3 - Third Follow-up)
ALTER TABLE lead_master
ADD COLUMN IF NOT EXISTS fourth_call_remark TEXT,
ADD COLUMN IF NOT EXISTS fourth_call_date TIMESTAMP WITH TIME ZONE;

-- Add fifth call columns (F4 - Fourth Follow-up)
ALTER TABLE lead_master
ADD COLUMN IF NOT EXISTS fifth_call_remark TEXT,
ADD COLUMN IF NOT EXISTS fifth_call_date TIMESTAMP WITH TIME ZONE;

-- Add sixth call columns (F5 - Fifth Follow-up)
ALTER TABLE lead_master
ADD COLUMN IF NOT EXISTS sixth_call_remark TEXT,
ADD COLUMN IF NOT EXISTS sixth_call_date TIMESTAMP WITH TIME ZONE;

-- Add seventh call columns (F6 - Sixth Follow-up)
ALTER TABLE lead_master
ADD COLUMN IF NOT EXISTS seventh_call_remark TEXT,
ADD COLUMN IF NOT EXISTS seventh_call_date TIMESTAMP WITH TIME ZONE;

-- Add comments to document the columns
COMMENT ON COLUMN lead_master.second_call_remark IS 'F1 - First follow-up remark';
COMMENT ON COLUMN lead_master.second_call_date IS 'F1 - First follow-up date';
COMMENT ON COLUMN lead_master.third_call_remark IS 'F2 - Second follow-up remark';
COMMENT ON COLUMN lead_master.third_call_date IS 'F2 - Second follow-up date';
COMMENT ON COLUMN lead_master.fourth_call_remark IS 'F3 - Third follow-up remark';
COMMENT ON COLUMN lead_master.fourth_call_date IS 'F3 - Third follow-up date';
COMMENT ON COLUMN lead_master.fifth_call_remark IS 'F4 - Fourth follow-up remark';
COMMENT ON COLUMN lead_master.fifth_call_date IS 'F4 - Fourth follow-up date';
COMMENT ON COLUMN lead_master.sixth_call_remark IS 'F5 - Fifth follow-up remark';
COMMENT ON COLUMN lead_master.sixth_call_date IS 'F5 - Fifth follow-up date';
COMMENT ON COLUMN lead_master.seventh_call_remark IS 'F6 - Sixth follow-up remark';
COMMENT ON COLUMN lead_master.seventh_call_date IS 'F6 - Sixth follow-up date';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lead_master' 
AND column_name LIKE '%call_%'
ORDER BY column_name;
