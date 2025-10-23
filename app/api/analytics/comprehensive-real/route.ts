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

    const supabase = await createClient()

    // Get data from both lead_master and qualified_leads tables
    const [
      { data: leadMasterData, error: leadMasterError },
      { data: qualifiedLeadsData, error: qualifiedLeadsError },
      { data: bookingRetailData, error: bookingRetailError },
      { data: tradeInData, error: tradeInError }
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
        .order('created_at', { ascending: false }),
      
      supabase
        .from('booking_and_retail_master')
        .select('*')
        .gte('created_at', startDate.toISOString()),
      
      supabase
        .from('trade_in_master')
        .select('*')
        .gte('created_at', startDate.toISOString())
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
    const allLeads = [...filteredQualifiedLeads, ...filteredLeadMaster]
    
    // Remove duplicates based on lead_uid or uid
    const uniqueLeads = allLeads.reduce((acc: any[], lead: any) => {
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

    console.log(`Found ${filteredLeadMaster.length} leads from lead_master`)
    console.log(`Found ${filteredQualifiedLeads.length} leads from qualified_leads`)
    console.log(`Combined unique leads: ${uniqueLeads.length}`)

    // Real-time metrics
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substring(0, 7)

    const todayLeads = uniqueLeads.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(today)
    ).length

    const monthlyLeads = uniqueLeads.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(thisMonth)
    ).length

    // Check for various status values that might be used
    const qualifiedLeads = uniqueLeads.filter((lead: any) => {
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
      uniqueLeads
        .filter((lead: any) => lead.cre_name)
        .map((lead: any) => lead.cre_name)
    ).size

    // Check for retail status in various formats
    const retailedLeads = uniqueLeads.filter((lead: any) => {
      const retailStatus = lead.retailed_status
      const bookingRetail = lead.booking_and_retail_master?.[0]
      
      return (
        (retailStatus && (
          retailStatus.toLowerCase().includes('approved') ||
          retailStatus.toLowerCase().includes('retailed') ||
          retailStatus === 'APPROVED'
        )) ||
        (bookingRetail && (
          bookingRetail.retailed_status?.toLowerCase().includes('approved') ||
          bookingRetail.retailed_status?.toLowerCase().includes('retailed')
        ))
      )
    }).length

    const projectedRevenue = retailedLeads * 1000000 // 10 lakhs per retail

    // Daily trend data
    const dailyTrend = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayLeads = uniqueLeads.filter((lead: any) => lead.created_at && lead.created_at.startsWith(dateStr))
      const dayQualified = dayLeads.filter((lead: any) => {
        const status = lead.final_status || lead.lead_status
        return status && (
          status.toLowerCase().includes('qualified') ||
          status.toLowerCase().includes('won') ||
          status.toLowerCase().includes('hot')
        )
      })
      
      const dayBooked = dayLeads.filter((lead: any) => {
        const bookingStatus = lead.booking_status
        const bookingRetail = lead.booking_and_retail_master?.[0]
        return (
          (bookingStatus && bookingStatus.toLowerCase().includes('approved')) ||
          (bookingRetail && bookingRetail.booking_status?.toLowerCase().includes('approved'))
        )
      })
      
      const dayRetailed = dayLeads.filter((lead: any) => {
        const retailStatus = lead.retailed_status
        const bookingRetail = lead.booking_and_retail_master?.[0]
        return (
          (retailStatus && retailStatus.toLowerCase().includes('approved')) ||
          (bookingRetail && bookingRetail.retailed_status?.toLowerCase().includes('approved'))
        )
      })

      dailyTrend.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: dayLeads.length,
        qualified: dayQualified.length,
        booked: dayBooked.length,
        retailed: dayRetailed.length
      })
    }

    // Source performance ranking
    const sourceStats = uniqueLeads.reduce((acc: any, lead: any) => {
      const source = lead.source || 'Unknown'
      if (!acc[source]) {
        acc[source] = { total: 0, qualified: 0 }
      }
      acc[source].total++
      
      const status = lead.final_status || lead.lead_status
      if (status && (
        status.toLowerCase().includes('qualified') ||
        status.toLowerCase().includes('won') ||
        status.toLowerCase().includes('hot')
      )) {
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
    const creStats = uniqueLeads.reduce((acc: any, lead: any) => {
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
      
      const status = lead.final_status || lead.lead_status
      if (status && (
        status.toLowerCase().includes('qualified') ||
        status.toLowerCase().includes('won') ||
        status.toLowerCase().includes('hot')
      )) {
        acc[creName].qualified++
      }
      
      const hasBooking = (
        (lead.booking_status && lead.booking_status.toLowerCase().includes('approved')) ||
        (lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].booking_status?.toLowerCase().includes('approved'))
      )
      if (hasBooking) acc[creName].booked++
      
      const hasRetail = (
        (lead.retailed_status && lead.retailed_status.toLowerCase().includes('approved')) ||
        (lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].retailed_status?.toLowerCase().includes('approved'))
      )
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
    const overdueFollowups = uniqueLeads.filter((lead: any) => 
      lead.follow_up_date && 
      new Date(lead.follow_up_date) < new Date() &&
      !lead.final_status?.toLowerCase().includes('won') &&
      !lead.final_status?.toLowerCase().includes('lost')
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
      alerts,
      dataSource: 'lead_master + qualified_leads',
      totalRecords: uniqueLeads.length,
      debug: {
        leadMasterCount: filteredLeadMaster.length,
        qualifiedLeadsCount: filteredQualifiedLeads.length,
        uniqueLeadsCount: uniqueLeads.length,
        qualifiedCount: qualifiedLeads,
        retailedCount: retailedLeads
      }
    })

  } catch (error) {
    console.error('Error in comprehensive real analytics:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}


