import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[NextJS API] Assignment request body:', body)
    
    const response = await fetch(`${FASTAPI_URL}/api/leads/assign`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    console.log('[NextJS API] FastAPI response status:', response.status)
    const responseText = await response.text()
    console.log('[NextJS API] FastAPI response:', responseText)

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to assign leads' },
        { status: response.status }
      )
    }

    const data = responseText ? JSON.parse(responseText) : {}
    console.log('[NextJS API] Returning data:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error assigning leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
