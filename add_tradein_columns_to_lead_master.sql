-- Only keep a single trade-in flag on lead_master
-- Detailed fields live in trade_in_master

ALTER TABLE lead_master
  ADD COLUMN IF NOT EXISTS trade_in TEXT;

-- Clean up any legacy columns (safe if they don't exist)
ALTER TABLE lead_master
  DROP COLUMN IF EXISTS trade_in_make,
  DROP COLUMN IF EXISTS trade_in_model,
  DROP COLUMN IF EXISTS trade_in_year,
  DROP COLUMN IF EXISTS trade_in_km,
  DROP COLUMN IF EXISTS trade_in_ownership;

COMMENT ON COLUMN lead_master.trade_in IS 'Yes/No flag indicating if customer has a trade-in';


