import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

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
    
    // Build query string for FastAPI
    const queryParams = new URLSearchParams()
    if (fromDate) queryParams.append('from_date', fromDate)
    if (toDate) queryParams.append('to_date', toDate)
    
    const queryString = queryParams.toString()
    const fastApiUrl = `${FASTAPI_BASE_URL}/api/team-leader/ps-performance${queryString ? `?${queryString}` : ''}`
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    
    console.log('[TL Analytics] Proxying PS Performance request to:', fastApiUrl)
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error('[TL Analytics] FastAPI PS Performance error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch PS performance data' }, 
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('[TL Analytics] PS Performance data received:', data.length, 'records')
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('[TL Analytics] PS Performance proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
