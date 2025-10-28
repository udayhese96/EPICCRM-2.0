import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    console.log('[NextJS API] CRE Users - FASTAPI_URL:', FASTAPI_URL)
    console.log('[NextJS API] CRE Users - NODE_ENV:', process.env.NODE_ENV)
    
    const fullUrl = `${FASTAPI_URL}/api/cre-users`
    console.log('[NextJS API] CRE Users - Full URL:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    })

    console.log('[NextJS API] CRE Users - FastAPI response status:', response.status)
    if (!response.ok) {
      const error = await response.text()
      console.log('[NextJS API] CRE Users - FastAPI error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch CRE users',
          details: error,
          url: fullUrl,
          status: response.status
        },
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
    console.error('[NextJS API] CRE Users - Error:', error)
    console.error('[NextJS API] CRE Users - Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${FASTAPI_URL}/api/cre-users`, {
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
        { error: errorData.detail || 'Failed to create CRE user' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating CRE user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
