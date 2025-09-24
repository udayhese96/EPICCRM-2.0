-- Simple script to add team_leader role to existing users table

-- Drop the existing role constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new role constraint with team_leader included
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role::text = ANY (
    ARRAY[
      'admin'::character varying,
      'cre'::character varying,
      'ps'::character varying,
      'branch_head'::character varying,
      'cre_team_leader'::character varying,
      'cre_icrop'::character varying,
      'sales_manager'::character varying,
      'team_leader'::character varying
    ]::text[]
  )
);
