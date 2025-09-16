-- Seed demo data for lead_master to power Admin → Assign Leads buckets
-- Safe to run multiple times: uses ON CONFLICT DO NOTHING on uid

-- Helper: insert N rows per source with simple incremental UIDs
-- All seeded leads are unassigned (assigned = 'No') so they appear in buckets

INSERT INTO public.lead_master (
  uid, date, customer_name, customer_mobile_number, source, sub_source,
  lead_category, model_interested, branch, branch_id,
  assigned, lead_status, final_status,
  created_at, updated_at
) VALUES
  -- BTL (10)
  ('LD000001','2025-09-15','Ankit Sharma','9000000001','BTL','Mall Kiosk','Fresh','Glanza','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000002','2025-09-15','Priya Verma','9000000002','BTL','Canopy','Fresh','Urban Cruiser','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000003','2025-09-15','Rahul Mehta','9000000003','BTL','Society','Fresh','Innova HyCross','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000004','2025-09-15','Sneha Kapoor','9000000004','BTL','Society','Fresh','Fortuner','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000005','2025-09-15','Vikas Jain','9000000005','BTL','Mall Kiosk','Fresh','Rumion','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000006','2025-09-15','Meera Iyer','9000000006','BTL','Roadshow','Fresh','Hilux','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000007','2025-09-15','Amit Desai','9000000007','BTL','Roadshow','Fresh','Glanza','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000008','2025-09-15','Neha Rao','9000000008','BTL','Canopy','Fresh','Urban Cruiser','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000009','2025-09-15','Rohit Singh','9000000009','BTL','Society','Fresh','Innova HyCross','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000010','2025-09-15','Kavya Menon','9000000010','BTL','Mall Kiosk','Fresh','Fortuner','Mount Road',NULL,'No','New','Pending', now(), now()),

  -- META (8)
  ('LD000011','2025-09-15','Anusha R','9000000011','META','FB Lead Ad','Fresh','Glanza','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000012','2025-09-15','Satish K','9000000012','META','IG Form','Fresh','Rumion','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000013','2025-09-15','Divya S','9000000013','META','IG DM','Fresh','Innova HyCross','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000014','2025-09-15','Kiran P','9000000014','META','FB Lead Ad','Fresh','Fortuner','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000015','2025-09-15','Arjun N','9000000015','META','IG Form','Fresh','Urban Cruiser','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000016','2025-09-15','Snehal D','9000000016','META','FB Lead Ad','Fresh','Hilux','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000017','2025-09-15','Praveen T','9000000017','META','IG Form','Fresh','Glanza','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000018','2025-09-15','Sarika M','9000000018','META','IG DM','Fresh','Rumion','Mount Road',NULL,'No','New','Pending', now(), now()),

  -- GOOGLE (4)
  ('LD000019','2025-09-15','Karthik B','9000000019','GOOGLE','Search Ad','Fresh','Innova HyCross','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000020','2025-09-15','Shruti C','9000000020','GOOGLE','Performance Max','Fresh','Fortuner','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000021','2025-09-15','Pooja L','9000000021','GOOGLE','Search Ad','Fresh','Urban Cruiser','Mount Road',NULL,'No','New','Pending', now(), now()),
  ('LD000022','2025-09-15','Rakesh V','9000000022','GOOGLE','Search Ad','Fresh','Glanza','Mount Road',NULL,'No','New','Pending', now(), now())
ON CONFLICT (uid) DO NOTHING;

-- Optional quick check queries (run manually):
-- SELECT source, COUNT(*) FROM public.lead_master WHERE assigned = 'No' GROUP BY source ORDER BY 1;
-- SELECT * FROM public.lead_master WHERE assigned = 'No' ORDER BY created_at DESC LIMIT 10;


