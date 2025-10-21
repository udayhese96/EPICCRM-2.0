import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check all tables for data
    const [
      { data: leadMaster, error: leadMasterError },
      { data: qualifiedLeads, error: qualifiedLeadsError },
      { data: bookingRetail, error: bookingRetailError },
      { data: tradeIn, error: tradeInError },
      { data: users, error: usersError }
    ] = await Promise.all([
      supabase.from('lead_master').select('id, uid, created_at, final_status').limit(5),
      supabase.from('qualified_leads').select('id, lead_uid, created_at, final_status').limit(5),
      supabase.from('booking_and_retail_master').select('id, lead_uid, created_at, final_status').limit(5),
      supabase.from('trade_in_master').select('id, lead_uid, created_at').limit(5),
      supabase.from('users').select('id, username, role, branch').limit(5)
    ])

    // Get counts
    const [
      { count: leadMasterCount },
      { count: qualifiedLeadsCount },
      { count: bookingRetailCount },
      { count: tradeInCount },
      { count: usersCount }
    ] = await Promise.all([
      supabase.from('lead_master').select('*', { count: 'exact', head: true }),
      supabase.from('qualified_leads').select('*', { count: 'exact', head: true }),
      supabase.from('booking_and_retail_master').select('*', { count: 'exact', head: true }),
      supabase.from('trade_in_master').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true })
    ])

    return NextResponse.json({
      tableCounts: {
        lead_master: leadMasterCount || 0,
        qualified_leads: qualifiedLeadsCount || 0,
        booking_and_retail_master: bookingRetailCount || 0,
        trade_in_master: tradeInCount || 0,
        users: usersCount || 0
      },
      sampleData: {
        lead_master: leadMaster || [],
        qualified_leads: qualifiedLeads || [],
        booking_and_retail_master: bookingRetail || [],
        trade_in_master: tradeIn || [],
        users: users || []
      },
      errors: {
        lead_master: leadMasterError,
        qualified_leads: qualifiedLeadsError,
        booking_and_retail_master: bookingRetailError,
        trade_in_master: tradeInError,
        users: usersError
      }
    })

  } catch (error) {
    console.error('Error checking data:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}

