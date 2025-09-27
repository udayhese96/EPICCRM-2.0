import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test database connection
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, branch')
      .limit(5)

    if (error) {
      console.error('Database connection error:', error)
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Database connection successful',
      sampleUsers: users 
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      error: 'Test API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    console.log('Test POST request body:', body)
    
    // Test insert with minimal data
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username: body.username || 'test_user_' + Date.now(),
        email: body.email || 'test@example.com',
        password_hash: body.password || 'test_password',
        full_name: body.full_name || 'Test User',
        role: body.role || 'ps',
        branch: body.branch || null,
        is_active: true
      })
      .select('id, username, role, branch')
      .single()

    if (error) {
      console.error('Test insert error:', error)
      return NextResponse.json({ 
        error: 'Test insert failed',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Test insert successful',
      user 
    })
  } catch (error) {
    console.error('Test POST error:', error)
    return NextResponse.json({ 
      error: 'Test POST failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
