import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    if (!role) {
      return NextResponse.json({ error: 'Role parameter is required' }, { status: 400 })
    }

    // Get users from the unified users table
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        email,
        phone,
        role,
        branch,
        is_active,
        created_at,
        updated_at
      `)
      .eq('role', role)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(`Error fetching ${role} users:`, error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Error in users GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { username, full_name, email, phone, role, branch, password } = body

    if (!username || !full_name || !email || !role || !password) {
      return NextResponse.json({ 
        error: 'username, full_name, email, role, and password are required' 
      }, { status: 400 })
    }

    // Create new user in the unified users table
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username,
        full_name,
        email,
        phone: phone || null,
        role,
        branch: branch || null,
        password_hash: password, // Using password_hash column name
        is_active: true
      })
      .select(`
        id,
        username,
        full_name,
        email,
        phone,
        role,
        branch,
        is_active,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error(`Error creating ${role} user:`, error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create user',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in users POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}