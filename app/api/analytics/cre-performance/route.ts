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

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'
    const branch = searchParams.get('branch') || null
    const creName = searchParams.get('cre_name') || null

    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build query
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

    if (creName) {
      leadQuery = leadQuery.eq('cre_name', creName)
    }

    const { data: leads, error: leadsError } = await leadQuery

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads data' }, { status: 500 })
    }

    // CRE Performance Overview
    const creStats = leads.reduce((acc: any, lead) => {
      const creName = lead.cre_name || 'Unknown'
      
      if (!acc[creName]) {
        acc[creName] = {
          total_leads_assigned: 0,
          leads_contacted: 0,
          qualified_leads: 0,
          booked_leads: 0,
          retailed_leads: 0,
          lost_leads: 0,
          active_leads: 0,
          branch: lead.branch,
          response_times: [],
          touchpoints: [],
          test_drives: 0,
          test_drives_converted: 0
        }
      }

      acc[creName].total_leads_assigned++
      
      if (lead.first_call_date) {
        acc[creName].leads_contacted++
        
        // Calculate response time
        if (lead.cre_assigned_at && lead.first_call_date) {
          const responseTime = (new Date(lead.first_call_date).getTime() - new Date(lead.cre_assigned_at).getTime()) / (1000 * 60 * 60)
          acc[creName].response_times.push(responseTime)
        }
      }
      
      if (lead.final_status === 'QUALIFIED') {
        acc[creName].qualified_leads++
      } else if (lead.final_status === 'LOST') {
        acc[creName].lost_leads++
      } else if (['PENDING', 'FOLLOW_UP'].includes(lead.lead_status || '')) {
        acc[creName].active_leads++
      }

      if (lead.qualified_leads?.some((ql: any) => ql.booking_status === 'APPROVED')) {
        acc[creName].booked_leads++
      }

      if (lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED')) {
        acc[creName].retailed_leads++
      }

      // Calculate touchpoints
      let touchpoints = 0
      if (lead.first_call_date) touchpoints++
      if (lead.second_call_date) touchpoints++
      if (lead.third_call_date) touchpoints++
      if (lead.fourth_call_date) touchpoints++
      if (lead.fifth_call_date) touchpoints++
      if (lead.sixth_call_date) touchpoints++
      acc[creName].touchpoints.push(touchpoints)

      // Test drive metrics
      if (lead.test_drive_type) {
        acc[creName].test_drives++
        if (lead.final_status === 'QUALIFIED') {
          acc[creName].test_drives_converted++
        }
      }

      return acc
    }, {})

    const crePerformance = Object.entries(creStats).map(([creName, stats]: [string, any]) => {
      const contactRate = stats.total_leads_assigned > 0 
        ? (stats.leads_contacted / stats.total_leads_assigned) * 100 
        : 0
      
      const qualificationRate = stats.total_leads_assigned > 0 
        ? (stats.qualified_leads / stats.total_leads_assigned) * 100 
        : 0
      
      const bookingConversionRate = stats.qualified_leads > 0 
        ? (stats.booked_leads / stats.qualified_leads) * 100 
        : 0
      
      const retailConversionRate = stats.booked_leads > 0 
        ? (stats.retailed_leads / stats.booked_leads) * 100 
        : 0
      
      const overallConversionRate = stats.total_leads_assigned > 0 
        ? (stats.retailed_leads / stats.total_leads_assigned) * 100 
        : 0

      const avgResponseTime = stats.response_times.length > 0 
        ? stats.response_times.reduce((sum: number, time: number) => sum + time, 0) / stats.response_times.length 
        : 0

      const avgTouchpoints = stats.touchpoints.length > 0 
        ? stats.touchpoints.reduce((sum: number, touches: number) => sum + touches, 0) / stats.touchpoints.length 
        : 0

      const testDriveConversionRate = stats.test_drives > 0 
        ? (stats.test_drives_converted / stats.test_drives) * 100 
        : 0

      const performanceScore = Math.round(
        ((stats.qualified_leads * 5 + stats.booked_leads * 10 + stats.retailed_leads * 20) / 
        Math.max(stats.total_leads_assigned, 1)) * 100
      ) / 100

      return {
        cre_name: creName,
        branch: stats.branch,
        total_leads_assigned: stats.total_leads_assigned,
        leads_contacted: stats.leads_contacted,
        qualified_leads: stats.qualified_leads,
        booked_leads: stats.booked_leads,
        retailed_leads: stats.retailed_leads,
        lost_leads: stats.lost_leads,
        active_leads: stats.active_leads,
        contact_rate: Math.round(contactRate * 100) / 100,
        qualification_rate: Math.round(qualificationRate * 100) / 100,
        booking_conversion_rate: Math.round(bookingConversionRate * 100) / 100,
        retail_conversion_rate: Math.round(retailConversionRate * 100) / 100,
        overall_conversion_rate: Math.round(overallConversionRate * 100) / 100,
        avg_response_time_hours: Math.round(avgResponseTime * 100) / 100,
        avg_touchpoints: Math.round(avgTouchpoints * 100) / 100,
        test_drives_conducted: stats.test_drives,
        test_drive_conversion_rate: Math.round(testDriveConversionRate * 100) / 100,
        cre_performance_score: performanceScore
      }
    }).sort((a, b) => b.cre_performance_score - a.cre_performance_score)

    // Source-wise performance
    const sourceStats = leads.reduce((acc: any, lead) => {
      const source = lead.source || 'Unknown'
      const creName = lead.cre_name || 'Unknown'
      
      if (!acc[creName]) acc[creName] = {}
      if (!acc[creName][source]) {
        acc[creName][source] = {
          leads_received: 0,
          qualified: 0,
          lost: 0,
          response_times: [],
          closure_days: []
        }
      }

      acc[creName][source].leads_received++
      
      if (lead.final_status === 'QUALIFIED') {
        acc[creName][source].qualified++
      } else if (lead.final_status === 'LOST') {
        acc[creName][source].lost++
      }

      // Response time
      if (lead.cre_assigned_at && lead.first_call_date) {
        const responseTime = (new Date(lead.first_call_date).getTime() - new Date(lead.cre_assigned_at).getTime()) / (1000 * 60 * 60)
        acc[creName][source].response_times.push(responseTime)
      }

      // Closure time
      if (lead.won_timestamp && lead.cre_assigned_at) {
        const closureDays = (new Date(lead.won_timestamp).getTime() - new Date(lead.cre_assigned_at).getTime()) / (1000 * 60 * 60 * 24)
        acc[creName][source].closure_days.push(closureDays)
      }

      return acc
    }, {})

    const sourcePerformance = Object.entries(sourceStats).map(([creName, sources]: [string, any]) => {
      return Object.entries(sources).map(([source, stats]: [string, any]) => ({
        cre_name: creName,
        source,
        leads_received: stats.leads_received,
        qualified: stats.qualified,
        lost: stats.lost,
        conversion_rate: stats.leads_received > 0 
          ? Math.round((stats.qualified / stats.leads_received) * 10000) / 100 
          : 0,
        avg_response_hours: stats.response_times.length > 0 
          ? Math.round((stats.response_times.reduce((sum: number, time: number) => sum + time, 0) / stats.response_times.length) * 100) / 100 
          : 0,
        avg_closure_days: stats.closure_days.length > 0 
          ? Math.round((stats.closure_days.reduce((sum: number, days: number) => sum + days, 0) / stats.closure_days.length) * 100) / 100 
          : 0
      }))
    }).flat().sort((a, b) => b.conversion_rate - a.conversion_rate)

    return NextResponse.json({
      crePerformance,
      sourcePerformance
    })

  } catch (error) {
    console.error('Error in CRE performance analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

