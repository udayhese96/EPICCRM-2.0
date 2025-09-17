-- Remove trade-in columns from lead_master table
-- These columns are redundant since we have a separate trade_in_master table

-- Drop trade-in related columns from lead_master
ALTER TABLE lead_master DROP COLUMN IF EXISTS trade_in;
ALTER TABLE lead_master DROP COLUMN IF EXISTS trade_in_make;
ALTER TABLE lead_master DROP COLUMN IF EXISTS trade_in_model;
ALTER TABLE lead_master DROP COLUMN IF EXISTS trade_in_year;
ALTER TABLE lead_master DROP COLUMN IF EXISTS trade_in_km;
ALTER TABLE lead_master DROP COLUMN IF EXISTS trade_in_ownership;

-- Verify the columns have been removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'lead_master' 
AND column_name LIKE 'trade_in%';
