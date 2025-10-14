import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Fetch unassigned leads (where assigned = 'No')
    const { data: leads, error } = await supabase
      .from('lead_master')
      .select('*')
      .eq('assigned', 'No')
      .in('final_status', ['Pending', 'Follow-up'])
      .order('created_at', { ascending: false })
      .limit(1000)
    
    console.log('Fetched unassigned leads:', leads?.length || 0)
    
    if (leads && leads.length > 0) {
      console.log('Sample lead:', {
        id: leads[0].id,
        uid: leads[0].uid,
        assigned: leads[0].assigned,
        cre_id: leads[0].cre_id,
        final_status: leads[0].final_status
      })
    }

    if (error) {
      console.error('Error fetching unassigned leads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch unassigned leads', details: error.message },
        { status: 500 }
      )
    }

    // Group leads by source for the UI
    const bySource: Record<string, any[]> = {}
    leads?.forEach(lead => {
      const source = lead.source || 'Unknown'
      if (!bySource[source]) {
        bySource[source] = []
      }
      bySource[source].push(lead)
    })

    const response = NextResponse.json({
      success: true,
      leads: leads || [],
      count: leads?.length || 0,
      by_source: bySource  // Add this for the UI
    })
    
    // Add no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    
    return response

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
