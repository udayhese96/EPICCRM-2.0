import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    // Get authorization from header or cookie (following the pattern from other APIs)
    const headerAuth = request.headers.get('Authorization')
    const cookieToken = request.cookies.get('access_token')?.value
    const token = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')
    
    console.log('🔍 [API Debug] Header auth:', headerAuth ? 'present' : 'missing')
    console.log('🔍 [API Debug] Cookie token:', cookieToken ? 'present' : 'missing')
    console.log('🔍 [API Debug] Final token:', token ? 'present' : 'missing')
    
    if (!token) {
      console.error('❌ [API Debug] No authentication found')
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    // Forward request to FastAPI backend for authentication and data
    const response = await fetch(`${FASTAPI_URL}/api/ps-followup`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ [API Debug] FastAPI error:', errorData)
      return NextResponse.json({ error: errorData.detail || 'Failed to fetch PS follow-up data' }, { status: response.status })
    }

    const data = await response.json()
    console.log('✅ [API Debug] Fetched PS follow-up data:', data.length, 'items')
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PS follow-up API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}