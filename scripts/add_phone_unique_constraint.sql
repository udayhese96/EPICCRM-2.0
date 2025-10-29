-- Migration to add unique constraint on customer_mobile_number for duplicate prevention
-- Run this script to ensure phone number uniqueness in lead_master table

-- Step 1: First, let's identify and handle existing duplicates
-- Create a temporary table to store leads we want to keep (most recent ones)
CREATE TEMPORARY TABLE leads_to_keep AS
SELECT DISTINCT ON (customer_mobile_number) id, uid, customer_mobile_number
FROM lead_master 
WHERE customer_mobile_number IS NOT NULL 
  AND customer_mobile_number != ''
ORDER BY customer_mobile_number, created_at DESC;

-- Step 2: Create a temporary table for duplicate leads that will be merged
CREATE TEMPORARY TABLE duplicate_leads AS
SELECT id, uid, customer_mobile_number, customer_name, created_at
FROM lead_master 
WHERE customer_mobile_number IS NOT NULL 
  AND customer_mobile_number != ''
  AND id NOT IN (SELECT id FROM leads_to_keep);

-- Step 3: Log the duplicates before cleanup (optional - for audit)
DO $$ 
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count FROM duplicate_leads;
    RAISE NOTICE 'Found % duplicate leads to be cleaned up', duplicate_count;
END $$;

-- Step 4: Update related tables to point to the kept lead
-- Update qualified_leads table
UPDATE qualified_leads 
SET lead_uid = (
    SELECT ltk.uid 
    FROM leads_to_keep ltk 
    WHERE ltk.customer_mobile_number = (
        SELECT lm.customer_mobile_number 
        FROM lead_master lm 
        WHERE lm.uid = qualified_leads.lead_uid
    )
)
WHERE lead_uid IN (SELECT uid FROM duplicate_leads);

-- Update lead_activities if it exists (assuming it references lead by uid)
UPDATE lead_activities 
SET lead_uid = (
    SELECT ltk.uid 
    FROM leads_to_keep ltk 
    WHERE ltk.customer_mobile_number = (
        SELECT lm.customer_mobile_number 
        FROM lead_master lm 
        WHERE lm.uid = lead_activities.lead_uid
    )
)
WHERE lead_uid IN (SELECT uid FROM duplicate_leads);

-- Update trade_in_master if it exists
UPDATE trade_in_master 
SET lead_uid = (
    SELECT ltk.uid 
    FROM leads_to_keep ltk 
    WHERE ltk.customer_mobile_number = (
        SELECT lm.customer_mobile_number 
        FROM lead_master lm 
        WHERE lm.uid = trade_in_master.lead_uid
    )
)
WHERE lead_uid IN (SELECT uid FROM duplicate_leads);

-- Step 5: Delete the duplicate leads
DELETE FROM lead_master 
WHERE id IN (SELECT id FROM duplicate_leads);

-- Step 6: Add unique constraint on customer_mobile_number
ALTER TABLE lead_master 
ADD CONSTRAINT unique_customer_mobile_number 
UNIQUE (customer_mobile_number);

-- Step 7: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_master_mobile 
ON lead_master (customer_mobile_number);

-- Verification query
SELECT 
    customer_mobile_number,
    COUNT(*) as count,
    string_agg(uid, ', ') as uids
FROM lead_master 
WHERE customer_mobile_number IS NOT NULL 
GROUP BY customer_mobile_number 
HAVING COUNT(*) > 1;

RAISE NOTICE 'Migration completed. If the verification query above returns any rows, there are still duplicates to resolve manually.';
