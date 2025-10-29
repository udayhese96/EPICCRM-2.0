import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const offset = searchParams.get('offset') || '0'

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // Forward to FastAPI backend
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(
        `${FASTAPI_BASE_URL}/api/admin/leads/duplicate-is-dup?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`FastAPI error: ${response.status} ${response.statusText}`)
        const errorData = await response.json().catch(() => ({}))
        return NextResponse.json(
          { error: errorData.detail || 'Failed to fetch duplicate leads' },
          { status: response.status }
        )
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      console.error('FastAPI connection error:', fetchError)

      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout - backend did not respond in time' },
          { status: 504 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to connect to backend server' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error fetching duplicate leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
