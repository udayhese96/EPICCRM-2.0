import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'
    const branch = searchParams.get('branch') || null
    const month = searchParams.get('month') || null

    const days = period === 'all' ? 3650 : parseInt(period) // 10 years for 'all'
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const supabase = await createClient()
    
    // Also try direct Supabase client
    const directSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get ALL data from both tables (to show complete picture of 8500+ leads)
    console.log('Fetching ALL data from lead_master and qualified_leads...')
    
    // Try different approaches to fetch lead_master data
    let allLeadMaster = []
    let leadMasterError = null
    
    try {
      // First try: Direct query without ordering
      const { data, error } = await supabase
        .from('lead_master')
        .select('*')
      
      if (error) {
        console.error('Error fetching lead_master:', error)
        leadMasterError = error
      } else {
        allLeadMaster = data || []
        console.log(`Direct query - Lead Master count: ${allLeadMaster.length}`)
      }
    } catch (err) {
      console.error('Exception fetching lead_master:', err)
      leadMasterError = err
    }
    
    // If still empty, try with different approaches
    if (allLeadMaster.length === 0) {
      try {
        // Try with direct Supabase client
        const { data, error } = await directSupabase
          .from('lead_master')
          .select('*')
        
        if (!error && data) {
          allLeadMaster = data
          console.log(`Direct client query - Lead Master count: ${allLeadMaster.length}`)
        } else {
          console.error('Direct client error:', error)
        }
      } catch (err) {
        console.error('Exception with direct client:', err)
      }
    }
    
    // If still empty, try with service role key
    if (allLeadMaster.length === 0) {
      try {
        const serviceSupabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const { data, error } = await serviceSupabase
          .from('lead_master')
          .select('*')
        
        if (!error && data) {
          allLeadMaster = data
          console.log(`Service role query - Lead Master count: ${allLeadMaster.length}`)
        } else {
          console.error('Service role error:', error)
        }
      } catch (err) {
        console.error('Exception with service role:', err)
      }
    }
    
    // Fetch other tables
    const [
      { data: allQualifiedLeads, error: qualifiedLeadsError },
      { data: allBookingRetailData, error: bookingRetailError },
      { data: allTradeInData, error: tradeInError }
    ] = await Promise.all([
      supabase
        .from('qualified_leads')
        .select('*')
        .order('created_at', { ascending: false }),
      
      supabase
        .from('booking_and_retail_master')
        .select('*'),
      
      supabase
        .from('trade_in_master')
        .select('*')
    ])
    
    console.log(`Final data counts - Lead Master: ${allLeadMaster?.length || 0}, Qualified Leads: ${allQualifiedLeads?.length || 0}`)

    // Get recent data for trend analysis (last 30 days or specified period)
    const [
      { data: recentLeadMaster },
      { data: recentQualifiedLeads }
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

    if (leadMasterError) {
      console.error('Error fetching lead_master:', leadMasterError)
    }
    if (qualifiedLeadsError) {
      console.error('Error fetching qualified_leads:', qualifiedLeadsError)
    }

    // For 'all' period, show everything regardless of date filters
    // For specific periods, apply date filtering
    let filteredAllLeadMaster, filteredAllQualifiedLeads
    
    if (period === 'all') {
      // Show ALL data when period is 'all'
      filteredAllLeadMaster = (allLeadMaster || []).filter((lead: any) => {
        const branchMatch = !branch || lead.branch === branch
        const monthMatch = month === 'all' || !month || (lead.created_at && lead.created_at.startsWith(month))
        return branchMatch && monthMatch
      })
      filteredAllQualifiedLeads = (allQualifiedLeads || []).filter((lead: any) => {
        const branchMatch = !branch || lead.branch === branch
        const monthMatch = month === 'all' || !month || (lead.created_at && lead.created_at.startsWith(month))
        return branchMatch && monthMatch
      })
    } else {
      // Apply date filtering for specific periods
      filteredAllLeadMaster = (allLeadMaster || []).filter((lead: any) => {
        const branchMatch = !branch || lead.branch === branch
        const monthMatch = month === 'all' || !month || (lead.created_at && lead.created_at.startsWith(month))
        const dateMatch = !lead.created_at || new Date(lead.created_at) >= startDate
        return branchMatch && monthMatch && dateMatch
      })
      
      filteredAllQualifiedLeads = (allQualifiedLeads || []).filter((lead: any) => {
        const branchMatch = !branch || lead.branch === branch
        const monthMatch = month === 'all' || !month || (lead.created_at && lead.created_at.startsWith(month))
        const dateMatch = !lead.created_at || new Date(lead.created_at) >= startDate
        return branchMatch && monthMatch && dateMatch
      })
    }
    
    console.log(`After filtering - Lead Master: ${filteredAllLeadMaster.length}, Qualified Leads: ${filteredAllQualifiedLeads.length}`)

    // Filter recent data by branch and month if specified
    const filteredRecentLeadMaster = (recentLeadMaster || []).filter((lead: any) => {
      const branchMatch = !branch || lead.branch === branch
      const monthMatch = !month || (lead.created_at && lead.created_at.startsWith(month))
      return branchMatch && monthMatch
    })
    
    const filteredRecentQualifiedLeads = (recentQualifiedLeads || []).filter((lead: any) => {
      const branchMatch = !branch || lead.branch === branch
      const monthMatch = !month || (lead.created_at && lead.created_at.startsWith(month))
      return branchMatch && monthMatch
    })

    // Use ALL data for overall metrics, recent data for trends
    const leadMasterToUse = filteredAllLeadMaster
    const qualifiedLeadsToUse = filteredAllQualifiedLeads
    const recentLeadMasterToUse = filteredRecentLeadMaster
    const recentQualifiedLeadsToUse = filteredRecentQualifiedLeads

    // Create lookup maps for related data
    const bookingRetailMap = new Map()
    allBookingRetailData?.forEach(item => {
      bookingRetailMap.set(item.lead_uid, item)
    })

    const tradeInMap = new Map()
    allTradeInData?.forEach(item => {
      tradeInMap.set(item.lead_uid, item)
    })

    // Combine data from both tables and remove duplicates
    // Prioritize qualified_leads as it has the most recent data (705 leads)
    const allLeads = [...qualifiedLeadsToUse, ...leadMasterToUse]
    
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

    // Always use the full dataset for comprehensive analytics
    // Prioritize qualified_leads as it has the most recent and complete data
    const finalDataToUse = [
      ...(filteredAllQualifiedLeads || []).map((lead: any) => ({
        ...lead,
        booking_and_retail_master: bookingRetailMap.get(lead.lead_uid || lead.uid) ? [bookingRetailMap.get(lead.lead_uid || lead.uid)] : [],
        trade_in_master: tradeInMap.get(lead.lead_uid || lead.uid) ? [tradeInMap.get(lead.lead_uid || lead.uid)] : []
      })),
      ...(filteredAllLeadMaster || []).map((lead: any) => ({
        ...lead,
        booking_and_retail_master: bookingRetailMap.get(lead.lead_uid || lead.uid) ? [bookingRetailMap.get(lead.lead_uid || lead.uid)] : [],
        trade_in_master: tradeInMap.get(lead.lead_uid || lead.uid) ? [tradeInMap.get(lead.lead_uid || lead.uid)] : []
      }))
    ].reduce((acc: any[], lead: any) => {
      const key = lead.lead_uid || lead.uid
      if (!acc.find(l => (l.lead_uid || l.uid) === key)) {
        acc.push(lead)
      }
      return acc
    }, [])

    // Dynamically extract all status values from the data
    const statusAnalysis = {
      finalStatuses: [...new Set(finalDataToUse.map(lead => lead.final_status).filter(Boolean))],
      leadStatuses: [...new Set(finalDataToUse.map(lead => lead.lead_status).filter(Boolean))],
      leadCategories: [...new Set(finalDataToUse.map(lead => lead.lead_category).filter(Boolean))],
      bookingStatuses: [...new Set(finalDataToUse.map(lead => lead.booking_status).filter(Boolean))],
      retailStatuses: [...new Set(finalDataToUse.map(lead => lead.retailed_status).filter(Boolean))],
      bookingRetailStatuses: [...new Set(allBookingRetailData?.map(item => item.booking_status).filter(Boolean) || [])],
      bookingRetailRetailStatuses: [...new Set(allBookingRetailData?.map(item => item.retailed_status).filter(Boolean) || [])]
    }

    console.log(`Raw data counts - Lead Master: ${allLeadMaster?.length || 0}, Qualified Leads: ${allQualifiedLeads?.length || 0}`)
    console.log(`After filtering - Lead Master: ${filteredAllLeadMaster.length}, Qualified Leads: ${filteredAllQualifiedLeads.length}`)
    console.log(`Final data to use: ${finalDataToUse.length} total records`)
    console.log(`Found ${allBookingRetailData?.length || 0} booking/retail records`)
    console.log(`Found ${allTradeInData?.length || 0} trade-in records`)
    console.log('Dynamic Status Analysis:', statusAnalysis)

    // Real-time metrics
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substring(0, 7)

    const todayLeads = finalDataToUse.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(today)
    ).length

    // If month filter is 'all', surface the full dataset size in the UI via totalRecords.
    // Keep monthlyLeads as current-month for KPI accuracy.
    const monthlyLeads = finalDataToUse.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(thisMonth)
    ).length

    // Dynamic qualified leads detection - LEAD_STATUS should be 'qualified'
    const qualifiedLeads = finalDataToUse.filter((lead: any) => {
      const leadStatus = lead.lead_status
      
      // Check if lead_status indicates qualification
      return (
        leadStatus && (
          leadStatus.toLowerCase().includes('qualified') ||
          leadStatus === 'QUALIFIED' ||
          leadStatus === 'Qualified'
        )
      )
    }).length

    const monthlyConversionRate = monthlyLeads > 0 
      ? (qualifiedLeads / monthlyLeads) * 100 
      : 0

    const activeCREs = new Set(
      finalDataToUse
        .filter((lead: any) => lead.cre_name)
        .map((lead: any) => lead.cre_name)
    ).size

    // Dynamic retail detection - check booking_and_retail_master table
    const retailedLeads = finalDataToUse.filter((lead: any) => {
      const bookingRetail = lead.booking_and_retail_master?.[0]
      
      return (
        bookingRetail && bookingRetail.retailed_status && (
          bookingRetail.retailed_status.toLowerCase().includes('approved') ||
          bookingRetail.retailed_status.toLowerCase().includes('retailed') ||
          bookingRetail.retailed_status.toLowerCase().includes('won') ||
          bookingRetail.retailed_status === 'APPROVED' ||
          bookingRetail.retailed_status === 'Retailed' ||
          bookingRetail.retailed_status === 'Won'
        )
      )
    }).length

    const projectedRevenue = retailedLeads * 1000000 // 10 lakhs per retail

    // Daily trend data (use recent data for trends)
    const recentDataToUse = [...recentQualifiedLeadsToUse, ...recentLeadMasterToUse].reduce((acc: any[], lead: any) => {
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

    const dailyTrend = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayLeads = recentDataToUse.filter((lead: any) => lead.created_at && lead.created_at.startsWith(dateStr))
      
      const dayQualified = dayLeads.filter((lead: any) => {
        const leadStatus = lead.lead_status
        
        return (
          leadStatus && (
            leadStatus.toLowerCase().includes('qualified') ||
            leadStatus === 'QUALIFIED' ||
            leadStatus === 'Qualified'
          )
        )
      })
      
      const dayBooked = dayLeads.filter((lead: any) => {
        const bookingRetail = lead.booking_and_retail_master?.[0]
        return (
          bookingRetail && bookingRetail.booking_status && (
            bookingRetail.booking_status.toLowerCase().includes('approved') ||
            bookingRetail.booking_status.toLowerCase().includes('booked') ||
            bookingRetail.booking_status === 'APPROVED' ||
            bookingRetail.booking_status === 'Booked'
          )
        )
      })
      
      const dayRetailed = dayLeads.filter((lead: any) => {
        const bookingRetail = lead.booking_and_retail_master?.[0]
        return (
          bookingRetail && bookingRetail.retailed_status && (
            bookingRetail.retailed_status.toLowerCase().includes('approved') ||
            bookingRetail.retailed_status.toLowerCase().includes('retailed') ||
            bookingRetail.retailed_status.toLowerCase().includes('won') ||
            bookingRetail.retailed_status === 'APPROVED' ||
            bookingRetail.retailed_status === 'Retailed' ||
            bookingRetail.retailed_status === 'Won'
          )
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

    // Source performance ranking with CRE breakdown
    const sourceStats = finalDataToUse.reduce((acc: any, lead: any) => {
      const source = lead.source || 'Unknown'
      const creName = lead.cre_name || 'Unknown'
      
      if (!acc[source]) {
        acc[source] = { 
          total: 0, 
          qualified: 0, 
          booked: 0, 
          retailed: 0,
          cres: {} 
        }
      }
      
      if (!acc[source].cres[creName]) {
        acc[source].cres[creName] = {
          total: 0,
          qualified: 0,
          booked: 0,
          retailed: 0,
          branch: lead.branch
        }
      }
      
      acc[source].total++
      acc[source].cres[creName].total++
      
      const leadStatus = lead.lead_status
      
      const isQualified = (
        leadStatus && (
          leadStatus.toLowerCase().includes('qualified') ||
          leadStatus === 'QUALIFIED' ||
          leadStatus === 'Qualified'
        )
      )
      
      if (isQualified) {
        acc[source].qualified++
        acc[source].cres[creName].qualified++
      }
      
      const hasBooking = (
        lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].booking_status && (
          lead.booking_and_retail_master[0].booking_status.toLowerCase().includes('approved') ||
          lead.booking_and_retail_master[0].booking_status.toLowerCase().includes('booked') ||
          lead.booking_and_retail_master[0].booking_status === 'APPROVED' ||
          lead.booking_and_retail_master[0].booking_status === 'Booked'
        )
      )
      if (hasBooking) {
        acc[source].booked++
        acc[source].cres[creName].booked++
      }
      
      const hasRetail = (
        lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].retailed_status && (
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('approved') ||
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('retailed') ||
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('won') ||
          lead.booking_and_retail_master[0].retailed_status === 'APPROVED' ||
          lead.booking_and_retail_master[0].retailed_status === 'Retailed' ||
          lead.booking_and_retail_master[0].retailed_status === 'Won'
        )
      )
      if (hasRetail) {
        acc[source].retailed++
        acc[source].cres[creName].retailed++
      }
      
      return acc
    }, {})

    const sourcePerformance = Object.entries(sourceStats)
      .map(([source, stats]: [string, any]) => ({
        source,
        total: stats.total,
        qualified: stats.qualified,
        booked: stats.booked,
        retailed: stats.retailed,
        conversionRate: stats.total > 0 ? (stats.qualified / stats.total) * 100 : 0,
        bookingRate: stats.total > 0 ? (stats.booked / stats.total) * 100 : 0,
        retailRate: stats.total > 0 ? (stats.retailed / stats.total) * 100 : 0,
        cres: Object.entries(stats.cres).map(([creName, creStats]: [string, any]) => ({
          creName,
          branch: creStats.branch,
          total: creStats.total,
          qualified: creStats.qualified,
          booked: creStats.booked,
          retailed: creStats.retailed,
          conversionRate: creStats.total > 0 ? (creStats.qualified / creStats.total) * 100 : 0
        })).sort((a, b) => b.conversionRate - a.conversionRate)
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)

    // CRE leaderboard
    const creStats = finalDataToUse.reduce((acc: any, lead: any) => {
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
      
      const finalStatus = lead.final_status
      const leadStatus = lead.lead_status
      const leadCategory = lead.lead_category
      
      if (
        (finalStatus && (
          finalStatus.toLowerCase().includes('qualified') ||
          finalStatus.toLowerCase().includes('won') ||
          finalStatus.toLowerCase().includes('hot')
        )) ||
        (leadStatus && (
          leadStatus.toLowerCase().includes('qualified') ||
          leadStatus.toLowerCase().includes('won') ||
          leadStatus.toLowerCase().includes('hot')
        )) ||
        (leadCategory && leadCategory.toLowerCase().includes('hot'))
      ) {
        acc[creName].qualified++
      }
      
      const hasBooking = (
        lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].booking_status && (
          lead.booking_and_retail_master[0].booking_status.toLowerCase().includes('approved') ||
          lead.booking_and_retail_master[0].booking_status.toLowerCase().includes('booked') ||
          lead.booking_and_retail_master[0].booking_status === 'APPROVED' ||
          lead.booking_and_retail_master[0].booking_status === 'Booked'
        )
      )
      if (hasBooking) acc[creName].booked++
      
      const hasRetail = (
        lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].retailed_status && (
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('approved') ||
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('retailed') ||
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('won') ||
          lead.booking_and_retail_master[0].retailed_status === 'APPROVED' ||
          lead.booking_and_retail_master[0].retailed_status === 'Retailed' ||
          lead.booking_and_retail_master[0].retailed_status === 'Won'
        )
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

    // MTD (Month-to-Date) Reports
    const currentMonth = new Date().toISOString().substring(0, 7)
    const mtdData = finalDataToUse.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(currentMonth)
    )

    const mtdMetrics = {
      totalLeads: mtdData.length,
      qualifiedLeads: mtdData.filter((lead: any) => {
        const finalStatus = lead.final_status
        const leadStatus = lead.lead_status
        const leadCategory = lead.lead_category
        return (
          (finalStatus && (
            finalStatus.toLowerCase().includes('qualified') ||
            finalStatus.toLowerCase().includes('won') ||
            finalStatus.toLowerCase().includes('hot')
          )) ||
          (leadStatus && (
            leadStatus.toLowerCase().includes('qualified') ||
            leadStatus.toLowerCase().includes('won') ||
            leadStatus.toLowerCase().includes('hot')
          )) ||
          (leadCategory && leadCategory.toLowerCase().includes('hot'))
        )
      }).length,
      bookedLeads: mtdData.filter((lead: any) => {
        const hasBooking = (
          (lead.booking_status && lead.booking_status.toLowerCase().includes('approved')) ||
          (lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].booking_status?.toLowerCase().includes('approved'))
        )
        return hasBooking
      }).length,
      retailedLeads: mtdData.filter((lead: any) => {
        const hasRetail = (
          (lead.retailed_status && lead.retailed_status.toLowerCase().includes('approved')) ||
          (lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].retailed_status?.toLowerCase().includes('approved'))
        )
        return hasRetail
      }).length,
      conversionRate: mtdData.length > 0 ? (mtdData.filter((lead: any) => {
        const finalStatus = lead.final_status
        const leadStatus = lead.lead_status
        const leadCategory = lead.lead_category
        return (
          (finalStatus && (
            finalStatus.toLowerCase().includes('qualified') ||
            finalStatus.toLowerCase().includes('won') ||
            finalStatus.toLowerCase().includes('hot')
          )) ||
          (leadStatus && (
            leadStatus.toLowerCase().includes('qualified') ||
            leadStatus.toLowerCase().includes('won') ||
            leadStatus.toLowerCase().includes('hot')
          )) ||
          (leadCategory && leadCategory.toLowerCase().includes('hot'))
        )
      }).length / mtdData.length) * 100 : 0
    }

    // MTD Source Performance
    const mtdSourceStats = mtdData.reduce((acc: any, lead: any) => {
      const source = lead.source || 'Unknown'
      if (!acc[source]) {
        acc[source] = { total: 0, qualified: 0, booked: 0, retailed: 0 }
      }
      acc[source].total++
      
      const leadStatus = lead.lead_status
      
      const isQualified = (
        leadStatus && (
          leadStatus.toLowerCase().includes('qualified') ||
          leadStatus === 'QUALIFIED' ||
          leadStatus === 'Qualified'
        )
      )
      
      if (isQualified) acc[source].qualified++
      
      const hasBooking = (
        lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].booking_status && (
          lead.booking_and_retail_master[0].booking_status.toLowerCase().includes('approved') ||
          lead.booking_and_retail_master[0].booking_status.toLowerCase().includes('booked') ||
          lead.booking_and_retail_master[0].booking_status === 'APPROVED' ||
          lead.booking_and_retail_master[0].booking_status === 'Booked'
        )
      )
      if (hasBooking) acc[source].booked++
      
      const hasRetail = (
        lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].retailed_status && (
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('approved') ||
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('retailed') ||
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('won') ||
          lead.booking_and_retail_master[0].retailed_status === 'APPROVED' ||
          lead.booking_and_retail_master[0].retailed_status === 'Retailed' ||
          lead.booking_and_retail_master[0].retailed_status === 'Won'
        )
      )
      if (hasRetail) acc[source].retailed++
      
      return acc
    }, {})

    const mtdSourcePerformance = Object.entries(mtdSourceStats)
      .map(([source, stats]: [string, any]) => ({
        source,
        total: stats.total,
        qualified: stats.qualified,
        booked: stats.booked,
        retailed: stats.retailed,
        conversionRate: stats.total > 0 ? (stats.qualified / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)

    // MTD CRE Performance
    const mtdCreStats = mtdData.reduce((acc: any, lead: any) => {
      const creName = lead.cre_name || 'Unknown'
      if (!acc[creName]) {
        acc[creName] = { total: 0, qualified: 0, booked: 0, retailed: 0, branch: lead.branch }
      }
      acc[creName].total++
      
      const leadStatus = lead.lead_status
      
      const isQualified = (
        leadStatus && (
          leadStatus.toLowerCase().includes('qualified') ||
          leadStatus === 'QUALIFIED' ||
          leadStatus === 'Qualified'
        )
      )
      
      if (isQualified) acc[creName].qualified++
      
      const hasBooking = (
        lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].booking_status && (
          lead.booking_and_retail_master[0].booking_status.toLowerCase().includes('approved') ||
          lead.booking_and_retail_master[0].booking_status.toLowerCase().includes('booked') ||
          lead.booking_and_retail_master[0].booking_status === 'APPROVED' ||
          lead.booking_and_retail_master[0].booking_status === 'Booked'
        )
      )
      if (hasBooking) acc[creName].booked++
      
      const hasRetail = (
        lead.booking_and_retail_master?.[0] && lead.booking_and_retail_master[0].retailed_status && (
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('approved') ||
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('retailed') ||
          lead.booking_and_retail_master[0].retailed_status.toLowerCase().includes('won') ||
          lead.booking_and_retail_master[0].retailed_status === 'APPROVED' ||
          lead.booking_and_retail_master[0].retailed_status === 'Retailed' ||
          lead.booking_and_retail_master[0].retailed_status === 'Won'
        )
      )
      if (hasRetail) acc[creName].retailed++
      
      return acc
    }, {})

    const mtdCrePerformance = Object.entries(mtdCreStats)
      .map(([creName, stats]: [string, any]) => ({
        creName,
        branch: stats.branch,
        total: stats.total,
        qualified: stats.qualified,
        booked: stats.booked,
        retailed: stats.retailed,
        conversionRate: stats.total > 0 ? (stats.qualified / stats.total) * 100 : 0,
        performanceScore: (
          stats.qualified * 5 +
          stats.booked * 10 +
          stats.retailed * 20
        ) / Math.max(stats.total, 1)
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)

    // Alerts
    const alerts = []
    
    // Overdue follow-ups
    const overdueFollowups = finalDataToUse.filter((lead: any) => 
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
      // MTD Reports
      mtdMetrics,
      mtdSourcePerformance,
      mtdCrePerformance,
      dataSource: 'lead_master + qualified_leads (dynamic status detection)',
      totalRecords: finalDataToUse.length,
      statusAnalysis,
      debug: {
        leadMasterCount: leadMasterToUse.length,
        qualifiedLeadsCount: qualifiedLeadsToUse.length,
        uniqueLeadsCount: finalDataToUse.length,
        qualifiedCount: qualifiedLeads,
        retailedCount: retailedLeads,
        allStatusesFound: statusAnalysis
      }
    })

  } catch (error) {
    console.error('Error in dynamic status analytics:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}
