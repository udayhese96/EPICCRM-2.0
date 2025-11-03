import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies if not in headers
    const token = request.cookies.get('access_token')?.value || request.headers.get('Authorization')
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '100'
    const search = searchParams.get('search') || ''
    const timestamp = searchParams.get('_t') || Date.now().toString()
    
    // Build API URL with search parameter if provided
    let apiUrl = `${FASTAPI_BASE_URL}/api/cre-team-leader/qualified-leads?page=${page}&limit=${limit}&_t=${timestamp}`
    if (search && search.trim()) {
      apiUrl += `&search=${encodeURIComponent(search.trim())}`
    }
    
    console.log(`[NextJS API] Forwarding request: page=${page}, limit=${limit}, search=${search}`)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch qualified leads' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Return response with cache-busting headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching qualified leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
