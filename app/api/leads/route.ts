import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    const response = await fetch(`${FASTAPI_URL}/api/leads${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const nextResponse = NextResponse.json(data)
    nextResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    nextResponse.headers.set('Pragma', 'no-cache')
    nextResponse.headers.set('Expires', '0')
    return nextResponse
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${FASTAPI_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to create lead' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
