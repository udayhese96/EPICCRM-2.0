-- Add customer_location column to qualified_leads table
-- This script adds the customer_location column to store location data when leads are qualified

-- Add customer_location column to qualified_leads table
ALTER TABLE public.qualified_leads 
ADD COLUMN IF NOT EXISTS customer_location text NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.qualified_leads.customer_location IS 'Customer location information populated when lead is qualified';

-- Create index for better performance on location-based queries
CREATE INDEX IF NOT EXISTS idx_qualified_leads_customer_location 
ON public.qualified_leads(customer_location);

-- Update existing records to have empty string for customer_location if NULL
UPDATE public.qualified_leads 
SET customer_location = '' 
WHERE customer_location IS NULL;

COMMIT;

