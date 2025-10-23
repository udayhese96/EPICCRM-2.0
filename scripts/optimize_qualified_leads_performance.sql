-- Performance optimization for qualified_leads table
-- This script adds indexes to improve query performance and reduce 502 errors

-- Add indexes for common query patterns on qualified_leads table
CREATE INDEX IF NOT EXISTS idx_qualified_leads_created_at_desc 
ON public.qualified_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_source 
ON public.qualified_leads(source);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_final_status 
ON public.qualified_leads(final_status);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_cre_name 
ON public.qualified_leads(cre_name);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_ps_name 
ON public.qualified_leads(ps_name);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_branch 
ON public.qualified_leads(branch);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_lead_uid 
ON public.qualified_leads(lead_uid);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_qualified_leads_source_created 
ON public.qualified_leads(source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_status_created 
ON public.qualified_leads(final_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_cre_created 
ON public.qualified_leads(cre_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_branch_created 
ON public.qualified_leads(branch, created_at DESC);

-- Index for the OR condition used in CRE team leader endpoint
CREATE INDEX IF NOT EXISTS idx_qualified_leads_active_status 
ON public.qualified_leads(final_status) 
WHERE final_status IS NULL OR final_status IN ('Pending', 'Follow-up', 'Waiting for Approval');

-- Index for booking/retailed status queries
CREATE INDEX IF NOT EXISTS idx_qualified_leads_booking_status 
ON public.qualified_leads(booking_status);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_retailed_status 
ON public.qualified_leads(retailed_status);

-- Composite index for approval requests
CREATE INDEX IF NOT EXISTS idx_qualified_leads_approval_status 
ON public.qualified_leads(booking_status, retailed_status, branch);

-- Analyze tables to update statistics
ANALYZE public.qualified_leads;

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'qualified_leads'
ORDER BY indexname;
