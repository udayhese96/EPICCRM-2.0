import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const psId = searchParams.get('ps_id')

    if (!psId) {
      return NextResponse.json(
        { error: 'PS ID is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create Supabase client with unique request ID to bypass PostgREST cache
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Request-ID': `${Date.now()}-${Math.random()}` // Force unique request
        }
      }
    })

    console.log(`[PS Leads API] Fetching leads for PS: ${psId}`)

    // Fetch leads from ps_followup_master
    const { data: leads, error: queryError } = await supabase
      .from('ps_followup_master')
      .select('*')
      .eq('ps_id', psId)
      .order('updated_at', { ascending: false })

    if (queryError) {
      console.error('[PS Leads API] Query error:', queryError.message)
      return NextResponse.json(
        { error: 'Failed to fetch leads from database' },
        { status: 500 }
      )
    }

    console.log(`[PS Leads API] Found ${leads?.length || 0} leads`)
    
    if (leads && leads.length > 0) {
      console.log(`[PS Leads API] Sample lead_uids:`, leads.slice(0, 5).map(l => l.lead_uid))
    }

    const response = NextResponse.json({ 
      success: true,
      leads: leads || [],
      count: leads?.length || 0
    })

    // Force no-cache to prevent stale data after transfers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error: any) {
    console.error('[PS Leads API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
