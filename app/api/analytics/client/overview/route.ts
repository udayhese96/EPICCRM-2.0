import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'
    const branch = searchParams.get('branch') || null

    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Create a simple Supabase client for direct database access
    // This bypasses authentication for now to get the analytics working
    const supabase = createClient()

    // Get leads data directly
    let leadQuery = supabase
      .from('lead_master')
      .select(`
        *,
        qualified_leads(*)
      `)
      .gte('created_at', startDate.toISOString())

    if (branch) {
      leadQuery = leadQuery.eq('branch', branch)
    }

    const { data: leads, error: leadsError } = await leadQuery

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads data' }, { status: 500 })
    }

    // Real-time metrics
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substring(0, 7)

    const todayLeads = leads.filter((lead: any) => 
      lead.created_at.startsWith(today)
    ).length

    const monthlyLeads = leads.filter((lead: any) => 
      lead.created_at.startsWith(thisMonth)
    ).length

    const qualifiedLeads = leads.filter((lead: any) => 
      lead.final_status === 'QUALIFIED'
    ).length

    const monthlyConversionRate = monthlyLeads > 0 
      ? (qualifiedLeads / monthlyLeads) * 100 
      : 0

    const activeCREs = new Set(
      leads
        .filter((lead: any) => lead.cre_name && lead.assigned === 'Yes')
        .map((lead: any) => lead.cre_name)
    ).size

    const retailedLeads = leads.filter((lead: any) => 
      lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED')
    ).length

    const projectedRevenue = retailedLeads * 1000000 // 10 lakhs per retail

    // Daily trend data (last 30 days)
    const dailyTrend = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayLeads = leads.filter((lead: any) => lead.created_at.startsWith(dateStr))
      const dayQualified = dayLeads.filter((lead: any) => lead.final_status === 'QUALIFIED')
      const dayBooked = dayLeads.filter((lead: any) => 
        lead.qualified_leads?.some((ql: any) => ql.booking_status === 'APPROVED')
      )
      const dayRetailed = dayLeads.filter((lead: any) => 
        lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED')
      )

      dailyTrend.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: dayLeads.length,
        qualified: dayQualified.length,
        booked: dayBooked.length,
        retailed: dayRetailed.length
      })
    }

    // Source performance ranking
    const sourceStats = leads.reduce((acc: any, lead: any) => {
      const source = lead.source || 'Unknown'
      if (!acc[source]) {
        acc[source] = { total: 0, qualified: 0 }
      }
      acc[source].total++
      if (lead.final_status === 'QUALIFIED') {
        acc[source].qualified++
      }
      return acc
    }, {})

    const sourcePerformance = Object.entries(sourceStats)
      .map(([source, stats]: [string, any]) => ({
        source,
        total: stats.total,
        qualified: stats.qualified,
        conversionRate: stats.total > 0 ? (stats.qualified / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)

    // CRE leaderboard
    const creStats = leads.reduce((acc: any, lead: any) => {
      const creName = lead.cre_name || 'Unknown'
      
      if (!acc[creName]) {
        acc[creName] = {
          total: 0,
          qualified: 0,
          booked: 0,
          retailed: 0,
          branch: lead.branch
        }
      }
      
      acc[creName].total++
      if (lead.final_status === 'QUALIFIED') acc[creName].qualified++
      
      const hasBooking = lead.qualified_leads?.some((ql: any) => ql.booking_status === 'APPROVED')
      if (hasBooking) acc[creName].booked++
      
      const hasRetail = lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED')
      if (hasRetail) acc[creName].retailed++

      return acc
    }, {})

    const creLeaderboard = Object.entries(creStats)
      .map(([creName, stats]: [string, any]) => {
        const performanceScore = (
          stats.qualified * 5 +
          stats.booked * 10 +
          stats.retailed * 20
        ) / Math.max(stats.total, 1)

        return {
          creName,
          branch: stats.branch,
          total: stats.total,
          qualified: stats.qualified,
          booked: stats.booked,
          retailed: stats.retailed,
          conversionRate: stats.total > 0 ? (stats.qualified / stats.total) * 100 : 0,
          performanceScore
        }
      })
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 10)

    // Alerts
    const alerts = []
    
    // Overdue follow-ups
    const overdueFollowups = leads.filter((lead: any) => 
      lead.follow_up_date && 
      new Date(lead.follow_up_date) < new Date() &&
      !['QUALIFIED', 'LOST'].includes(lead.final_status || '')
    ).length

    if (overdueFollowups > 0) {
      alerts.push({
        type: 'Overdue Follow-ups',
        count: overdueFollowups,
        priority: 'high'
      })
    }

    // Low performing CREs
    const lowPerformingCREs = Object.entries(creStats)
      .filter(([_, stats]: [string, any]) => 
        stats.total >= 5 && (stats.qualified / stats.total) < 0.1
      ).length

    if (lowPerformingCREs > 0) {
      alerts.push({
        type: 'Low Performing CREs',
        count: lowPerformingCREs,
        priority: 'high'
      })
    }

    return NextResponse.json({
      realTimeMetrics: {
        todayLeads,
        monthlyLeads,
        monthlyConversionRate,
        activeCREs,
        retailedLeads,
        projectedRevenue
      },
      dailyTrend,
      sourcePerformance,
      creLeaderboard,
      alerts
    })

  } catch (error) {
    console.error('Error in client analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
