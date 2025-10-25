import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user data and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, branch, id')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('User data error:', userError)
      // For now, allow access even if user data is not found
      // return NextResponse.json({ error: 'User data not found' }, { status: 403 })
    }

    // Check if user has appropriate role (optional for now)
    // if (userData && !['team_leader', 'cre_team_leader'].includes(userData.role)) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'
    const branch = searchParams.get('branch') || userData.branch

    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get assigned team members (PS users)
    const { data: teamMembers, error: teamError } = await supabase
      .from('users')
      .select('id, full_name, username, branch')
      .eq('team_leader_id', userData.id)
      .eq('role', 'ps')
      .eq('is_active', true)

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      return NextResponse.json({ error: 'Failed to fetch team data' }, { status: 500 })
    }

    const teamMemberIds = teamMembers?.map(member => member.id) || []

    if (teamMemberIds.length === 0) {
      return NextResponse.json({
        teamMembers: [],
        teamPerformance: [],
        sourceDistribution: [],
        dailyPerformance: [],
        kpis: {
          total: 0,
          fresh: 0,
          pending: 0,
          won: 0,
          lost: 0,
          followup: 0,
          winRate: 0,
          conversionRate: 0
        }
      })
    }

    // Get leads for team members
    const { data: leads, error: leadsError } = await supabase
      .from('lead_master')
      .select('*')
      .in('ps_id', teamMemberIds)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads data' }, { status: 500 })
    }

    // Filter by branch if specified
    const filteredLeads = branch ? leads.filter(lead => lead.branch === branch) : leads

    // Calculate KPIs
    const total = filteredLeads.length
    const fresh = filteredLeads.filter(lead => 
      !lead.follow_up_date && 
      lead.final_status === 'Pending' &&
      !lead.first_call_date
    ).length
    const pending = filteredLeads.filter(lead => 
      lead.final_status === 'Pending'
    ).length
    const won = filteredLeads.filter(lead => 
      lead.final_status === 'Won'
    ).length
    const lost = filteredLeads.filter(lead => 
      lead.final_status === 'Lost'
    ).length
    const followup = filteredLeads.filter(lead => 
      lead.follow_up_date && 
      lead.final_status === 'Pending' &&
      new Date(lead.follow_up_date) <= new Date()
    ).length

    const winRate = total > 0 ? (won / total) * 100 : 0
    const conversionRate = total > 0 ? ((won + pending) / total) * 100 : 0

    // Team performance
    const teamPerformance = teamMembers.map(member => {
      const memberLeads = filteredLeads.filter(lead => lead.ps_id === member.id)
      const memberTotal = memberLeads.length
      const memberFresh = memberLeads.filter(lead => 
        !lead.follow_up_date && 
        lead.final_status === 'Pending' &&
        !lead.first_call_date
      ).length
      const memberPending = memberLeads.filter(lead => 
        lead.final_status === 'Pending'
      ).length
      const memberWon = memberLeads.filter(lead => 
        lead.final_status === 'Won'
      ).length
      const memberLost = memberLeads.filter(lead => 
        lead.final_status === 'Lost'
      ).length
      const memberFollowup = memberLeads.filter(lead => 
        lead.follow_up_date && 
        lead.final_status === 'Pending' &&
        new Date(lead.follow_up_date) <= new Date()
      ).length

      return {
        id: member.id,
        name: member.full_name,
        branch: member.branch,
        stats: {
          total_leads: memberTotal,
          fresh_leads: memberFresh,
          pending_leads: memberPending,
          won_leads: memberWon,
          lost_leads: memberLost,
          followup_leads: memberFollowup,
          win_rate: memberTotal > 0 ? (memberWon / memberTotal) * 100 : 0,
          conversion_rate: memberTotal > 0 ? (memberWon / memberTotal) * 100 : 0
        }
      }
    }).sort((a, b) => b.stats.win_rate - a.stats.win_rate)

    // Source distribution
    const sourceStats = filteredLeads.reduce((acc: any, lead) => {
      const source = lead.source || 'Unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    const sourceDistribution = Object.entries(sourceStats)
      .map(([source, count]: [string, any]) => ({
        source,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)

    // Daily performance (last 7 days)
    const dailyPerformance = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayLeads = filteredLeads.filter(lead => lead.created_at.startsWith(dateStr))
      const dayWon = dayLeads.filter(lead => lead.final_status === 'Won')
      const dayLost = dayLeads.filter(lead => lead.final_status === 'Lost')

      dailyPerformance.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        leads: dayLeads.length,
        won: dayWon.length,
        lost: dayLost.length
      })
    }

    return NextResponse.json({
      teamMembers,
      teamPerformance,
      sourceDistribution,
      dailyPerformance,
      kpis: {
        total,
        fresh,
        pending,
        won,
        lost,
        followup,
        winRate,
        conversionRate
      }
    })

  } catch (error) {
    console.error('Error in team leader analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
