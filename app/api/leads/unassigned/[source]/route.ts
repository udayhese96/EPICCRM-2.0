import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  try {
    const { source } = await params
    const headerAuth = request.headers.get('authorization')
    const cookieToken = request.cookies.get('access_token')?.value
    const auth = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')
    
    // Add cache-busting timestamp
    const timestamp = Date.now()

    let response = await fetch(`${FASTAPI_URL}/api/leads/unassigned/${encodeURIComponent(source)}?_t=${timestamp}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json', 
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        Authorization: auth 
      },
    })

    if (response.status === 401 || response.status === 403) {
      response = await fetch(`${FASTAPI_URL}/api/public/unassigned/${encodeURIComponent(source)}?_t=${timestamp}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json', 
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      })
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch leads for source' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const nextResponse = NextResponse.json(data)
    nextResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    nextResponse.headers.set('Pragma', 'no-cache')
    nextResponse.headers.set('Expires', '0')
    return nextResponse
  } catch (error) {
    console.error('Error fetching leads for source:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
