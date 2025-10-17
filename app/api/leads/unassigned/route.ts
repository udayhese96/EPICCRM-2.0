import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })

    const { data: leads, error } = await supabase
      .from('lead_master')
      .select('uid, source, assigned, final_status, cre_name')
      .eq('assigned', 'No')
      .in('final_status', ['Pending', 'Follow-up'])
      .limit(2000)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const by_source: Record<string, number> = {}
    for (const lead of leads || []) {
      const src = lead.source || 'Unknown'
      by_source[src] = (by_source[src] || 0) + 1
    }

    return NextResponse.json({ success: true, leads: leads || [], count: leads?.length || 0, by_source })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}
