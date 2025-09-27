import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  try {
    const { source } = await params
    const headerAuth = request.headers.get('authorization')
    const cookieToken = request.cookies.get('access_token')?.value
    const auth = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')

    let response = await fetch(`${FASTAPI_URL}/api/leads/unassigned/${encodeURIComponent(source)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Authorization: auth },
    })

    if (response.status === 401 || response.status === 403) {
      response = await fetch(`${FASTAPI_URL}/api/public/unassigned/${encodeURIComponent(source)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch leads for source' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching leads for source:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
