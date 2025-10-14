import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 })
    }
    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })

    const distinct = async (column: string) => {
      // Using RPC-like distinct via select and manual de-dupe
      const { data, error } = await supabase
        .from('lead_master')
        .select(`${column}`)
        .not(column as any, 'is', null)
        .order(column as any, { ascending: true })
      if (error) return [] as string[]
      const values = (data || []).map((r: any) => (r?.[column] ?? '') as string).filter(Boolean)
      // De-dupe defensively, trim
      return Array.from(new Set(values.map(v => String(v).trim()))).filter(Boolean)
    }

    const [leadStatuses, finalStatuses, categories, branches, tradeIn, models, sources] = await Promise.all([
      distinct('lead_status'),
      distinct('final_status'),
      distinct('lead_category'),
      distinct('branch'),
      distinct('trade_in'),
      distinct('model_interested'),
      distinct('source')
    ])

    // Merge status sets for a single dropdown
    const statusSet = Array.from(new Set([...leadStatuses, ...finalStatuses]))

    return NextResponse.json({
      status: statusSet,
      category: categories,
      branch: branches,
      trade_in: tradeIn,
      model: models,
      source: sources,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}


