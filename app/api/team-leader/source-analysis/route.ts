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
    
    // Build query string for FastAPI
    const queryParams = new URLSearchParams()
    if (fromDate) queryParams.append('from_date', fromDate)
    if (toDate) queryParams.append('to_date', toDate)
    
    const queryString = queryParams.toString()
    const fastApiUrl = `${FASTAPI_URL}/api/team-leader/source-analysis${queryString ? `?${queryString}` : ''}`
    
    console.log('[TL Analytics] Proxying Source Analysis request to:', fastApiUrl)
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error('[TL Analytics] FastAPI Source Analysis error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch source analysis data' }, 
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('[TL Analytics] Source Analysis data received:', data.length, 'records')
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('[TL Analytics] Source Analysis proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
