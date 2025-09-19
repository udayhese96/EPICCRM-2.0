-- Add Branch and PS columns to lead_master table (backend names)
ALTER TABLE public.lead_master 
ADD COLUMN IF NOT EXISTS branch character varying(100),
ADD COLUMN IF NOT EXISTS ps_name character varying(100),
ADD COLUMN IF NOT EXISTS ps_id character varying(100);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_master_branch ON public.lead_master(branch);
CREATE INDEX IF NOT EXISTS idx_lead_master_ps_name ON public.lead_master(ps_name);
CREATE INDEX IF NOT EXISTS idx_lead_master_ps_id ON public.lead_master(ps_id);

-- Update existing leads with branch and ps info from qualified_leads
UPDATE public.lead_master 
SET 
  branch = ql.branch,
  ps_name = ql.ps_name,
  ps_id = ql.ps_id
FROM public.qualified_leads ql
WHERE lead_master.uid = ql.lead_uid
AND ql.ps_name IS NOT NULL;
