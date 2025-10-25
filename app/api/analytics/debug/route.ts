import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get sample data from lead_master to see what we're working with
    const { data: leads, error: leadsError } = await supabase
      .from('lead_master')
      .select('*')
      .limit(10)
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads data', details: leadsError }, { status: 500 })
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('lead_master')
      .select('*', { count: 'exact', head: true })

    // Get recent leads (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentLeads, error: recentError } = await supabase
      .from('lead_master')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // Get today's leads
    const today = new Date().toISOString().split('T')[0]
    const { data: todayLeads, error: todayError } = await supabase
      .from('lead_master')
      .select('*')
      .gte('created_at', today + 'T00:00:00')
      .lt('created_at', today + 'T23:59:59')

    // Check qualified_leads table
    const { data: qualifiedLeads, error: qualifiedError } = await supabase
      .from('qualified_leads')
      .select('*')
      .limit(5)

    return NextResponse.json({
      debug: {
        totalLeadsInDB: totalCount,
        sampleLeads: leads?.slice(0, 3) || [],
        recentLeadsCount: recentLeads?.length || 0,
        todayLeadsCount: todayLeads?.length || 0,
        qualifiedLeadsSample: qualifiedLeads?.slice(0, 2) || [],
        errors: {
          leadsError,
          recentError,
          todayError,
          qualifiedError
        }
      },
      fieldAnalysis: {
        leadFields: leads && leads.length > 0 ? Object.keys(leads[0]) : [],
        qualifiedFields: qualifiedLeads && qualifiedLeads.length > 0 ? Object.keys(qualifiedLeads[0]) : []
      }
    })

  } catch (error) {
    console.error('Error in debug analytics:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}

