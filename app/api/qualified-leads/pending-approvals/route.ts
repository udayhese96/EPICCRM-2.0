import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cacheBuster = searchParams.get('_t') || `${Date.now()}`
    const bearer = request.headers.get('Authorization') || (request.cookies.get('access_token') ? `Bearer ${request.cookies.get('access_token')!.value}` : '')
    
    const response = await fetch(`${FASTAPI_URL}/api/qualified-leads/pending-approvals?_t=${cacheBuster}`, {
      method: 'GET',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch pending approval requests' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const res = NextResponse.json(data)
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Expires', '0')
    return res
  } catch (error) {
    console.error('Error fetching pending approval requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
