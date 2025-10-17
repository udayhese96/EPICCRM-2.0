import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const headerAuth = request.headers.get('Authorization')
    const cookieToken = request.cookies.get('access_token')?.value
    const token = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const mode = searchParams.get('mode') || 'all'
    
    // Build query string for FastAPI
    const queryParams = new URLSearchParams()
    if (fromDate) queryParams.append('from_date', fromDate)
    if (toDate) queryParams.append('to_date', toDate)
    queryParams.append('mode', mode)
    
    const queryString = queryParams.toString()
    const fastApiUrl = `${FASTAPI_URL}/api/team-leader/followup-summary?${queryString}`
    
    console.log('[TL Analytics] Proxying Follow-up Summary request to:', fastApiUrl)
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error('[TL Analytics] FastAPI Follow-up Summary error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch follow-up summary data' }, 
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('[TL Analytics] Follow-up Summary data received:', data.length, 'records')
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('[TL Analytics] Follow-up Summary proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
