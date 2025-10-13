import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lead_uid = searchParams.get('lead_uid')
    
    if (!lead_uid) {
      return NextResponse.json({ error: 'Lead UID is required' }, { status: 400 })
    }

    console.log('🔍 Fetching call history for lead_uid:', lead_uid)

    // Use server-side client with service role key for reliable access
    const { createClient: createServerClient } = await import('@supabase/supabase-js')
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch the lead first to get metadata and basic info
    const { data: lead, error: leadError } = await supabase
      .from('lead_master')
      .select('*')
      .eq('uid', lead_uid)
      .maybeSingle()

    if (leadError) {
      console.error('Error fetching lead:', leadError)
      return NextResponse.json({ error: `Database error: ${leadError.message}` }, { status: 500 })
    }

    if (!lead) {
      console.log('Lead not found for UID:', lead_uid)
      // Return empty history instead of error
      return NextResponse.json([])
    }

    console.log('✅ Lead found:', {
      uid: lead.uid,
      customer_name: lead.customer_name,
      cre_name: lead.cre_name,
      first_remark: lead.first_remark,
      first_call_date: lead.first_call_date,
      second_remark: lead.second_remark,
      second_call_date: lead.second_call_date,
      third_remark: lead.third_remark,
      third_call_date: lead.third_call_date
    })

    // Construct CRE call history from lead_master fields
    const creHistory = []
    
    // Add first call if exists
    if (lead.first_remark && lead.first_call_date) {
      creHistory.push({
        type: 'CRE First Call',
        user: lead.cre_name || 'CRE',
        subject: 'Initial Contact',
        description: lead.first_remark,
        timestamp: lead.first_call_date,
        status: 'Completed'
      })
    }

    // Add follow-up calls from lead_master (2nd, 3rd, 4th, 5th, 6th)
    const followUpCalls = [
      { date: lead.second_call_date, remark: lead.second_remark, status: lead.second_call_lead_status, num: 'Second' },
      { date: lead.third_call_date, remark: lead.third_remark, status: lead.third_call_lead_status, num: 'Third' },
      { date: lead.fourth_call_date, remark: lead.fourth_remark, status: lead.fourth_call_lead_status, num: 'Fourth' },
      { date: lead.fifth_call_date, remark: lead.fifth_remark, status: lead.fifth_call_lead_status, num: 'Fifth' },
      { date: lead.sixth_call_date, remark: lead.sixth_remark, status: lead.sixth_call_lead_status, num: 'Sixth' },
    ]

    followUpCalls.forEach(call => {
      if (call.date && call.remark) {
        creHistory.push({
          type: `CRE ${call.num} Call`,
          user: lead.cre_name || 'CRE',
          subject: `${call.num} Follow-up Call`,
          description: call.remark,
          timestamp: call.date,
          status: call.status || 'Completed'
        })
      }
    })

    // Add pending reasons from lead_master if available
    if (lead.pending_reasons) {
      try {
        const pendingReasons = JSON.parse(lead.pending_reasons)
        if (Array.isArray(pendingReasons) && pendingReasons.length > 0) {
          pendingReasons.forEach((reason: any, index: number) => {
            creHistory.push({
              type: 'CRE Pending Reason',
              user: reason.user || lead.cre_name || 'CRE',
              subject: `Pending Reason ${reason.attempt || index + 1}`,
              description: reason.reason || 'No reason provided',
              timestamp: reason.date || lead.updated_at,
              status: reason.status || 'Pending'
            })
          })
        }
      } catch (error) {
        console.log('Error parsing pending_reasons:', error)
      }
    }

    // Fetch PS call history from ps_followup_master
    const { data: psFollowups, error: psError } = await supabase
      .from('ps_followup_master')
      .select('*')
      .eq('lead_uid', lead_uid)
      .order('created_at', { ascending: false })

    const psHistory: any[] = []
    if (psFollowups && psFollowups.length > 0) {
      psFollowups.forEach(followup => {
        psHistory.push({
          type: 'PS Follow-up',
          user: followup.ps_name || lead.ps_name || 'PS',
          subject: 'PS Follow-up Call',
          description: followup.followup_note || 'No description',
          timestamp: followup.created_at,
          status: followup.final_status || 'Active'
        })
      })
    }

    // Combine CRE and PS history
    const allHistory = [...creHistory, ...psHistory]
    
    // Sort by timestamp (newest first)
    allHistory.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0)
      const dateB = new Date(b.timestamp || 0)
      return dateB.getTime() - dateA.getTime()
    })

    console.log('📞 Final call history:', {
      creHistoryCount: creHistory.length,
      psHistoryCount: psHistory.length,
      totalHistoryCount: allHistory.length,
      creHistory: creHistory,
      psHistory: psHistory,
      allHistory: allHistory
    })

    return NextResponse.json(allHistory)
  } catch (error) {
    console.error('Error fetching call history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


