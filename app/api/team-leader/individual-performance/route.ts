import { NextRequest, NextResponse } from 'next/server'
import { API_CONFIG } from '@/lib/config'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamLeaderId = searchParams.get('team_leader_id')
    const dateRange = searchParams.get('days') || searchParams.get('date_range') || '30'

    if (!teamLeaderId) {
      return NextResponse.json({ error: 'team_leader_id is required' }, { status: 400 })
    }

    console.log('[TL-API] teamLeaderId:', teamLeaderId, 'days:', dateRange)

    // Forward auth from incoming request
    const headerAuth = request.headers.get('authorization')
    const cookieToken = request.cookies.get('access_token')?.value
    const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')

    // 1) Fetch PS users from FastAPI (then filter by team_leader_id)
    const psResp = await fetch(`${API_CONFIG.FASTAPI_URL}/api/users?role=ps`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      cache: 'no-store' as any,
    })
    if (!psResp.ok) {
      return NextResponse.json({ error: 'Failed to fetch PS users' }, { status: psResp.status })
    }
    const psPayload = await psResp.json()
    const psList: any[] = Array.isArray(psPayload) ? psPayload : (psPayload.users || [])
    const psUsers = psList.filter((u: any) => u.team_leader_id === teamLeaderId)
    console.log('[TL-API] PS users found:', psUsers.length)

    const individualPerformance = []

    // 2) Fetch all follow-ups visible to current user (FastAPI applies RBAC)
    const fuResp = await fetch(`${API_CONFIG.FASTAPI_URL}/api/ps-followup`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      cache: 'no-store' as any,
    })
    if (!fuResp.ok) {
      return NextResponse.json({ error: 'Failed to fetch followups' }, { status: fuResp.status })
    }
    const allFollowups: any[] = await fuResp.json()

    const norm = (s: any) => (s || '').toString().trim().toLowerCase()

    for (const ps of psUsers || []) {
      console.log('[TL-API] Processing PS:', ps.id, ps.username)
      const byId = allFollowups.filter(f => norm(f.ps_id) === norm(ps.id))
      const byName = byId.length ? [] : allFollowups.filter(f => {
        const nm = norm(f.ps_name)
        return nm === norm(ps.full_name) || nm === norm(ps.username)
      })
      let dataset = byId.length ? byId : byName
      const byIdCount = byId.length
      const byNameCount = byName.length
      console.log('[TL-API] followups by id count:', byIdCount)
      console.log('[TL-API] followups by name count:', byNameCount)
      const totalLeads = dataset.length || 0
      const statusStr = (s: any) => norm(s)
      const qualifiedLeads = dataset.filter((f: any) => statusStr(f.final_status).includes('qual')).length
      const closedWon = dataset.filter((f: any) => ['won','booked','retail','retailed','closed_won','retail requested'].includes(statusStr(f.final_status))).length
      const closedLost = dataset.filter((f: any) => statusStr(f.final_status).includes('lost')).length
      const conversionRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 10000) / 100 : 0
      const callVolume = dataset.filter((f: any) => (f.first_call_date || f.second_call_date || f.third_call_date || f.fourth_call_date || f.fifth_call_date)).length
      const revenue = 0
      const recent_activities = dataset
        .sort((a: any, b: any) => (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()))
        .slice(0, 5)
        .map((f: any) => ({
          id: f.id,
          type: 'followup',
          description: f.notes || f.first_remark || 'Follow-up',
          created_at: f.created_at
        }))
      console.log('[TL-API] metrics for', ps.username, {
        totalLeads,
        qualifiedLeads,
        closedWon,
        closedLost,
        callVolume,
      })

      // Map leads for UI consumption (keep essential fields only)
      const leads = (dataset || []).map((f: any) => ({
        id: f.id,
        lead_uid: f.lead_uid,
        customer_name: f.customer_name,
        customer_mobile_number: f.customer_mobile_number,
        source: f.source,
        final_status: f.final_status,
        lead_status: f.lead_status,
        ps_name: f.ps_name,
        ps_id: f.ps_id,
        created_at: f.created_at,
        updated_at: f.updated_at,
        model_interested: f.model_interested,
        variant: f.variant,
        buying_plan: f.buying_plan,
        finance_option: f.finance_option,
        booking_id: f.booking_id,
        retailed_id: f.retailed_id,
        first_call_date: f.first_call_date,
        first_call_lead_status: f.first_call_lead_status,
        second_call_date: f.second_call_date,
        second_call_lead_status: f.second_call_lead_status,
      }))

      individualPerformance.push({
        ps_user: {
          id: ps.id,
          username: ps.username,
          full_name: ps.full_name,
          email: ps.email,
          branch: ps.branch
        },
        metrics: {
          total_leads: totalLeads,
          new_leads: totalLeads, // treat as inflow; refine if needed
          qualified_leads: qualifiedLeads,
          closed_won: closedWon,
          closed_lost: closedLost,
          conversion_rate: conversionRate,
          call_volume: callVolume,
          revenue,
          avg_response_time: 0
        },
        recent_activities,
        leads,
        debug: { byIdCount, byNameCount }
      })
    }

    // Return both keys for compatibility with existing client code
    return NextResponse.json({ individual: individualPerformance, individual_performance: individualPerformance })
  } catch (error) {
    console.error('Error in team leader individual performance GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
