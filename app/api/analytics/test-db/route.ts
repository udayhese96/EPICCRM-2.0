import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Test basic database connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    // Check if we can access the lead_master table at all
    const { data: tableCheck, error: tableError } = await supabase
      .from('lead_master')
      .select('id')
      .limit(1)

    // Try to get table information
    const { data: tableInfo, error: infoError } = await supabase
      .rpc('get_table_info', { table_name: 'lead_master' })
      .single()

    return NextResponse.json({
      connectionTest: {
        usersTable: testData,
        usersError: testError
      },
      leadMasterTest: {
        data: tableCheck,
        error: tableError,
        canAccess: !tableError
      },
      tableInfo: {
        data: tableInfo,
        error: infoError
      },
      databaseInfo: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not Set'
      }
    })

  } catch (error) {
    console.error('Error testing database:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error,
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 })
  }
}

