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

    // Use qualified_leads as primary source since it has data
    let query = supabase
      .from('qualified_leads')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (branch) {
      query = query.eq('branch', branch)
    }

    const { data: qualifiedLeads, error: qualifiedLeadsError } = await query

    if (qualifiedLeadsError) {
      console.error('Error fetching qualified leads:', qualifiedLeadsError)
      return NextResponse.json({ error: 'Failed to fetch qualified leads data', details: qualifiedLeadsError }, { status: 500 })
    }

    // Also get all qualified leads if filtered query returns empty
    const { data: allQualifiedLeads } = await supabase
      .from('qualified_leads')
      .select('*')
      .limit(100)
      .order('created_at', { ascending: false })

    // Get booking and retail data
    const { data: bookingRetailData } = await supabase
      .from('booking_and_retail_master')
      .select('*')
      .gte('created_at', startDate.toISOString())

    // Get trade-in data
    const { data: tradeInData } = await supabase
      .from('trade_in_master')
      .select('*')
      .gte('created_at', startDate.toISOString())

    console.log(`Found ${qualifiedLeads?.length || 0} qualified leads for period ${days} days`)
    console.log(`Found ${allQualifiedLeads?.length || 0} total qualified leads`)
    console.log(`Found ${bookingRetailData?.length || 0} booking/retail records`)
    console.log(`Found ${tradeInData?.length || 0} trade-in records`)

    // Use filtered data if available, otherwise use all data
    const dataToUse = qualifiedLeads && qualifiedLeads.length > 0 ? qualifiedLeads : (allQualifiedLeads || [])

    // Create lookup maps for related data
    const bookingRetailMap = new Map()
    bookingRetailData?.forEach(item => {
      bookingRetailMap.set(item.lead_uid, item)
    })

    const tradeInMap = new Map()
    tradeInData?.forEach(item => {
      tradeInMap.set(item.lead_uid, item)
    })

    // Enrich data with related information
    const enrichedData = dataToUse.map(lead => ({
      ...lead,
      booking_and_retail_master: bookingRetailMap.get(lead.lead_uid) ? [bookingRetailMap.get(lead.lead_uid)] : [],
      trade_in_master: tradeInMap.get(lead.lead_uid) ? [tradeInMap.get(lead.lead_uid)] : []
    }))

    // Real-time metrics
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substring(0, 7)

    const todayLeads = enrichedData.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(today)
    ).length

    const monthlyLeads = enrichedData.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(thisMonth)
    ).length

    const qualifiedLeadsCount = enrichedData.filter((lead: any) => 
      lead.final_status === 'QUALIFIED' || lead.final_status === 'Won'
    ).length

    const monthlyConversionRate = monthlyLeads > 0 
      ? (qualifiedLeadsCount / monthlyLeads) * 100 
      : 0

    const activeCREs = new Set(
      enrichedData
        .filter((lead: any) => lead.cre_name)
        .map((lead: any) => lead.cre_name)
    ).size

    const retailedLeads = enrichedData.filter((lead: any) => 
      lead.retailed_status === 'APPROVED' ||
      lead.booking_and_retail_master?.some((brm: any) => brm.retailed_status === 'APPROVED')
    ).length

    const projectedRevenue = retailedLeads * 1000000 // 10 lakhs per retail

    // Daily trend data
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
        lead.booking_status === 'APPROVED' ||
        lead.booking_and_retail_master?.some((brm: any) => brm.booking_status === 'APPROVED')
      )
      const dayRetailed = dayLeads.filter((lead: any) => 
        lead.retailed_status === 'APPROVED' ||
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

    // Source performance ranking
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

    // CRE leaderboard
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
      
      const hasBooking = lead.booking_status === 'APPROVED' ||
                        lead.booking_and_retail_master?.some((brm: any) => brm.booking_status === 'APPROVED')
      if (hasBooking) acc[creName].booked++
      
      const hasRetail = lead.retailed_status === 'APPROVED' ||
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

    // Alerts
    const alerts = []
    
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
      dataSource: 'qualified_leads',
      totalRecords: dataToUse.length
    })

  } catch (error) {
    console.error('Error in working analytics:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}

