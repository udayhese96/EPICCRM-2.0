import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lead_uid = searchParams.get('lead_uid')
    
    if (!lead_uid) {
      return NextResponse.json({ error: 'Lead UID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Try to fetch from trade_in_master table first
    const { data: tradeInData, error: tradeInError } = await supabase
      .from('trade_in_master')
      .select('*')
      .eq('lead_uid', lead_uid)
      .single()

    if (tradeInData) {
      return NextResponse.json(tradeInData)
    }

    // If not found in trade_in_master, get from lead_master
    const { data: leadData, error: leadError } = await supabase
      .from('lead_master')
      .select('trade_in_make, trade_in_model, trade_in_year, trade_in_km, trade_in_ownership, created_at, updated_at')
      .eq('uid', lead_uid)
      .maybeSingle()

    if (leadError) {
      console.error('Error fetching lead:', leadError)
      return NextResponse.json({ error: `Database error: ${leadError.message}` }, { status: 500 })
    }

    if (!leadData) {
      console.log('Lead not found for UID:', lead_uid)
      // Return empty data instead of error
      return NextResponse.json({
        trade_in_make: 'Not specified',
        trade_in_model: 'Not specified',
        trade_in_year: 'Not specified',
        trade_in_km: 'Not specified',
        trade_in_ownership: 'Not specified',
        created_at: null,
        updated_at: null
      })
    }

    // Return trade-in data from lead_master
    return NextResponse.json({
      trade_in_make: leadData.trade_in_make,
      trade_in_model: leadData.trade_in_model,
      trade_in_year: leadData.trade_in_year,
      trade_in_km: leadData.trade_in_km,
      trade_in_ownership: leadData.trade_in_ownership,
      created_at: leadData.created_at,
      updated_at: leadData.updated_at
    })
  } catch (error) {
    console.error('Error fetching trade-in details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


