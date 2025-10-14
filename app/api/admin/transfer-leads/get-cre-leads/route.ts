import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const creId = searchParams.get('cre_id')

    if (!creId) {
      return NextResponse.json(
        { error: 'CRE ID is required' },
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

    console.log(`[CRE Leads API] Fetching leads for CRE: ${creId}`)

    // DIAGNOSTIC: Check if CD123123 exists and its current state
    const { data: diagnosticLead } = await supabase
      .from('lead_master')
      .select('id, uid, cre_id, final_status, lead_status')
      .eq('uid', 'CD123123')
      .maybeSingle()

    if (diagnosticLead) {
      console.log(`[Diagnostic] CD123123 found:`, {
        id: diagnosticLead.id,
        cre_id: diagnosticLead.cre_id,
        final_status: diagnosticLead.final_status,
        lead_status: diagnosticLead.lead_status,
        matches_cre: diagnosticLead.cre_id === creId
      })
    } else {
      console.log(`[Diagnostic] CD123123 not found in database`)
    }

    // Fetch leads with proper filtering
    const { data: leads, error: queryError } = await supabase
      .from('lead_master')
      .select('*')
      .eq('cre_id', creId)
      .in('final_status', ['Pending', 'Follow-up'])
      .order('updated_at', { ascending: false })

    if (queryError) {
      console.error('[CRE Leads API] Query error:', queryError.message)
      return NextResponse.json(
        { error: 'Failed to fetch leads from database' },
        { status: 500 }
      )
    }

    console.log(`[CRE Leads API] Found ${leads?.length || 0} leads`)
    
    if (leads && leads.length > 0) {
      console.log(`[CRE Leads API] Sample UIDs:`, leads.slice(0, 5).map(l => l.uid))
      
      // Check if CD123123 is in results
      const hasCD123123 = leads.some(l => l.uid === 'CD123123')
      console.log(`[CRE Leads API] CD123123 in results: ${hasCD123123}`)
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
    console.error('[CRE Leads API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
