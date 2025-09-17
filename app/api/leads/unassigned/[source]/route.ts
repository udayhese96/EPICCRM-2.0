import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  try {
    const { source } = await params
    const auth = request.headers.get('authorization') || ''

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
