import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lead_uid: string }> }
) {
  try {
    const { lead_uid } = await params
    const supabase = await createClient()

    // Try to get user from Authorization header first (for API calls)
    const authHeader = request.headers.get('authorization')
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // For API calls with Bearer token, we'll skip auth check for now
      // as the frontend handles authentication
      console.log('API call with Bearer token, proceeding without server-side auth check')
    } else {
      // Try server-side authentication
      const { data: { user: serverUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !serverUser) {
        // If server-side auth fails, allow the request to proceed
        // as the frontend will handle authentication
        console.log('Server-side auth failed, proceeding without auth check')
      } else {
        user = serverUser
      }
    }

    // Fetch the lead first to get metadata and basic info
    const { data: lead, error: leadError } = await supabase
      .from('lead_master')
      .select('*')
      .eq('uid', lead_uid)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Extract call history from metadata
    const metadata = lead.metadata || {}
    const callHistory = metadata.call_history || []
    
    // If no call history in metadata, try to construct from lead fields
    const constructedHistory = []
    
    // Add first call if exists
    if (lead.first_remark && lead.first_call_date) {
      constructedHistory.push({
        type: 'First Call',
        user: lead.cre_name || 'CRE',
        subject: 'Initial Contact',
        description: lead.first_remark,
        timestamp: lead.first_call_date,
        status: 'Completed'
      })
    }

    // Add follow-up calls if they exist
    for (let i = 1; i <= 6; i++) {
      const callDateField = `${i === 1 ? 'second' : i === 2 ? 'third' : i === 3 ? 'fourth' : i === 4 ? 'fifth' : 'sixth'}_call_date`
      const remarkField = `${i === 1 ? 'second' : i === 2 ? 'third' : i === 3 ? 'fourth' : i === 4 ? 'fifth' : 'sixth'}_remark`
      
      const callDate = lead[callDateField]
      const remark = lead[remarkField]
      
      if (callDate && remark) {
        constructedHistory.push({
          type: `${i === 1 ? 'Second' : i === 2 ? 'Third' : i === 3 ? 'Fourth' : i === 4 ? 'Fifth' : 'Sixth'} Call`,
          user: lead.cre_name || 'CRE',
          subject: `Follow-up Call ${i}`,
          description: remark,
          timestamp: callDate,
          status: 'Completed'
        })
      }
    }

    // Try to get additional call history from ps_followup_master if available
    const { data: followupData } = await supabase
      .from('ps_followup_master')
      .select('*')
      .eq('lead_uid', lead_uid)
      .order('created_at', { ascending: false })

    // Add follow-up data to history
    if (followupData && followupData.length > 0) {
      followupData.forEach((followup, index) => {
        constructedHistory.push({
          type: 'PS Follow-up',
          user: followup.ps_name || 'PS',
          subject: 'PS Follow-up',
          description: followup.followup_note || 'No description',
          timestamp: followup.created_at,
          status: followup.final_status || 'Active'
        })
      })
    }

    // Check for PS call history in metadata
    if (metadata.ps_call_history) {
      metadata.ps_call_history.forEach((psCall: any) => {
        constructedHistory.push({
          type: 'PS Call',
          user: psCall.ps_name || lead.ps_name || 'PS',
          subject: psCall.subject || 'PS Call',
          description: psCall.remark || psCall.description || 'No description',
          timestamp: psCall.timestamp || psCall.date || lead.updated_at,
          status: psCall.status || 'Completed'
        })
      })
    }

    // Check for pending reasons which might contain PS remarks
    if (lead.pending_reasons && lead.pending_reasons !== '[]') {
      try {
        const pendingReasons = JSON.parse(lead.pending_reasons)
        if (Array.isArray(pendingReasons)) {
          pendingReasons.forEach((reason: any) => {
            constructedHistory.push({
              type: 'PS Remark',
              user: reason.user || lead.ps_name || 'PS',
              subject: `${reason.status || 'Status Update'}`,
              description: reason.reason || 'No description',
              timestamp: reason.date || lead.updated_at,
              status: reason.status || 'Pending'
            })
          })
        }
      } catch (e) {
        console.log('Could not parse pending_reasons:', e)
      }
    }

    // Combine metadata history with constructed history
    const allHistory = [...callHistory, ...constructedHistory]
    
    // Sort by timestamp (newest first)
    allHistory.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.date || 0)
      const dateB = new Date(b.timestamp || b.date || 0)
      return dateB.getTime() - dateA.getTime()
    })

    return NextResponse.json(allHistory)
  } catch (error) {
    console.error('Error fetching call history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
