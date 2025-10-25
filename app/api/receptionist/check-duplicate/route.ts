import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { searchParams } = new URL(request.url)
    const mobile = searchParams.get('mobile')
    
    if (!mobile) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 })
    }
    
    // Forward to FastAPI backend
    const FASTAPI_URL = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'
    const response = await fetch(`${FASTAPI_URL}/api/receptionist/check-duplicate?mobile=${mobile}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: 'Failed to check duplicate' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error checking duplicate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
