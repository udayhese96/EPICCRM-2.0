import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    const bearer = request.headers.get('Authorization') || (request.cookies.get('access_token') ? `Bearer ${request.cookies.get('access_token')!.value}` : '')
    
    const response = await fetch(`${FASTAPI_URL}/api/qualified-leads${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': bearer,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bearer = request.headers.get('Authorization') || (request.cookies.get('access_token') ? `Bearer ${request.cookies.get('access_token')!.value}` : '')

    const response = await fetch(`${FASTAPI_URL}/api/qualified-leads`, {
      method: 'POST',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to create qualified lead' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating qualified lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

