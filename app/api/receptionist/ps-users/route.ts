import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Forward to FastAPI backend with timeout and better error handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    try {
      const response = await fetch(`${FASTAPI_URL}/api/receptionist/ps-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`FastAPI error: ${response.status} ${response.statusText}`)
        // Return empty array instead of error
        return NextResponse.json([])
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('FastAPI connection error:', fetchError)
      
      // Return empty array when FastAPI is not available
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Error fetching PS users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
