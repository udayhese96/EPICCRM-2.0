import { NextRequest } from 'next/server'
import { getAuthFromRequest } from '@/utils/api/auth'
import { deriveRange } from '@/utils/date/range'
import { respond, respondError } from '@/utils/api/envelope'
import { summaryCache, shouldBypassCache } from '@/utils/api/cache'
import { rateLimit } from '@/utils/api/rateLimit'

export async function GET(request: NextRequest) {
  try {
    console.log('[Pending Followup Summary] Starting request')
    
    const searchParams = request.nextUrl.searchParams
    const teamLeaderId = searchParams.get('team_leader_id')
    const dateRange = searchParams.get('date_range') || '30'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('[Pending Followup Summary] Params:', { teamLeaderId, dateRange, startDate, endDate })

    if (!teamLeaderId) {
      return respondError('Team leader ID is required', 400)
    }

    const authCtx = getAuthFromRequest(request)
    const { bearer, tlId, tenantId } = authCtx
    console.log('[Pending Followup Summary] Auth context:', { hasBearer: !!bearer, tenantId, tlId })
    if (!bearer) {
      return respondError('Access token is required', 401)
    }

    // Calculate and clamp date range (analytics/summary: max 180 days)
    const range = deriveRange({ preset: dateRange, start: startDate, end: endDate, tz: null, clampDays: 180 })

    // Build the base URL for the backend API
    const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)

    console.log('[Pending Followup Summary] Fetching from backend:', `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/pending-followup-summary`)

    // Prepare request body
    const requestBody: any = {}
    if (range.startISO && range.endISO) {
      requestBody.start_date = range.startISO
      requestBody.end_date = range.endISO
    }

    console.log('[Pending Followup Summary] Request body:', requestBody)

    // Cache and rate limit
    const cacheDisabled = process.env.NEXT_PUBLIC_TL_CACHE === 'false' || shouldBypassCache(request)
    const cacheKey = cacheDisabled ? null : `pending-summary:${tenantId || 'default'}:${teamLeaderId}:${range.startISO || 'na'}:${range.endISO || 'na'}`
    if (cacheKey) {
      const hit = summaryCache.get(cacheKey)
      if (hit) return respond(hit, { cache: { sMaxAge: 15, staleWhileRevalidate: 60 }, requestETag: request.headers.get('if-none-match') })
    }

    const rl = rateLimit('summary', tlId, 5, 10_000, tenantId)
    if (!rl.allowed) return respondError('Too Many Requests', 429, { retryAfter: rl.retryAfter })

    // Fetch pending followup summary data from backend
    const response = await fetch(
      `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/pending-followup-summary`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': bearer,
        },
        body: JSON.stringify(requestBody),
      }
    )

    console.log('[Pending Followup Summary] Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Pending Followup Summary] Backend error:', errorText)
      console.error('[Pending Followup Summary] Error details - Status:', response.status, 'Body:', errorText)
      return respondError(`Backend error: ${errorText}`, response.status, errorText)
    }

    const data = await response.json()
    console.log('[Pending Followup Summary] Data received:', data)

    if (cacheKey) summaryCache.set(cacheKey, data, 15_000)
    return respond(data, { cache: { sMaxAge: 15, staleWhileRevalidate: 60 } })
  } catch (error) {
    console.error('[Pending Followup Summary] Error:', error)
    return respondError('Internal server error', 500, error instanceof Error ? error.message : 'Unknown error')
  }
}

