import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'auto'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
if (process.env.NODE_ENV === 'development') {
  console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    const bearer = request.headers.get('Authorization') || (request.cookies.get('access_token') ? `Bearer ${request.cookies.get('access_token')!.value}` : '')
    
    const response = await fetch(`${FASTAPI_BASE_URL}/api/qualified-leads${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, br',
      },
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch qualified leads' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=30',
      },
    })
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

    const response = await fetch(`${FASTAPI_BASE_URL}/api/qualified-leads`, {
      method: 'POST',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, br',
      },
      body: JSON.stringify(body),
      // no caching on mutations
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to create qualified lead' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error creating qualified lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

