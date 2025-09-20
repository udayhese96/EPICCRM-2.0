import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies if not in headers
    const token = request.cookies.get('access_token')?.value || request.headers.get('Authorization')
    
    const response = await fetch(`${FASTAPI_URL}/api/cre-team-leader/qualified-leads`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch qualified leads' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching qualified leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
