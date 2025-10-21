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

    // Create Supabase client
    const supabase = await createClient()

    // Get data from both lead_master and qualified_leads tables
    const [
      { data: leadMasterData, error: leadMasterError },
      { data: qualifiedLeadsData, error: qualifiedLeadsError }
    ] = await Promise.all([
      supabase
        .from('lead_master')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
      
      supabase
        .from('qualified_leads')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
    ])

    // Also get all data if filtered queries return empty
    const [
      { data: allLeadMaster },
      { data: allQualifiedLeads }
    ] = await Promise.all([
      supabase
        .from('lead_master')
        .select('*')
        .limit(100)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('qualified_leads')
        .select('*')
        .limit(100)
        .order('created_at', { ascending: false })
    ])

    if (leadMasterError) {
      console.error('Error fetching lead_master:', leadMasterError)
    }
    if (qualifiedLeadsError) {
      console.error('Error fetching qualified_leads:', qualifiedLeadsError)
    }

    // Filter by branch if specified
    const filteredLeadMaster = branch 
      ? (leadMasterData || []).filter((lead: any) => lead.branch === branch)
      : (leadMasterData || [])
    
    const filteredQualifiedLeads = branch 
      ? (qualifiedLeadsData || []).filter((lead: any) => lead.branch === branch)
      : (qualifiedLeadsData || [])

    // Use filtered data if available, otherwise use all data
    const leadMasterToUse = filteredLeadMaster.length > 0 ? filteredLeadMaster : (allLeadMaster || [])
    const qualifiedLeadsToUse = filteredQualifiedLeads.length > 0 ? filteredQualifiedLeads : (allQualifiedLeads || [])

    // Get booking and retail data separately
    const { data: bookingRetailData } = await supabase
      .from('booking_and_retail_master')
      .select('*')
      .gte('created_at', startDate.toISOString())

    // Get trade-in data separately
    const { data: tradeInData } = await supabase
      .from('trade_in_master')
      .select('*')
      .gte('created_at', startDate.toISOString())

    console.log(`Found ${leadMasterToUse.length} leads from lead_master`)
    console.log(`Found ${qualifiedLeadsToUse.length} leads from qualified_leads`)
    console.log(`Found ${bookingRetailData?.length || 0} booking/retail records`)
    console.log(`Found ${tradeInData?.length || 0} trade-in records`)

    // Create lookup maps for related data
    const bookingRetailMap = new Map()
    bookingRetailData?.forEach(item => {
      bookingRetailMap.set(item.lead_uid, item)
    })
    
    const tradeInMap = new Map()
    tradeInData?.forEach(item => {
      tradeInMap.set(item.lead_uid, item)
    })

    // Combine data from both tables - prioritize qualified_leads as it has more recent data
    const allLeads = [...qualifiedLeadsToUse, ...leadMasterToUse]
    
    // Remove duplicates based on lead_uid or uid and enrich with related data
    const dataToUse = allLeads.reduce((acc: any[], lead: any) => {
      const key = lead.lead_uid || lead.uid
      if (!acc.find(l => (l.lead_uid || l.uid) === key)) {
        acc.push({
          ...lead,
          booking_and_retail_master: bookingRetailMap.get(key) ? [bookingRetailMap.get(key)] : [],
          trade_in_master: tradeInMap.get(key) ? [tradeInMap.get(key)] : []
        })
      }
      return acc
    }, [])

    // Real-time metrics from your actual data
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substring(0, 7)

    const todayLeads = dataToUse.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(today)
    ).length

    const monthlyLeads = dataToUse.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(thisMonth)
    ).length

    const qualifiedLeads = dataToUse.filter((lead: any) => {
      const status = lead.final_status || lead.lead_status
      return status && (
        status.toLowerCase().includes('qualified') ||
        status.toLowerCase().includes('won') ||
        status.toLowerCase().includes('hot') ||
        status === 'QUALIFIED' ||
        status === 'Won' ||
        status === 'Hot'
      )
    }).length

    const monthlyConversionRate = monthlyLeads > 0 
      ? (qualifiedLeads / monthlyLeads) * 100 
      : 0

    const activeCREs = new Set(
      enrichedData
        .filter((lead: any) => lead.cre_name && lead.assigned === 'Yes')
        .map((lead: any) => lead.cre_name)
    ).size

    const retailedLeads = enrichedData.filter((lead: any) => 
      lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED') ||
      lead.booking_and_retail_master?.some((brm: any) => brm.retailed_status === 'APPROVED')
    ).length

    const projectedRevenue = retailedLeads * 1000000 // 10 lakhs per retail

    // Daily trend data (last 30 days) from your actual data
    const dailyTrend = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayLeads = enrichedData.filter((lead: any) => lead.created_at && lead.created_at.startsWith(dateStr))
      const dayQualified = dayLeads.filter((lead: any) => 
        lead.final_status === 'QUALIFIED' || lead.final_status === 'Won'
      )
      const dayBooked = dayLeads.filter((lead: any) => 
        lead.qualified_leads?.some((ql: any) => ql.booking_status === 'APPROVED') ||
        lead.booking_and_retail_master?.some((brm: any) => brm.booking_status === 'APPROVED')
      )
      const dayRetailed = dayLeads.filter((lead: any) => 
        lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED') ||
        lead.booking_and_retail_master?.some((brm: any) => brm.retailed_status === 'APPROVED')
      )

      dailyTrend.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: dayLeads.length,
        qualified: dayQualified.length,
        booked: dayBooked.length,
        retailed: dayRetailed.length
      })
    }

    // Source performance ranking from your actual data
    const sourceStats = enrichedData.reduce((acc: any, lead: any) => {
      const source = lead.source || 'Unknown'
      if (!acc[source]) {
        acc[source] = { total: 0, qualified: 0 }
      }
      acc[source].total++
      if (lead.final_status === 'QUALIFIED' || lead.final_status === 'Won') {
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

    // CRE leaderboard from your actual data
    const creStats = enrichedData.reduce((acc: any, lead: any) => {
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
      if (lead.final_status === 'QUALIFIED' || lead.final_status === 'Won') acc[creName].qualified++
      
      const hasBooking = lead.qualified_leads?.some((ql: any) => ql.booking_status === 'APPROVED') ||
                        lead.booking_and_retail_master?.some((brm: any) => brm.booking_status === 'APPROVED')
      if (hasBooking) acc[creName].booked++
      
      const hasRetail = lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED') ||
                       lead.booking_and_retail_master?.some((brm: any) => brm.retailed_status === 'APPROVED')
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

    // Alerts from your actual data
    const alerts = []
    
    // Overdue follow-ups
    const overdueFollowups = enrichedData.filter((lead: any) => 
      lead.follow_up_date && 
      new Date(lead.follow_up_date) < new Date() &&
      !['QUALIFIED', 'Won', 'Lost'].includes(lead.final_status || '')
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
    console.error('Error in analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
