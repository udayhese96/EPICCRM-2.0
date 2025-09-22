-- Add icrop_id column to ps_followup_master table
ALTER TABLE ps_followup_master 
ADD COLUMN icrop_id TEXT;

-- Add icrop_id column to lead_master table
ALTER TABLE lead_master 
ADD COLUMN icrop_id TEXT;

-- Update existing records in ps_followup_master with icrop_id from qualified_leads table
UPDATE ps_followup_master 
SET icrop_id = ql.icrop_id
FROM qualified_leads ql
WHERE ps_followup_master.lead_uid = ql.lead_uid
AND ql.icrop_id IS NOT NULL
AND ql.icrop_id != '';

-- Update existing records in lead_master with icrop_id from qualified_leads table
UPDATE lead_master 
SET icrop_id = ql.icrop_id
FROM qualified_leads ql
WHERE lead_master.uid = ql.lead_uid
AND ql.icrop_id IS NOT NULL
AND ql.icrop_id != '';

-- Add comments to document the columns
COMMENT ON COLUMN ps_followup_master.icrop_id IS 'ICROP ID assigned to the lead';
COMMENT ON COLUMN lead_master.icrop_id IS 'ICROP ID assigned to the lead';
