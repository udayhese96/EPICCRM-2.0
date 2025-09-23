import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function GET(request: NextRequest, { params }: { params: { lead_uid: string } }) {
  try {
    const { lead_uid } = params
    const token = request.cookies.get('access_token')?.value || request.headers.get('authorization')
    const response = await fetch(`${FASTAPI_URL}/api/trade-in/${encodeURIComponent(lead_uid)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}),
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: 'Failed to fetch trade-in details', detail: text }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching trade-in details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


