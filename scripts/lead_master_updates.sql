-- Lead Master Table Updates for CRE Lead Flow
-- Add new columns to store detailed lead information

ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS model_interested TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS variant TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS profession_remarks TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS buying_plan TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS buying_plan_remarks TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS finance_option TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS finance_remarks TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS test_drive_required BOOLEAN DEFAULT FALSE;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS test_drive_type TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS test_drive_remarks TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS trade_in TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS trade_in_make TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS trade_in_model TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS trade_in_year INTEGER;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS trade_in_km INTEGER;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS trade_in_ownership TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS trade_in_remarks TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS general_remarks TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS pending_reason TEXT;

-- Update lead_status enum to include new statuses
ALTER TABLE lead_master ALTER COLUMN lead_status TYPE TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_master_model_interested ON lead_master(model_interested);
CREATE INDEX IF NOT EXISTS idx_lead_master_profession ON lead_master(profession);
CREATE INDEX IF NOT EXISTS idx_lead_master_buying_plan ON lead_master(buying_plan);
CREATE INDEX IF NOT EXISTS idx_lead_master_finance_option ON lead_master(finance_option);
CREATE INDEX IF NOT EXISTS idx_lead_master_trade_in ON lead_master(trade_in);
CREATE INDEX IF NOT EXISTS idx_lead_master_lost_reason ON lead_master(lost_reason);
CREATE INDEX IF NOT EXISTS idx_lead_master_pending_reason ON lead_master(pending_reason);

-- Add comments for clarity
COMMENT ON COLUMN lead_master.model_interested IS 'Toyota model customer is interested in';
COMMENT ON COLUMN lead_master.variant IS 'Specific variant of the model';
COMMENT ON COLUMN lead_master.profession IS 'Customer profession: Salaried, Business, Self Employed, Doctor, Govt Employee';
COMMENT ON COLUMN lead_master.profession_remarks IS 'Additional remarks about profession';
COMMENT ON COLUMN lead_master.buying_plan IS 'When customer plans to buy: 0-1 Months, 1-2 Months, etc.';
COMMENT ON COLUMN lead_master.buying_plan_remarks IS 'Additional remarks about buying timeline';
COMMENT ON COLUMN lead_master.finance_option IS 'Finance preference: Inhouse or Outright';
COMMENT ON COLUMN lead_master.finance_remarks IS 'Additional finance related remarks';
COMMENT ON COLUMN lead_master.test_drive_required IS 'Whether customer wants test drive';
COMMENT ON COLUMN lead_master.test_drive_type IS 'Type of test drive: Home Test Drive or Showroom visit';
COMMENT ON COLUMN lead_master.test_drive_remarks IS 'Test drive related remarks';
COMMENT ON COLUMN lead_master.trade_in IS 'Trade in option: Yes, Additional, Buying for first time';
COMMENT ON COLUMN lead_master.trade_in_make IS 'Make of trade-in vehicle';
COMMENT ON COLUMN lead_master.trade_in_model IS 'Model of trade-in vehicle';
COMMENT ON COLUMN lead_master.trade_in_year IS 'Manufacturing year of trade-in vehicle';
COMMENT ON COLUMN lead_master.trade_in_km IS 'KM driven of trade-in vehicle';
COMMENT ON COLUMN lead_master.trade_in_ownership IS 'Ownership type: first, second, third, more';
COMMENT ON COLUMN lead_master.trade_in_remarks IS 'Trade-in vehicle remarks';
COMMENT ON COLUMN lead_master.general_remarks IS 'General lead remarks';
COMMENT ON COLUMN lead_master.lost_reason IS 'Reason for losing lead: Not interested, Did not enquire, etc.';
COMMENT ON COLUMN lead_master.pending_reason IS 'Reason for pending: RNR, Call me back';
