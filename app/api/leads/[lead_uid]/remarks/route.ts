import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(
  request: NextRequest,
  { params }: { params: { lead_uid: string } }
) {
  try {
    const { lead_uid } = params
    const bearer = request.headers.get('Authorization') || (request.cookies.get('access_token') ? `Bearer ${request.cookies.get('access_token')!.value}` : '')
    const cacheBuster = Date.now()
    const response = await fetch(`${FASTAPI_URL}/api/leads/${lead_uid}/remarks?_t=${cacheBuster}`, {
      method: 'GET',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch lead remarks' },
        { status: response.status, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (error) {
    console.error('Error fetching lead remarks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
