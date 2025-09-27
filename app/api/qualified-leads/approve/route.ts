import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lead_uid = searchParams.get('lead_uid')
    const approval_type = searchParams.get('approval_type')
    
    if (!lead_uid || !approval_type) {
      return NextResponse.json(
        { error: 'lead_uid and approval_type are required' },
        { status: 400 }
      )
    }

    const bearer = request.headers.get('Authorization') || (request.cookies.get('access_token') ? `Bearer ${request.cookies.get('access_token')!.value}` : '')
    
    const response = await fetch(`${FASTAPI_URL}/api/qualified-leads/approve?lead_uid=${lead_uid}&approval_type=${approval_type}`, {
      method: 'PUT',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to approve request' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error approving request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
