import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('users').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const update: any = {
      username: body.username,
      email: body.email,
      full_name: body.full_name,
      phone: body.phone ?? null,
      branch: body.branch ?? null,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }
    if (body.password) {
      update.password_hash = body.password
    }

    const { data, error } = await supabase.from('users').update(update).eq('id', params.id).select().single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('users').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


