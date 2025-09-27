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
    // Try private endpoint (requires auth)
    let response = await fetch(`${FASTAPI_URL}/api/leads/unassigned`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Authorization: auth },
    })

    // Fallback to public mirror if unauthorized
    if (response.status === 401 || response.status === 403) {
      response = await fetch(`${FASTAPI_URL}/api/public/unassigned`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch unassigned leads' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching unassigned leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
