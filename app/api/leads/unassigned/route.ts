import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${FASTAPI_URL}/api/public/unassigned`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })

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
