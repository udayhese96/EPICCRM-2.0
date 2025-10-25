-- Add foreign key relationships for analytics optimization
-- This script adds proper foreign key constraints between tables

-- Add foreign key from booking_and_retail_master to lead_master
ALTER TABLE public.booking_and_retail_master 
ADD CONSTRAINT fk_booking_retail_master_lead_master 
FOREIGN KEY (lead_uid) REFERENCES public.lead_master(uid) ON DELETE CASCADE;

-- Add foreign key from qualified_leads to lead_master (if not already exists)
-- Note: This might already exist based on your schema, but adding it to be safe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'qualified_leads_lead_uid_fkey' 
        AND table_name = 'qualified_leads'
    ) THEN
        ALTER TABLE public.qualified_leads 
        ADD CONSTRAINT qualified_leads_lead_uid_fkey 
        FOREIGN KEY (lead_uid) REFERENCES public.lead_master(uid) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key from trade_in_master to lead_master (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trade_in_master_lead_uid_fkey' 
        AND table_name = 'trade_in_master'
    ) THEN
        ALTER TABLE public.trade_in_master 
        ADD CONSTRAINT trade_in_master_lead_uid_fkey 
        FOREIGN KEY (lead_uid) REFERENCES public.lead_master(uid) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance on foreign key relationships
CREATE INDEX IF NOT EXISTS idx_booking_retail_master_lead_uid_fk 
ON public.booking_and_retail_master(lead_uid);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_lead_uid_fk 
ON public.qualified_leads(lead_uid);

CREATE INDEX IF NOT EXISTS idx_trade_in_master_lead_uid_fk 
ON public.trade_in_master(lead_uid);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_lead_master_created_status 
ON public.lead_master(created_at DESC, final_status);

CREATE INDEX IF NOT EXISTS idx_lead_master_branch_created 
ON public.lead_master(branch, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qualified_leads_created_status 
ON public.qualified_leads(created_at DESC, final_status);

CREATE INDEX IF NOT EXISTS idx_booking_retail_master_created_status 
ON public.booking_and_retail_master(created_at DESC, final_status);

-- Verify the constraints were created
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('booking_and_retail_master', 'qualified_leads', 'trade_in_master')
ORDER BY tc.table_name, tc.constraint_name;


