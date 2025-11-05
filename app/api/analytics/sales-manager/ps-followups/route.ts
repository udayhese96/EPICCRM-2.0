import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
  
  try {
    const res = await fetch(url, { 
      ...options, 
      signal: controller.signal 
    })
    clearTimeout(timeoutId)
    
    if (!res.ok && retries > 0) {
      await delay(RETRY_DELAY_MS)
      return fetchWithRetry(url, options, retries - 1)
    }
    return res
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('Request timeout - FastAPI took too long to respond')
    }
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
    const dateFilterType = searchParams.get('date_filter_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const teamLeader = searchParams.get('team_leader')

    if (!branch || branch.trim() === '') {
      return NextResponse.json({ success: false, error: 'Branch parameter is required' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const params = new URLSearchParams({
      branch: branch
    })
    
    if (dateFilterType && dateFilterType !== 'all_time') {
      params.append('date_filter_type', dateFilterType)
      if (dateFilterType === 'from_to' && startDate && endDate) {
        params.append('start_date', startDate)
        params.append('end_date', endDate)
      }
    }
    
    if (teamLeader && teamLeader.trim() !== '' && teamLeader.toLowerCase() !== 'all') {
      params.append('team_leader', teamLeader)
    }
    
    const url = `${FASTAPI_BASE_URL}/analytics/sales-manager/ps-followups?${params.toString()}`
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

    // Ensure team_leaders is included in response
    return NextResponse.json({
      ...result,
      team_leaders: result.team_leaders || []
    })
  } catch (error: any) {
    console.error('[SM Analytics] PS Followups proxy error:', error)
    
    // Handle different types of errors
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.error('❌ FastAPI connection error:', error.message)
      return NextResponse.json({ 
        success: false, 
        error: 'Unable to connect to analytics backend service. Please ensure the FastAPI backend is running.',
        details: `FastAPI URL: ${FASTAPI_BASE_URL}`,
        errorType: 'CONNECTION_ERROR'
      }, { status: 503 })
    }
    
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      console.error('❌ FastAPI timeout error:', error.message)
      return NextResponse.json({ 
        success: false, 
        error: 'Request timeout - analytics service took too long to respond',
        errorType: 'TIMEOUT_ERROR'
      }, { status: 504 })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 })
  }
}


