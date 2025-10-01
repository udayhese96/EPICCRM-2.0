import { NextRequest, NextResponse } from 'next/server'
import { API_CONFIG } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('CRE Lead API - Request body:', body)
    console.log('CRE Lead API - Backend URL:', API_CONFIG.FASTAPI_URL)
    
    // Forward the request to the FastAPI backend
    const response = await fetch(`${API_CONFIG.FASTAPI_URL}/api/cre/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body)
    })

    console.log('CRE Lead API - Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('FastAPI error:', errorText)
      return NextResponse.json(
        { error: 'Failed to create lead', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('CRE Lead API - Success response:', data)
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
