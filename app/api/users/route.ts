import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  const headerAuth = request.headers.get('Authorization')
  const cookieToken = request.cookies.get('access_token')?.value
  const token = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')

  try {
    let url = `${API_BASE_URL}/api/users`
    if (role) {
      url += `?role=${role}`
    }
    
    // Note: team_leader_id parameter is handled by backend using ps_assignments table
    // No need to pass it as query parameter anymore

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token || ''
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail || 'Failed to fetch users' }, { status: response.status })
    }

    const data = await response.json()
    const users = Array.isArray(data) ? data : (data?.users ?? [])
    const nextResponse = NextResponse.json({ users }, { status: 200 })
    nextResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    nextResponse.headers.set('Pragma', 'no-cache')
    nextResponse.headers.set('Expires', '0')
    return nextResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const headerAuth = request.headers.get('Authorization')
  const cookieToken = request.cookies.get('access_token')?.value
  const token = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')
  const body = await request.json()

  try {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || ''
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail || 'Failed to create user' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
