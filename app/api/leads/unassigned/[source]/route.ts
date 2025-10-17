import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { source: string } }
) {
  try {
    const rawSource = decodeURIComponent(params.source)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    const hasCombined = rawSource.includes(' + ')
    const [mainSource, subSource] = hasCombined ? rawSource.split(' + ', 2).map(s => s.trim()) : [rawSource, '']

    let query = supabase
      .from('lead_master')
      .select('*')
      .eq('assigned', 'No')
      .in('final_status', ['Pending', 'Follow-up'])

    if (hasCombined) {
      query = query.eq('source', mainSource).eq('sub_source', subSource)
    } else {
      query = query.eq('source', mainSource)
    }

    const { data: leads, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leads', details: error.message }, { status: 500 })
    }

    const response = NextResponse.json(leads || [])
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
