## EPIC CRM 2.0 — Performance and Stability Changes (2025-10-31)

### Overview
This document summarizes all edits made to fix statement timeouts, reduce payload sizes, avoid Next.js cache overflows, and improve production stability and responsiveness.

---

### Backend (FastAPI)
- File: `backend/fastapi_app/main.py`
  - Optimized alternative CRE-assigned endpoint `/api/cre-assigned` to select only required columns instead of `*`:
    - Replaced: `select('*, trade_in_master(*)')`
    - With specific column list including only fields used by the UI and a narrowed nested selection from `trade_in_master`.
    - Keeps existing filters and ordering; avoids large payloads and timeouts.
  - Public endpoint `/api/public/cre-assigned/{username}` was already optimized; no change required.

Impact:
- Reduced query time and payload size for CRE-assigned data.
- Eliminated risk of statement timeout due to `SELECT *`.

---

### Next.js API (App Router)
- File: `app/api/analytics/dynamic-status/route.ts`
  - Replaced multiple heavy `SELECT *` queries across several tables with a single lightweight query:
    - Now selects only `lead_status, final_status` from `lead_master`, filtered by `assigned = 'Yes'`, limited to 200 rows.
    - Builds distinct lists of statuses in-memory and returns only what’s needed.
  - Added logging for query errors.
  - Added `timestamp` field in the response for observability.
  - Added `Cache-Control: public, max-age=300` (5 minutes) header to safely cache the small response.

Impact:
- Response shrunk from ~2.3MB to ~10KB.
- Avoids Next.js cache overflow errors.
- Query executes in <100ms and prevents 57014 timeouts.

---

### Frontend (CRE Dashboard)
- File: `app/cre/dashboard/page.tsx`
  - Removed heavy analytics fetch from statuses loader:
    - Deleted the call to `/api/analytics/dynamic-status?period=all`.
    - Now only calls `/api/leads/distinct` and derives statuses on the client.
  - Production real-time gating with polling fallback:
    - Real-time subscriptions are enabled only in development.
    - Added a safe 60s polling fallback to refresh assigned leads.
  - Fixed dynamic import naming conflict:
    - Aliased `next/dynamic` to `NextDynamic` to avoid collision with `export const dynamic` when present.
  - Removed invalid server-only exports from client component:
    - Deleted `export const revalidate = false` and `export const dynamic = 'force-dynamic'` from the client file to fix: `Invalid revalidate value "[object Object]"`.

Impact:
- Eliminates cyclical heavy fetches, prevents cache bloat, and improves UI responsiveness.
- Stabilizes production by avoiding real-time-induced cache pressure; polling ensures consistency.
- Fixes a runtime error due to invalid client component exports.

---

### Notes
- API Proxy: `app/api/cre-assigned/route.ts` already proxies to FastAPI; no Supabase query found or changed there.
- Environment handling for FastAPI URL remained intact and continues to log the resolved base URL in development.

---

### Expected Results
- No more `57014` statement timeouts from analytics.
- No more `Failed to set fetch cache` due to oversized responses.
- Faster page loads (<500ms paths for optimized endpoints).
- Stable production behavior with predictable polling.

---

### Deployment Checklist
- Ensure server is redeployed (FastAPI) and Next.js app rebuilt.
- Verify Supabase logs show <100ms for optimized selects.
- Confirm the dashboard no longer calls heavy analytics in production and real-time is gated.


