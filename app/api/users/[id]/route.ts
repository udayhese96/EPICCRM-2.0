import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const headerAuth = request.headers.get('Authorization')
  const cookieToken = request.cookies.get('access_token')?.value
  const token = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${params.id}`, {
      method: 'GET',
      headers: {
        'Authorization': token || ''
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail || 'Failed to fetch user' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ user: data }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const headerAuth = request.headers.get('Authorization')
  const cookieToken = request.cookies.get('access_token')?.value
  const token = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')
  const body = await request.json()

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || ''
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail || 'Failed to update user' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const headerAuth = request.headers.get('Authorization')
  const cookieToken = request.cookies.get('access_token')?.value
  const token = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token || ''
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail || 'Failed to delete user' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
