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
    const psName = searchParams.get('ps_name') || null

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

    if (psName) {
      leadQuery = leadQuery.eq('ps_name', psName)
    }

    const { data: leads, error: leadsError } = await leadQuery

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads data' }, { status: 500 })
    }

    // PS Performance Scorecard
    const psStats = leads.reduce((acc: any, lead) => {
      const psName = lead.ps_name || 'Unknown'
      
      if (!acc[psName]) {
        acc[psName] = {
          total_leads_generated: 0,
          leads_assigned_to_cre: 0,
          qualified_leads: 0,
          booked_leads: 0,
          retailed_leads: 0,
          branch: lead.branch
        }
      }

      acc[psName].total_leads_generated++
      
      if (lead.assigned === 'Yes') {
        acc[psName].leads_assigned_to_cre++
      }
      
      if (lead.final_status === 'QUALIFIED') {
        acc[psName].qualified_leads++
      }

      if (lead.qualified_leads?.some((ql: any) => ql.booking_status === 'APPROVED')) {
        acc[psName].booked_leads++
      }

      if (lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED')) {
        acc[psName].retailed_leads++
      }

      return acc
    }, {})

    const psPerformance = Object.entries(psStats).map(([psName, stats]: [string, any]) => {
      const qualificationRate = stats.total_leads_generated > 0 
        ? (stats.qualified_leads / stats.total_leads_generated) * 100 
        : 0
      
      const retailConversion = stats.total_leads_generated > 0 
        ? (stats.retailed_leads / stats.total_leads_generated) * 100 
        : 0
      
      const assignmentRate = stats.total_leads_generated > 0 
        ? (stats.leads_assigned_to_cre / stats.total_leads_generated) * 100 
        : 0

      return {
        ps_name: psName,
        branch: stats.branch,
        total_leads_generated: stats.total_leads_generated,
        leads_assigned_to_cre: stats.leads_assigned_to_cre,
        qualified_leads: stats.qualified_leads,
        booked_leads: stats.booked_leads,
        retailed_leads: stats.retailed_leads,
        ps_qualification_rate: Math.round(qualificationRate * 100) / 100,
        ps_to_retail_conversion: Math.round(retailConversion * 100) / 100,
        assignment_rate: Math.round(assignmentRate * 100) / 100
      }
    }).sort((a, b) => b.ps_to_retail_conversion - a.ps_to_retail_conversion)

    // Source performance analysis
    const sourceStats = leads.reduce((acc: any, lead) => {
      const source = lead.source || 'Unknown'
      const psName = lead.ps_name || 'Unknown'
      
      if (!acc[psName]) acc[psName] = {}
      if (!acc[psName][source]) {
        acc[psName][source] = {
          total_leads: 0,
          leads_contacted: 0,
          test_drives_taken: 0,
          qualified: 0,
          lost: 0
        }
      }

      acc[psName][source].total_leads++
      
      if (lead.first_call_date) {
        acc[psName][source].leads_contacted++
      }
      
      if (lead.test_drive_type) {
        acc[psName][source].test_drives_taken++
      }
      
      if (lead.final_status === 'QUALIFIED') {
        acc[psName][source].qualified++
      } else if (lead.final_status === 'LOST') {
        acc[psName][source].lost++
      }

      return acc
    }, {})

    const sourcePerformance = Object.entries(sourceStats).map(([psName, sources]: [string, any]) => {
      return Object.entries(sources).map(([source, stats]: [string, any]) => ({
        ps_name: psName,
        source,
        total_leads: stats.total_leads,
        leads_contacted: stats.leads_contacted,
        test_drives_taken: stats.test_drives_taken,
        qualified: stats.qualified,
        lost: stats.lost,
        source_conversion_rate: stats.total_leads > 0 
          ? Math.round((stats.qualified / stats.total_leads) * 10000) / 100 
          : 0,
        engagement_rate: stats.total_leads > 0 
          ? Math.round((stats.leads_contacted / stats.total_leads) * 10000) / 100 
          : 0
      }))
    }).flat().sort((a, b) => b.source_conversion_rate - a.source_conversion_rate)

    // Lead handoff quality
    const handoffQuality = leads.reduce((acc: any, lead) => {
      const psName = lead.ps_name || 'Unknown'
      
      if (!acc[psName]) {
        acc[psName] = {
          total_leads: 0,
          with_phone: 0,
          with_model_preference: 0,
          with_buying_plan: 0,
          with_profession: 0,
          with_location: 0
        }
      }

      acc[psName].total_leads++
      
      if (lead.customer_mobile_number) acc[psName].with_phone++
      if (lead.model_interested) acc[psName].with_model_preference++
      if (lead.buying_plan) acc[psName].with_buying_plan++
      if (lead.profession) acc[psName].with_profession++
      if (lead.customer_location) acc[psName].with_location++

      return acc
    }, {})

    const handoffQualityMetrics = Object.entries(handoffQuality).map(([psName, stats]: [string, any]) => {
      const dataCompletenessScore = Math.round(
        ((stats.with_phone + stats.with_model_preference + stats.with_buying_plan + 
          stats.with_profession + stats.with_location) / (stats.total_leads * 5)) * 10000
      ) / 100

      return {
        ps_name: psName,
        total_leads: stats.total_leads,
        with_phone: stats.with_phone,
        with_model_preference: stats.with_model_preference,
        with_buying_plan: stats.with_buying_plan,
        with_profession: stats.with_profession,
        with_location: stats.with_location,
        data_completeness_score: dataCompletenessScore
      }
    }).sort((a, b) => b.data_completeness_score - a.data_completeness_score)

    return NextResponse.json({
      psPerformance,
      sourcePerformance,
      handoffQualityMetrics
    })

  } catch (error) {
    console.error('Error in PS performance analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

