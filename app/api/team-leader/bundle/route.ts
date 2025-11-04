import { NextRequest } from 'next/server'
import { getAuthFromRequest } from '@/utils/api/auth'
import { deriveRange } from '@/utils/date/range'
import { respond, respondError } from '@/utils/api/envelope'
import { summaryCache, shouldBypassCache } from '@/utils/api/cache'
import { rateLimit } from '@/utils/api/rateLimit'
import { fetchWithRetry } from '@/utils/api/retry'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const started = Date.now()
    const { bearer, tlId, tenantId } = getAuthFromRequest(request)
    if (!bearer) return respondError('Unauthorized', 401)

    const searchParams = request.nextUrl.searchParams
    const preset = searchParams.get('preset') || searchParams.get('date_range') || '30'
    const start = searchParams.get('start') || searchParams.get('start_date')
    const end = searchParams.get('end') || searchParams.get('end_date')
    const tz = searchParams.get('tz')

    // Clamp summary ranges to 180 days
    const range = deriveRange({ preset, start, end, tz, clampDays: 180 })

    const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)

    // Prefer backend bundle if available; otherwise aggregate via existing endpoints
    const preferBackend = process.env.TL_BUNDLE_BACKEND === '1'

    if (preferBackend) {
      const qs = new URLSearchParams()
      if (range.startISO) qs.append('from_date', range.startISO)
      if (range.endISO) qs.append('to_date', range.endISO)
      if (tz) qs.append('tz', tz)

      // Rate limit summaries: 5 req / 10s per TL
      const rl = rateLimit('summary', tlId, 5, 10_000, tenantId)
      if (!rl.allowed) return respondError('Too Many Requests', 429, { retryAfter: rl.retryAfter })

      const resp = await fetch(`${FASTAPI_BASE_URL}/api/team-leader/bundle${qs.size ? `?${qs.toString()}` : ''}`,
        { headers: { Authorization: bearer, 'Content-Type': 'application/json' } })
      if (!resp.ok) return respondError('Failed to fetch bundle', resp.status, await resp.text())
      const payload = await resp.json()
      return respond(payload, {
        cache: { sMaxAge: 15, staleWhileRevalidate: 60, etagKey: makeETagKey(tlId, range, payload) },
        requestETag: request.headers.get('if-none-match'),
        headers: makeTimingHeaders(started, 'miss')
      })
    }

    // Temporary aggregation via existing endpoints in parallel
    const qsDates = new URLSearchParams()
    if (range.startISO) qsDates.append('from_date', range.startISO)
    if (range.endISO) qsDates.append('to_date', range.endISO)

    const qsAnalytics = new URLSearchParams()
    if (tlId) qsAnalytics.append('team_leader_id', tlId)
    const dr = typeof preset === 'string' ? preset : String(preset)
    if (dr) qsAnalytics.append('date_range', dr)
    if (range.startISO) qsAnalytics.append('start_date', range.startISO)
    if (range.endISO) qsAnalytics.append('end_date', range.endISO)

    const headers = { Authorization: bearer, 'Content-Type': 'application/json' }

    // In-memory cache (15s) unless disabled or client requests no-cache
    const cacheDisabled = process.env.NEXT_PUBLIC_TL_CACHE === 'false' || shouldBypassCache(request)
    const cacheKey = cacheDisabled ? null : `bundle:${tenantId || 'default'}:${tlId || 'na'}:${range.startISO || 'na'}:${range.endISO || 'na'}:${tz || 'na'}`
    if (cacheKey) {
      const cached = summaryCache.get(cacheKey)
      if (cached) {
        return respond(cached, {
          cache: { sMaxAge: 15, staleWhileRevalidate: 60, etagKey: makeETagKey(tlId, range, cached) },
          requestETag: request.headers.get('if-none-match'),
          headers: makeTimingHeaders(started, 'hit')
        })
      }
    }

    // Rate limit summaries: 5 req / 10s per TL
    const rl = rateLimit('summary', tlId, 5, 10_000, tenantId)
    if (!rl.allowed) return respondError('Too Many Requests', 429, { retryAfter: rl.retryAfter })

    const [analyticsRes, pendingSummaryRes, sourceMixRes, psPerfRes] = await Promise.all([
      fetchWithRetry(`${FASTAPI_BASE_URL}/api/team-leader/analytics-summary?${qsAnalytics.toString()}`, { headers }),
      tlId
        ? fetchWithRetry(`${FASTAPI_BASE_URL}/api/team-leader/${tlId}/pending-followup-summary`, {
            method: 'POST', 
            headers, 
            body: JSON.stringify({ start_date: range.startISO, end_date: range.endISO }),
          })
        : Promise.resolve(new Response(JSON.stringify({ overdue: 0, today: 0, upcoming: 0 }), { status: 200 })),
      fetchWithRetry(`${FASTAPI_BASE_URL}/api/team-leader/source-analysis${qsDates.size ? `?${qsDates.toString()}` : ''}`, { headers }),
      fetchWithRetry(`${FASTAPI_BASE_URL}/api/team-leader/ps-performance${qsDates.size ? `?${qsDates.toString()}` : ''}`, { headers }),
    ])

    if (!analyticsRes.ok) return respondError('Analytics summary failed', analyticsRes.status, await analyticsRes.text())
    if (!pendingSummaryRes.ok) return respondError('Pending followup summary failed', pendingSummaryRes.status, await pendingSummaryRes.text())
    if (!sourceMixRes.ok) return respondError('Source analysis failed', sourceMixRes.status, await sourceMixRes.text())
    if (!psPerfRes.ok) return respondError('PS performance failed', psPerfRes.status, await psPerfRes.text())

    const analytics = await analyticsRes.json()
    const pendingSummary = await pendingSummaryRes.json()
    const sourceMixAll: any[] = await sourceMixRes.json()
    const psPerformanceAll: any[] = await psPerfRes.json()

    const source_mix = (Array.isArray(sourceMixAll) ? sourceMixAll : []).slice(0, 5).map((s: any) => ({
      source: s.source || s.Source || 'Unknown',
      count: s.count ?? s.total ?? 0,
    }))

    const ps_headlines = (Array.isArray(psPerformanceAll) ? psPerformanceAll : [])
      .map((p: any) => ({
        ps_id: p.ps_id ?? p.id ?? p.user_id ?? null,
        ps_name: p.ps_name ?? p.name ?? p.full_name ?? 'Unknown',
        won: p.won ?? p.won_count ?? 0,
        followups_today: p.followups_today ?? p.followups ?? 0,
      }))
      .sort((a, b) => (b.won - a.won) || (b.followups_today - a.followups_today))
      .slice(0, 5)

    const payload = {
      open_count: analytics.open_leads ?? 0,
      won_count: analytics.won_leads ?? 0,
      lost_count: analytics.lost_leads ?? 0,
      assigned_count: analytics.total_assigned ?? 0,
      pending_followup: {
        overdue: pendingSummary.overdue ?? pendingSummary.overdue_count ?? 0,
        today: pendingSummary.today ?? pendingSummary.today_count ?? 0,
        upcoming: pendingSummary.upcoming ?? pendingSummary.upcoming_count ?? 0,
      },
      source_mix,
      ps_headlines,
    }

    if (cacheKey) summaryCache.set(cacheKey, payload, 15_000)

    return respond(payload, {
      cache: { sMaxAge: 15, staleWhileRevalidate: 60, etagKey: makeETagKey(tlId, range, payload) },
      requestETag: request.headers.get('if-none-match'),
      headers: makeTimingHeaders(started, cacheKey ? 'miss' : 'bypass')
    })
  } catch (err) {
    return respondError('Internal server error', 500, err instanceof Error ? err.message : String(err))
  }
}

function makeETagKey(tlId?: string, range?: { startISO?: string, endISO?: string }, payload?: unknown) {
  return `${tlId || 'na'}:${range?.startISO || 'na'}:${range?.endISO || 'na'}:${safeIdsDigest(payload)}`
}

function safeIdsDigest(payload: any): string {
  try {
    // Attempt to hash identifiers only to keep ETag stable across order changes
    if (payload && Array.isArray(payload.data)) {
      return (payload.data.map((x: any) => x.id || x.uid || '').join(','))
    }
    return JSON.stringify(payload).slice(0, 2048)
  } catch {
    return 'na'
  }
}

function makeTimingHeaders(started: number, cache: 'hit' | 'miss' | 'bypass') {
  const ms = Date.now() - started
  return {
    'x-response-time': `${ms}ms`,
    'x-cache': cache,
  }
}


