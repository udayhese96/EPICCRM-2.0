import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function POST(request: NextRequest, { params }: { params: { lead_uid: string } }) {
  try {
    const bearer = request.headers.get('Authorization') || (request.cookies.get('access_token') ? `Bearer ${request.cookies.get('access_token')!.value}` : '')
    
    // Get the request body from the frontend
    const body = await request.json()
    
    const response = await fetch(`${FASTAPI_URL}/api/leads/${params.lead_uid}/qualify`, {
      method: 'POST',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body) // Forward the request body
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: 'Failed to qualify lead', detail: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error qualifying lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}