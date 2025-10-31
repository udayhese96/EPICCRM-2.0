import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Lightweight: only select status columns and build distinct lists
    const { data: sample, error } = await supabase
        .from('lead_master')
      .select('lead_status,final_status')
      .eq('assigned', 'Yes')
      .limit(200)
      
      if (error) {
      console.error('Query error:', error.message)
      return NextResponse.json({ error: 'Query error', details: error.message }, { status: 500 })
    }

    const leadStatuses = new Set<string>()
    const finalStatuses = new Set<string>()
    ;(sample || []).forEach((row: any) => {
      if (row?.lead_status) leadStatuses.add(String(row.lead_status))
      if (row?.final_status) finalStatuses.add(String(row.final_status))
    })

    const response = NextResponse.json({
      statusAnalysis: {
        leadStatuses: Array.from(leadStatuses).sort(),
        finalStatuses: Array.from(finalStatuses).sort()
      },
      dataSource: 'lead_master (status columns only)',
      totalRecords: (sample || []).length,
      timestamp: new Date().toISOString()
    })

    // Cache for 5 minutes in production-safe way
    response.headers.set('Cache-Control', 'public, max-age=300')
    return response

  } catch (error) {
    console.error('Error in dynamic status analytics:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}
