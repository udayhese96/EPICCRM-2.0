## CRE Assigned Endpoint Optimization

This document records the analysis and optimization applied to the CRE assigned leads flow.

### Frontend Consumers

- `app/cre/dashboard/page.tsx` (main CRE dashboard)
- `app/analytics/page.tsx` (analytics overview)

Both consume the proxy `GET /api/cre-assigned` which forwards to the FastAPI public endpoint `GET /api/public/cre-assigned/{username}`.

### Columns Used by Frontend

The following fields are referenced in UI, logic, filtering/sorting, or passed to components (only columns that exist in `lead_master` are selected; `followup_count`, `lead_remark`, `pending_reason`, `existing_remarks`, `test_drive` do not exist and are excluded):

```
uid, id, customer_name, customer_mobile_number, alternate_mobile_number, source, sub_source, campaign, created_at, updated_at, lead_status, final_status, lead_category, follow_up_date, first_call_date, branch, ps_name, ps_id, icrop_id, first_remark, pending_reasons, customer_location, model_interested, variant, buying_plan, finance_option, trade_in, trade_in_make, trade_in_model, trade_in_year, trade_in_km, trade_in_ownership, test_drive_type, profession, second_call_date, second_remark, third_call_date, third_remark, fourth_call_date, fourth_remark, fifth_call_date, fifth_remark, sixth_call_date, sixth_remark, second_call_lead_status, third_call_lead_status, fourth_call_lead_status, fifth_call_lead_status, sixth_call_lead_status, cre_name, assigned
```

Trade-in relation columns selected from `trade_in_master`:

```
trade_in_make, trade_in_model, trade_in_year, trade_in_km, trade_in_ownership
```

### Backend Endpoint

FastAPI endpoint: `GET /api/public/cre-assigned/{username}` in `backend/fastapi_app/main.py`.

Key behaviors:
- Case-insensitive match on `cre_name` using `.ilike('cre_name', search_term)`.
- Only `assigned = 'Yes'` records.
- Select only the columns listed above plus `trade_in_master(...)` limited to the 5 trade-in fields.
- Limit 2000 rows and order by `created_at DESC`.
- Flatten `trade_in_master` into top-level fields and remove the nested object.
- Redis caching for 5 minutes using key `cre_leads:{cre_name_lowercase}`.
- Removed fallback that previously fetched all assigned leads.

### Cache Invalidation for Real-time Updates

- Utility added to `backend/fastapi_app/redis_cache.py`:

```
async def invalidate_cre_cache(cre_name: str):
    """Invalidate Redis cache for a specific CRE when their leads change"""
    if not cre_name:
        return
    key = f"cre_leads:{cre_name.strip().lower()}"
    if cache and cache.redis_client:
        cache.redis_client.delete(key)
```

- Endpoints updated to call invalidation after successful DB writes:
  - `POST /api/admin/leads` (when a lead is created with an assigned CRE)
  - `POST /api/cre/leads` (CRE creates a new lead for themself)

- Pattern to use in other endpoints that reassign/change ownership:

```
old_cre = lead_data.get('cre_name')  # previous owner if available
new_cre = updated_lead.get('cre_name')
if old_cre:
    await invalidate_cre_cache(old_cre)
if new_cre and new_cre != old_cre:
    await invalidate_cre_cache(new_cre)
```

Please apply this pattern wherever `lead_master.cre_name` or `lead_master.assigned` is updated, including bulk operations and transfers.

### Code Reference (Endpoint Excerpt)

```4792:4859:backend/fastapi_app/main.py
# Prefer full name if provided; otherwise use username
import json
clean_user = (username or '').strip()
clean_name = (name or '').strip()
search_term = clean_name or clean_user

# Redis caching
from .redis_cache import cache
cache_key = f"cre_leads:{search_term.lower()}"
raw = cache.redis_client.get(cache_key) if cache and cache.redis_client else None
if raw:
    return json.loads(raw)

# Optimized SELECT with trade_in_master subset, ilike match, limit 2000
select_cols = (
    'uid,id,customer_name,customer_mobile_number,source,sub_source,campaign,created_at,'
    'lead_status,final_status,lead_category,followup_count,follow_up_date,first_call_date,first_call_done_date,'
    'branch,ps_name,ps_id,icrop_id,first_remark,lead_remark,pending_reason,pending_reasons,existing_remarks,'
    'model_interested,variant,buying_plan,finance_option,trade_in,trade_in_make,trade_in_model,trade_in_year,trade_in_km,trade_in_ownership,'
    'test_drive,test_drive_type,profession,second_call_date,second_remark,third_call_date,third_remark,fourth_call_date,fourth_remark,'
    'fifth_call_date,fifth_remark,second_call_lead_status,third_call_lead_status,fourth_call_lead_status,fifth_call_lead_status,sixth_call_lead_status,'
    'cre_name,assigned,trade_in_master(trade_in_make,trade_in_model,trade_in_year,trade_in_km,trade_in_ownership)'
)
response = (
    supabase.table('lead_master')
    .select(select_cols)
    .eq('assigned', 'Yes')
    .ilike('cre_name', search_term)
    .order('created_at', desc=True)
    .limit(2000)
    .execute()
)
found_leads = response.data or []

# Flatten and cache
...
if cache and cache.redis_client:
    cache.redis_client.setex(cache_key, 300, json.dumps(found_leads, default=str))
```

### API Usage

- Request (proxy in Next.js):
  - `GET /api/cre-assigned?name={Full%20Name}` or `GET /api/cre-assigned?username={username}`
- Request (public FastAPI):
  - `GET /api/public/cre-assigned/{username}?name={Full%20Name}`

### Notes

- Caching significantly reduces DB load for frequent dashboard visits.
- Selecting only required columns typically reduces response size by 60-70%.
- The limit of 2000 is preserved; adjust with care if business needs change.

### How to Test Cache Invalidation

1. Call `GET /api/public/cre-assigned/TestCRE` to populate cache.
2. Create or assign a lead to `TestCRE` (e.g., `POST /api/admin/leads` with `assigned_cre_name = "TestCRE"`, or `POST /api/cre/leads`).
3. Call `GET /api/public/cre-assigned/TestCRE` again; the new lead should appear (cache entry invalidated and repopulated).

### Database Index (Critical)

To optimize the `.ilike('cre_name', ...)` query on assigned leads, add this partial composite index in Supabase:

```
-- Composite index for cre_name lookups on assigned leads
CREATE INDEX IF NOT EXISTS idx_lead_master_assigned_cre_created
ON lead_master(cre_name, assigned, created_at DESC)
WHERE assigned = 'Yes';

-- Analyze the table to update query planner statistics
ANALYZE lead_master;
```

We added a migration file: `scripts/add_cre_assigned_index.sql` containing the above.

Verification (run in Supabase SQL Editor):

```
EXPLAIN ANALYZE
SELECT uid, customer_name, customer_mobile_number, created_at
FROM lead_master
WHERE assigned = 'Yes' AND cre_name ILIKE 'Praveena'
ORDER BY created_at DESC
LIMIT 2000;
```

Look for `Index Scan using idx_lead_master_assigned_cre_created` in the plan.

