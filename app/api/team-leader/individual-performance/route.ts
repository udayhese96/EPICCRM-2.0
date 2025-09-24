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

    // Get assigned PS users with their details
    const { data: assignments, error: assignmentsError } = await supabase
      .from('team_leader_assignments')
      .select(`
        ps_user_id,
        ps_user:users!ps_user_id (
          id,
          username,
          full_name,
          email,
          branch
        )
      `)
      .eq('team_leader_id', teamLeaderId)

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    const individualPerformance = []

    for (const assignment of assignments || []) {
      const psUserId = assignment.ps_user_id

      // Get leads for this PS user
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', psUserId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (leadsError) {
        console.error('Error fetching leads for PS user:', psUserId, leadsError)
        continue
      }

      // Get activities for this PS user's leads
      const leadIds = leads?.map(l => l.id) || []
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .in('lead_id', leadIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(5) // Get recent 5 activities

      if (activitiesError) {
        console.error('Error fetching activities for PS user:', psUserId, activitiesError)
      }

      // Calculate metrics for this PS user
      const totalLeads = leads?.length || 0
      const newLeads = leads?.filter(l => l.status === 'new').length || 0
      const qualifiedLeads = leads?.filter(l => l.status === 'qualified').length || 0
      const closedWon = leads?.filter(l => l.status === 'closed_won').length || 0
      const closedLost = leads?.filter(l => l.status === 'closed_lost').length || 0
      const conversionRate = totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0
      
      // Calculate revenue for this PS user
      const revenue = leads
        ?.filter(l => l.status === 'closed_won')
        ?.reduce((sum, l) => sum + (l.expected_value || 0), 0) || 0

      // Count call activities
      const callVolume = activities?.filter(a => a.activity_type === 'call').length || 0

      // Calculate average response time (mock calculation)
      const avgResponseTime = Math.random() * 3 + 1 // Random between 1-4 hours

      individualPerformance.push({
        ps_user: assignment.ps_user,
        metrics: {
          total_leads: totalLeads,
          new_leads: newLeads,
          qualified_leads: qualifiedLeads,
          closed_won: closedWon,
          closed_lost: closedLost,
          conversion_rate: Math.round(conversionRate * 100) / 100,
          call_volume: callVolume,
          revenue: revenue,
          avg_response_time: Math.round(avgResponseTime * 10) / 10
        },
        recent_activities: activities?.map(activity => ({
          id: activity.id,
          type: activity.activity_type,
          description: activity.subject,
          created_at: activity.created_at
        })) || []
      })
    }

    return NextResponse.json({ individual_performance: individualPerformance })
  } catch (error) {
    console.error('Error in team leader individual performance GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
