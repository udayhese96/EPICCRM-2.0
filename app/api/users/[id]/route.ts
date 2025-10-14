import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

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

  // Fast path: if team_leader_id is present, try updating directly in Supabase
  if (Object.prototype.hasOwnProperty.call(body, 'team_leader_id')) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('users')
        .update({ team_leader_id: body.team_leader_id, updated_at: new Date().toISOString() })
        .eq('id', params.id)
        .select()
        .single()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ user: data }, { status: 200 })
    } catch (e: any) {
      // fall through to FastAPI attempt
    }
  }

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
      // Fallback: attempt a generic Supabase update with provided fields
      try {
        const supabase = await createClient()
        const update: Record<string, any> = { ...body, updated_at: new Date().toISOString() }
        const { data, error } = await supabase
          .from('users')
          .update(update)
          .eq('id', params.id)
          .select()
          .single()
        if (error) {
          const errorData = await response.json().catch(() => ({} as any))
          return NextResponse.json({ error: errorData.detail || error.message || 'Failed to update user' }, { status: 500 })
        }
        return NextResponse.json({ user: data }, { status: 200 })
      } catch (fallbackErr: any) {
        const errorData = await response.json().catch(() => ({} as any))
        return NextResponse.json({ error: errorData.detail || fallbackErr?.message || 'Failed to update user' }, { status: response.status || 500 })
      }
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

    // Some backends return 204 No Content on successful delete
    if (response.ok && response.status === 204) {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    if (!response.ok) {
      // Fallback: attempt to delete directly in Supabase
      try {
        const supabase = await createClient()
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', params.id)
        if (error) {
          const errorData = await response.json().catch(() => ({} as any))
          return NextResponse.json({ error: errorData.detail || error.message || 'Failed to delete user' }, { status: response.status })
        }
        return NextResponse.json({ success: true }, { status: 200 })
      } catch (fallbackErr: any) {
        const errorData = await response.json().catch(() => ({} as any))
        return NextResponse.json({ error: errorData.detail || fallbackErr?.message || 'Failed to delete user' }, { status: response.status || 500 })
      }
    }

    // Try to parse JSON if present; otherwise treat as success
    const text = await response.text()
    const data = text ? JSON.parse(text) : { success: true }
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
