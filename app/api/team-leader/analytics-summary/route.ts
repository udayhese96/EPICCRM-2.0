import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/utils/api/auth'
import { deriveRange } from '@/utils/date/range'
import { respond, respondError } from '@/utils/api/envelope'
import { summaryCache, shouldBypassCache } from '@/utils/api/cache'
import { rateLimit } from '@/utils/api/rateLimit'

export async function GET(request: NextRequest) {
  try {
    console.log('[Analytics Summary] Starting request')
    
    const searchParams = request.nextUrl.searchParams
    const teamLeaderId = searchParams.get('team_leader_id')
    const dateRange = searchParams.get('date_range') || '30'
    const psMember = searchParams.get('ps_member') || 'all'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('[Analytics Summary] Params:', { teamLeaderId, dateRange, psMember, startDate, endDate })

    if (!teamLeaderId) {
      return respondError('Team leader ID is required', 400)
    }

    const authCtx = getAuthFromRequest(request)
    const { bearer, tenantId } = authCtx
    console.log('[Analytics Summary] Auth context:', { hasBearer: !!bearer, tenantId })
    if (!bearer) return respondError('Access token is required', 401)

    const range = deriveRange({ preset: dateRange, start: startDate, end: endDate, tz: null, clampDays: 180 })

    // Build the base URL for the backend API
    const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)

    console.log('[Analytics Summary] Fetching PS members from:', `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/ps-members`)

    // Fetch PS members for this team leader
    const psResponse = await fetch(
      `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/ps-members`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': bearer,
        },
      }
    )

    console.log('[Analytics Summary] PS members response status:', psResponse.status)

    if (!psResponse.ok) {
      const errorText = await psResponse.text()
      console.error('[Analytics Summary] PS members error:', errorText)
      throw new Error(`Failed to fetch PS members: ${psResponse.status} ${errorText}`)
    }

    const psMembers = await psResponse.json()
    console.log('[Analytics Summary] PS members:', psMembers)
    
    // Filter PS members if a specific one is selected
    let targetPsIds: string[] = []
    if (psMember === 'all') {
      targetPsIds = psMembers.map((ps: any) => ps.id)
    } else {
      targetPsIds = [psMember]
    }

    console.log('[Analytics Summary] Target PS IDs:', targetPsIds)

    if (targetPsIds.length === 0) {
      return NextResponse.json({
        total_assigned: 0,
        open_leads: 0,
        won_leads: 0,
        lost_leads: 0,
      })
    }

    console.log('[Analytics Summary] Fetching analytics data from:', `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/analytics-kpi`)

    // Fetch analytics data from backend
    // Cache key and RL
    const cacheDisabled = process.env.NEXT_PUBLIC_TL_CACHE === 'false' || shouldBypassCache(request)
    const cacheKey = cacheDisabled ? null : `analytics-summary:${tenantId || 'default'}:${teamLeaderId}:${range.startISO || 'na'}:${range.endISO || 'na'}`
    if (cacheKey) {
      const hit = summaryCache.get(cacheKey)
      if (hit) return respond(hit, { cache: { sMaxAge: 15, staleWhileRevalidate: 60 }, requestETag: request.headers.get('if-none-match') })
    }

    const rl = rateLimit('summary', teamLeaderId, 5, 10_000, tenantId)
    if (!rl.allowed) return respondError('Too Many Requests', 429, { retryAfter: rl.retryAfter })

    const analyticsResponse = await fetch(
      `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/analytics-kpi`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': bearer,
        },
        body: JSON.stringify({
          ps_ids: targetPsIds,
          start_date: range.startISO,
          end_date: range.endISO,
        }),
      }
    )

    console.log('[Analytics Summary] Analytics response status:', analyticsResponse.status)

    if (!analyticsResponse.ok) {
      const errorText = await analyticsResponse.text()
      console.error('[Analytics Summary] Analytics error:', errorText)
      console.error('[Analytics Summary] Analytics error details - Status:', analyticsResponse.status, 'Body:', errorText)
      return respondError(`Backend error: ${errorText}`, analyticsResponse.status, errorText)
    }

    const analyticsData = await analyticsResponse.json()
    console.log('[Analytics Summary] Analytics data:', analyticsData)

    const payload = {
      total_assigned: analyticsData.total_assigned || 0,
      open_leads: analyticsData.open_leads || 0,
      won_leads: analyticsData.won_leads || 0,
      lost_leads: analyticsData.lost_leads || 0,
    }

    if (cacheKey) summaryCache.set(cacheKey, payload, 15_000)

    return respond(payload, { cache: { sMaxAge: 15, staleWhileRevalidate: 60 } })
  } catch (error) {
    console.error('Error fetching analytics summary:', error)
    return respondError('Failed to fetch analytics summary', 500)
  }
}

