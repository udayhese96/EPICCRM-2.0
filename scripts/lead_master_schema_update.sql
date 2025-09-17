-- EPIC CRM 2.0 - lead_master schema update
-- Changes:
-- 1) Drop columns: branch, branch_id, ps_name, ps_id, ps_assigned_at,
--    lead_remark, sixth_call_date, sixth_remark, seventh_call_date, seventh_remark
-- 2) Add column: customer_location (TEXT)
-- 3) Create helpful indexes

BEGIN;

-- 1) Drop foreign key constraints if present (safe IF EXISTS)
ALTER TABLE IF EXISTS public.lead_master
  DROP CONSTRAINT IF EXISTS lead_master_branch_id_fkey,
  DROP CONSTRAINT IF EXISTS lead_master_ps_id_fkey;

-- 2) Drop columns (safe IF EXISTS)
ALTER TABLE IF EXISTS public.lead_master
  DROP COLUMN IF EXISTS branch,
  DROP COLUMN IF EXISTS branch_id,
  DROP COLUMN IF EXISTS ps_name,
  DROP COLUMN IF EXISTS ps_id,
  DROP COLUMN IF EXISTS ps_assigned_at,
  DROP COLUMN IF EXISTS lead_remark,
  DROP COLUMN IF EXISTS sixth_call_date,
  DROP COLUMN IF EXISTS sixth_remark,
  DROP COLUMN IF EXISTS seventh_call_date,
  DROP COLUMN IF EXISTS seventh_remark;

-- 3) Add new column for location (nullable, text)
ALTER TABLE IF EXISTS public.lead_master
  ADD COLUMN IF NOT EXISTS customer_location TEXT;

-- 4) Create index for location queries
CREATE INDEX IF NOT EXISTS idx_lead_master_location
  ON public.lead_master USING btree (customer_location);

COMMIT;


