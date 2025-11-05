import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch')
    const psName = searchParams.get('ps_name')
    const filter = searchParams.get('filter') || ''
    const dateFilterType = searchParams.get('date_filter_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!branch || branch.trim() === '') {
      return NextResponse.json({ success: false, error: 'Branch parameter is required' }, { status: 400 })
    }
    if (!psName || psName.trim() === '') {
      return NextResponse.json({ success: false, error: 'ps_name parameter is required' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    // Build query params with date filter
    const params = new URLSearchParams({
      branch: branch,
      ps_name: psName
    })
    
    if (filter) {
      params.append('filter', filter)
    }
    
    if (dateFilterType && dateFilterType !== 'all_time') {
      params.append('date_filter_type', dateFilterType)
      if (dateFilterType === 'from_to' && startDate && endDate) {
        params.append('start_date', startDate.trim())
        params.append('end_date', endDate.trim())
      }
    }
    
    const url = `${FASTAPI_BASE_URL}/analytics/sales-manager/ps-followup-leads?${params.toString()}`
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    console.log(`[SM Analytics] Proxying PS Followup Leads to: ${url}`)

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!res.ok) {
      let msg = 'Failed to fetch PS followup leads'
      try {
        const e = await res.json()
        msg = e.detail || e.message || msg
      } catch {}
      return NextResponse.json({ success: false, error: msg }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[SM Analytics] PS Followup Leads proxy error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


