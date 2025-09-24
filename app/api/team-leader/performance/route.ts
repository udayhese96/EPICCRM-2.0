import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const teamLeaderId = searchParams.get('team_leader_id')
    const dateRange = searchParams.get('date_range') || '30'

    if (!teamLeaderId) {
      return NextResponse.json({ error: 'team_leader_id is required' }, { status: 400 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(dateRange))

    // Get assigned PS users for this team leader
    const { data: assignments, error: assignmentsError } = await supabase
      .from('team_leader_assignments')
      .select('ps_user_id')
      .eq('team_leader_id', teamLeaderId)

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    const psUserIds = assignments?.map(a => a.ps_user_id) || []

    if (psUserIds.length === 0) {
      return NextResponse.json({
        total_leads: 0,
        new_leads: 0,
        qualified_leads: 0,
        closed_won: 0,
        closed_lost: 0,
        conversion_rate: 0,
        call_volume: 0,
        revenue: 0,
        avg_response_time: 0
      })
    }

    // Get leads assigned to these PS users within date range
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('assigned_to', psUserIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    // Get activities for these leads
    const leadIds = leads?.map(l => l.id) || []
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .in('lead_id', leadIds)
      .eq('activity_type', 'call')

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    // Calculate metrics
    const totalLeads = leads?.length || 0
    const newLeads = leads?.filter(l => l.status === 'new').length || 0
    const qualifiedLeads = leads?.filter(l => l.status === 'qualified').length || 0
    const closedWon = leads?.filter(l => l.status === 'closed_won').length || 0
    const closedLost = leads?.filter(l => l.status === 'closed_lost').length || 0
    const conversionRate = totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0
    const callVolume = activities?.length || 0
    
    // Calculate revenue (sum of expected_value for closed_won leads)
    const revenue = leads
      ?.filter(l => l.status === 'closed_won')
      ?.reduce((sum, l) => sum + (l.expected_value || 0), 0) || 0

    // Calculate average response time (mock calculation - would need actual response time data)
    const avgResponseTime = 2.3 // This would be calculated from actual response time data

    const performanceData = {
      total_leads: totalLeads,
      new_leads: newLeads,
      qualified_leads: qualifiedLeads,
      closed_won: closedWon,
      closed_lost: closedLost,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      call_volume: callVolume,
      revenue: revenue,
      avg_response_time: avgResponseTime
    }

    return NextResponse.json(performanceData)
  } catch (error) {
    console.error('Error in team leader performance GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
