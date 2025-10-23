import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check lead_master table with different queries
    const [
      { data: allLeads, error: allLeadsError },
      { data: recentLeads, error: recentLeadsError },
      { data: todayLeads, error: todayLeadsError },
      { count: totalCount, error: countError }
    ] = await Promise.all([
      supabase.from('lead_master').select('*').limit(10),
      supabase.from('lead_master').select('*').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('lead_master').select('*').gte('created_at', new Date().toISOString().split('T')[0]),
      supabase.from('lead_master').select('*', { count: 'exact', head: true })
    ])

    // Also check the structure of the table
    const { data: sampleLead, error: sampleError } = await supabase
      .from('lead_master')
      .select('*')
      .limit(1)
      .single()

    return NextResponse.json({
      counts: {
        totalLeads: totalCount || 0,
        allLeadsSample: allLeads?.length || 0,
        recentLeads30Days: recentLeads?.length || 0,
        todayLeads: todayLeads?.length || 0
      },
      sampleData: {
        allLeads: allLeads || [],
        recentLeads: recentLeads || [],
        todayLeads: todayLeads || [],
        singleSample: sampleLead || null
      },
      errors: {
        allLeads: allLeadsError,
        recentLeads: recentLeadsError,
        todayLeads: todayLeadsError,
        count: countError,
        sample: sampleError
      },
      tableInfo: {
        hasData: (totalCount || 0) > 0,
        sampleLeadStructure: sampleLead ? Object.keys(sampleLead) : []
      }
    })

  } catch (error) {
    console.error('Error checking lead_master:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}


