import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Forward to FastAPI backend
    const response = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/api/receptionist/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching receptionist stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
