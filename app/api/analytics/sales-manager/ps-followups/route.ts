import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) })
    if (!res.ok && retries > 0) {
      await delay(RETRY_DELAY_MS)
      return fetchWithRetry(url, options, retries - 1)
    }
    return res
  } catch (err) {
    if (retries > 0) {
      await delay(RETRY_DELAY_MS)
      return fetchWithRetry(url, options, retries - 1)
    }
    throw err
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch')

    if (!branch || branch.trim() === '') {
      return NextResponse.json({ success: false, error: 'Branch parameter is required' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const url = `${FASTAPI_BASE_URL}/analytics/sales-manager/ps-followups?branch=${encodeURIComponent(branch)}`
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    console.log(`[SM Analytics] Proxying PS Followups to: ${url}`)

    let response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    })

    // Fallback: if endpoint not found or returns 404, proxy ps-performance and distill first two columns
    if (response.status === 404) {
      const perfUrl = `${FASTAPI_BASE_URL}/analytics/sales-manager/ps-performance?branch=${encodeURIComponent(branch)}`
      console.warn(`[SM Analytics] Followups 404, falling back to PS Performance: ${perfUrl}`)
      response = await fetchWithRetry(perfUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      })
      if (response.ok) {
        const perf = await response.json()
        const rows: Array<{ ps_name: string; lead_count: number }> = (perf?.data || []).map((r: any) => ({
          ps_name: r.ps_name,
          lead_count: r.lead_count
        }))
        return NextResponse.json({
          success: true,
          branch,
          data: rows,
          timestamp: perf?.timestamp,
          requested_by: perf?.requested_by,
          user_role: perf?.user_role
        })
      }
    }

    if (!response.ok) {
      let message = 'Failed to fetch PS Followups data'
      try {
        const errData = await response.json()
        message = errData.detail || errData.message || message
      } catch {}
      return NextResponse.json({ success: false, error: message }, { status: response.status })
    }

    const result = await response.json()
    if (!result?.success) {
      return NextResponse.json({ success: false, error: result?.message || 'Upstream error' }, { status: 502 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[SM Analytics] PS Followups proxy error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


