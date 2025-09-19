-- Setup script for Lead Qualification and Assignment System
-- Run this script in your Supabase SQL editor or PostgreSQL database

-- 1. Create qualified_leads table
CREATE TABLE IF NOT EXISTS public.qualified_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_uid character varying(32) NULL,
  customer_name text NULL,
  customer_mobile_number text NULL,
  source text NULL,
  sub_source text NULL,
  cre_name text NULL,
  lead_category text NULL,
  model_interested text NULL,
  first_remark text NULL,
  variant text NULL,
  buying_plan text NULL,
  finance_option text NULL,
  profession text NULL,
  test_drive_type text NULL,
  trade_in text NULL,
  branch text NULL,
  ps_name text NULL,
  icrop_id text NULL,
  created_at timestamp without time zone NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  updated_at timestamp without time zone NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  CONSTRAINT qualified_leads_pkey PRIMARY KEY (id),
  CONSTRAINT qualified_leads_lead_uid_key UNIQUE (lead_uid)
) TABLESPACE pg_default;

-- 2. Create ps_followup_master table
CREATE TABLE IF NOT EXISTS public.ps_followup_master (
  id serial NOT NULL,
  lead_uid character varying(20) NOT NULL,
  ps_name character varying(100) NOT NULL,
  ps_id uuid NULL,
  ps_branch character varying(50) NOT NULL,
  customer_name character varying(100) NULL,
  customer_mobile_number character varying(15) NULL,
  alternate_mobile_number character varying(20) NULL,
  source character varying(50) NULL,
  cre_name character varying(100) NULL,
  cre_id uuid NULL,
  lead_category character varying(20) NULL,
  model_interested text NULL,
  follow_up_date date NULL,
  lead_status character varying(50) NULL,
  first_call_date date NULL,
  first_call_remark text NULL,
  second_call_date date NULL,
  second_call_remark text NULL,
  third_call_date date NULL,
  third_call_remark text NULL,
  fourth_call_date date NULL,
  fourth_call_remark text NULL,
  fifth_call_date date NULL,
  fifth_call_remark text NULL,
  sixth_call_date date NULL,
  sixth_call_remark text NULL,
  seventh_call_date date NULL,
  seventh_call_remark text NULL,
  final_status character varying(20) NULL DEFAULT 'Pending'::character varying,
  test_drive_done boolean NULL,
  tat double precision NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  ps_assigned_at timestamp without time zone NULL,
  won_timestamp timestamp without time zone NULL,
  lost_timestamp timestamp without time zone NULL,
  variant text NULL,
  buying_plan text NULL,
  finance_option text NULL,
  CONSTRAINT ps_followup_master_pkey PRIMARY KEY (id),
  CONSTRAINT ps_followup_master_cre_id_fkey FOREIGN KEY (cre_id) REFERENCES cre_users (id),
  CONSTRAINT ps_followup_master_lead_uid_fkey FOREIGN KEY (lead_uid) REFERENCES lead_master (uid) ON DELETE CASCADE,
  CONSTRAINT ps_followup_master_ps_id_fkey FOREIGN KEY (ps_id) REFERENCES ps_users (id)
) TABLESPACE pg_default;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qualified_leads_lead_uid ON public.qualified_leads(lead_uid);
CREATE INDEX IF NOT EXISTS idx_qualified_leads_ps_name ON public.qualified_leads(ps_name);
CREATE INDEX IF NOT EXISTS idx_qualified_leads_created_at ON public.qualified_leads(created_at);

CREATE INDEX IF NOT EXISTS idx_ps_followup_lead_uid ON public.ps_followup_master(lead_uid);
CREATE INDEX IF NOT EXISTS idx_ps_followup_ps_id ON public.ps_followup_master(ps_id);
CREATE INDEX IF NOT EXISTS idx_ps_followup_final_status ON public.ps_followup_master(final_status);
CREATE INDEX IF NOT EXISTS idx_ps_followup_follow_up_date ON public.ps_followup_master(follow_up_date);

-- 4. Insert sample CRE Team Leader user (if not exists)
INSERT INTO cre_users (id, name, username, email, phone, password_hash, is_active, created_at)
VALUES (
  gen_random_uuid(),
  'CRE Team Leader',
  'cre_team_leader',
  'cre_team_leader@epiccrm.com',
  '+1234567894',
  'team123', -- In production, use proper password hashing
  true,
  now()
) ON CONFLICT (username) DO NOTHING;

-- 5. Insert sample branches (if not exists)
INSERT INTO branches (id, name, code, address, city, state, pincode, phone, email, is_active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Mount Road', 'MR', '123 Mount Road', 'Chennai', 'Tamil Nadu', '600002', '+91-44-12345678', 'mountroad@epiccrm.com', true, now(), now()),
  (gen_random_uuid(), 'Vyasarpadi', 'VY', '456 Vyasarpadi', 'Chennai', 'Tamil Nadu', '600039', '+91-44-87654321', 'vyasarpadi@epiccrm.com', true, now(), now()),
  (gen_random_uuid(), 'Cuddalore', 'CD', '789 Cuddalore', 'Cuddalore', 'Tamil Nadu', '607001', '+91-413-123456', 'cuddalore@epiccrm.com', true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- 6. Grant necessary permissions
GRANT ALL ON public.qualified_leads TO authenticated;
GRANT ALL ON public.ps_followup_master TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ps_followup_master_id_seq TO authenticated;

-- 7. Enable Row Level Security (RLS) if needed
-- ALTER TABLE public.qualified_leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ps_followup_master ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies (uncomment if using RLS)
-- CREATE POLICY "Users can view qualified leads" ON public.qualified_leads FOR SELECT USING (true);
-- CREATE POLICY "CRE Team Leaders can manage qualified leads" ON public.qualified_leads FOR ALL USING (auth.jwt() ->> 'role' = 'cre_team_leader');

-- CREATE POLICY "PS users can view their follow-ups" ON public.ps_followup_master FOR SELECT USING (ps_id = auth.uid());
-- CREATE POLICY "PS users can update their follow-ups" ON public.ps_followup_master FOR UPDATE USING (ps_id = auth.uid());

COMMIT;
