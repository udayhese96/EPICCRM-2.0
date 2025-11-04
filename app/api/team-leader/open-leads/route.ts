import { NextRequest } from 'next/server'
import { getAuthFromRequest } from '@/utils/api/auth'
import { deriveRange } from '@/utils/date/range'
import { respond, respondError } from '@/utils/api/envelope'
import { rateLimit } from '@/utils/api/rateLimit'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamLeaderId = searchParams.get('team_leader_id')
    const search = searchParams.get('search') || ''
    const dateRange = searchParams.get('date_range') || 'all'
    const psMember = searchParams.get('ps_member') || 'all'
    const pageSizeParam = searchParams.get('page_size')
    const cursor = searchParams.get('cursor')
    const limit = pageSizeParam ? String(Math.min(parseInt(pageSizeParam || '50') || 50, 100)) : (searchParams.get('limit') || '10')
    const offset = searchParams.get('offset') || '0'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('[Open Leads] Params:', { teamLeaderId, dateRange, psMember, startDate, endDate })

    if (!teamLeaderId) {
      return respondError('Team leader ID is required', 400)
    }

    const { bearer, tlId, tenantId } = getAuthFromRequest(request)
    if (!bearer) {
      return respondError('Authentication required', 401)
    }

    // Rate limit lists: 10 req / 10s per TL
    const rl = rateLimit('list', tlId, 10, 10_000, tenantId)
    if (!rl.allowed) return respondError('Too Many Requests', 429, { retryAfter: rl.retryAfter })

    // Log cursor migration status
    if (offset !== '0' && !cursor) {
      console.warn('[Open Leads] Using offset pagination - consider migrating to cursor')
    }

    // Calculate and clamp date range (lists: max 90 days)
    const range = deriveRange({ preset: dateRange, start: startDate, end: endDate, tz: null, clampDays: 90 })

    // Build query parameters for the backend (non-breaking: pass legacy params)
    const backendParams = new URLSearchParams({
      team_leader_id: teamLeaderId,
      date_range: dateRange,
      limit,
      offset,
    })

    // Experimental pass-through for cursor (backend may ignore until implemented)
    if (cursor) backendParams.append('cursor', cursor)

    if (search) {
      backendParams.append('search', search)
    }

    if (psMember !== 'all') {
      backendParams.append('ps_member', psMember)
    }

    // Add date parameters if calculated
    if (range.startISO && range.endISO) {
      backendParams.append('start_date', range.startISO)
      backendParams.append('end_date', range.endISO)
    }

    // Call the FastAPI backend
    const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    const response = await fetch(
      `${FASTAPI_BASE_URL}/api/team-leader/open-leads?${backendParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': bearer,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[OpenLeads API] Backend error:', response.status, errorText)
      return respondError('Failed to fetch open leads data', response.status, errorText)
    }

    const data = await response.json()

    // Short cache for instant tab switches with background revalidation
    return respond(data, { cache: 's-maxage=5, stale-while-revalidate=20' })

  } catch (error) {
    console.error('[OpenLeads API] Error:', error)
    return respondError('Internal server error', 500, error instanceof Error ? error.message : 'Unknown error')
  }
}
