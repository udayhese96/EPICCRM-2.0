import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    const headerAuth = request.headers.get('authorization')
    const cookieToken = request.cookies.get('access_token')?.value
    const auth = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')
    
    console.log('[NextJS API] Fetching unassigned leads with auth:', auth ? 'Yes' : 'No')
    
    // Add cache-busting timestamp
    const timestamp = Date.now()
    
    // Try private endpoint (requires auth)
    let response = await fetch(`${FASTAPI_URL}/api/leads/unassigned?_t=${timestamp}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json', 
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        Authorization: auth 
      },
    })

    console.log('[NextJS API] Authenticated endpoint status:', response.status)
    
    // Fallback to public mirror on any non-OK
    if (!response.ok) {
      console.log('[NextJS API] Falling back to public endpoint')
      const fallback = await fetch(`${FASTAPI_URL}/api/public/unassigned?_t=${timestamp}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json', 
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      })
      console.log('[NextJS API] Public endpoint status:', fallback.status)
      if (fallback.ok) response = fallback
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to fetch unassigned leads', status: response.status, detail: text },
        { status: response.status }
      )
    }

    const text = await response.text()
    console.log('[NextJS API] FastAPI response text:', text.substring(0, 200) + '...')
    try {
      const data = text ? JSON.parse(text) : {}
      console.log('[NextJS API] Parsed data:', JSON.stringify(data, null, 2))
      const nextResponse = NextResponse.json(data)
      nextResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      nextResponse.headers.set('Pragma', 'no-cache')
      nextResponse.headers.set('Expires', '0')
      return nextResponse
    } catch (e) {
      return NextResponse.json(
        { error: 'Backend returned invalid JSON', raw: text },
        { status: 502 }
      )
    }
  } catch (error: any) {
    console.error('Error fetching unassigned leads:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    )
  }
}
