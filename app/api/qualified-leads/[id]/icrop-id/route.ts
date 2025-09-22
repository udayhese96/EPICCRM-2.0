import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const body = await request.json()
    const { icrop_id } = body

    if (!icrop_id) {
      return NextResponse.json({ error: 'ICROP ID is required' }, { status: 400 })
    }

    const response = await fetch(`${FASTAPI_URL}/api/qualified-leads/${params.id}/icrop-id`, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ icrop_id }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('FastAPI error:', errorText)
      return NextResponse.json({ error: 'Failed to update ICROP ID' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating ICROP ID:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

