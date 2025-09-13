-- Create lead status enum
CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'proposal_sent', 
  'negotiation', 'closed_won', 'closed_lost', 'on_hold'
);

-- Create lead source enum
CREATE TYPE lead_source AS ENUM (
  'website', 'referral', 'social_media', 'advertisement', 
  'cold_call', 'email_campaign', 'trade_show', 'other'
);

-- Create lead priority enum
CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  company TEXT,
  job_title TEXT,
  source lead_source NOT NULL DEFAULT 'website',
  status lead_status NOT NULL DEFAULT 'new',
  priority lead_priority NOT NULL DEFAULT 'medium',
  value DECIMAL(12,2),
  description TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  expected_close_date DATE
);

-- Enable RLS on leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
CREATE POLICY "leads_select_assigned_or_branch" ON public.leads
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND (
        p.role = 'admin' OR
        (p.role = 'branch_head' AND p.branch_id = leads.branch_id) OR
        p.branch_id = leads.branch_id
      )
    )
  );

CREATE POLICY "leads_insert_authenticated" ON public.leads
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

CREATE POLICY "leads_update_assigned_or_admin" ON public.leads
  FOR UPDATE USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND (
        p.role = 'admin' OR
        (p.role = 'branch_head' AND p.branch_id = leads.branch_id)
      )
    )
  );

-- Create lead activities table for tracking interactions
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  activity_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'note', 'status_change'
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for lead_activities
CREATE POLICY "lead_activities_select_lead_access" ON public.lead_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_activities.lead_id AND (
        l.assigned_to = auth.uid() OR
        l.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND (
            p.role = 'admin' OR
            (p.role = 'branch_head' AND p.branch_id = l.branch_id) OR
            p.branch_id = l.branch_id
          )
        )
      )
    )
  );

CREATE POLICY "lead_activities_insert_authenticated" ON public.lead_activities
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );
