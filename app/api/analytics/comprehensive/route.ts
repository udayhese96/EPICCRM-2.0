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

    // Get comprehensive data from all tables
    const { data: leads, error: leadsError } = await supabase
      .from('lead_master')
      .select(`
        *,
        qualified_leads(*),
        booking_and_retail_master(*),
        trade_in_master(*)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads data', details: leadsError }, { status: 500 })
    }

    console.log(`Found ${leads?.length || 0} leads with comprehensive data`)

    // Filter by branch if specified
    const dataToUse = branch 
      ? (leads || []).filter((lead: any) => lead.branch === branch)
      : (leads || [])

    // Real-time metrics
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substring(0, 7)

    const todayLeads = dataToUse.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(today)
    ).length

    const monthlyLeads = dataToUse.filter((lead: any) => 
      lead.created_at && lead.created_at.startsWith(thisMonth)
    ).length

    const qualifiedLeads = dataToUse.filter((lead: any) => 
      lead.final_status === 'QUALIFIED' || lead.final_status === 'Won'
    ).length

    const monthlyConversionRate = monthlyLeads > 0 
      ? (qualifiedLeads / monthlyLeads) * 100 
      : 0

    const activeCREs = new Set(
      dataToUse
        .filter((lead: any) => lead.cre_name && lead.assigned === 'Yes')
        .map((lead: any) => lead.cre_name)
    ).size

    // Calculate retails from both tables
    const retailedLeads = dataToUse.filter((lead: any) => 
      lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED') ||
      lead.booking_and_retail_master?.some((brm: any) => brm.retailed_status === 'APPROVED')
    ).length

    const projectedRevenue = retailedLeads * 1000000 // 10 lakhs per retail

    // Trade-in analysis
    const tradeInLeads = dataToUse.filter((lead: any) => 
      lead.trade_in === 'Yes' || lead.trade_in_master?.length > 0
    ).length

    const tradeInConversionRate = tradeInLeads > 0 
      ? (dataToUse.filter((lead: any) => 
          (lead.trade_in === 'Yes' || lead.trade_in_master?.length > 0) && 
          (lead.final_status === 'QUALIFIED' || lead.final_status === 'Won')
        ).length / tradeInLeads) * 100 
      : 0

    // PS Performance Analysis
    const psStats = dataToUse.reduce((acc: any, lead: any) => {
      const psName = lead.ps_name || 'Unknown'
      
      if (!acc[psName]) {
        acc[psName] = {
          total: 0,
          assigned: 0,
          qualified: 0,
          branch: lead.branch
        }
      }

      acc[psName].total++
      if (lead.assigned === 'Yes') acc[psName].assigned++
      if (lead.final_status === 'QUALIFIED' || lead.final_status === 'Won') {
        acc[psName].qualified++
      }

      return acc
    }, {})

    const psPerformance = Object.entries(psStats).map(([psName, stats]: [string, any]) => ({
      ps_name: psName,
      branch: stats.branch,
      total_leads_generated: stats.total,
      leads_assigned_to_cre: stats.assigned,
      qualified_leads: stats.qualified,
      ps_qualification_rate: stats.total > 0 ? (stats.qualified / stats.total) * 100 : 0,
      assignment_rate: stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0
    })).sort((a, b) => b.ps_qualification_rate - a.ps_qualification_rate)

    // Model Performance Analysis
    const modelStats = dataToUse.reduce((acc: any, lead: any) => {
      const model = lead.model_interested || 'Unknown'
      
      if (!acc[model]) {
        acc[model] = {
          total: 0,
          qualified: 0,
          retailed: 0
        }
      }

      acc[model].total++
      if (lead.final_status === 'QUALIFIED' || lead.final_status === 'Won') {
        acc[model].qualified++
      }
      
      const hasRetail = lead.qualified_leads?.some((ql: any) => ql.retailed_status === 'APPROVED') ||
                       lead.booking_and_retail_master?.some((brm: any) => brm.retailed_status === 'APPROVED')
      if (hasRetail) acc[model].retailed++

      return acc
    }, {})

    const modelPerformance = Object.entries(modelStats)
      .map(([model, stats]: [string, any]) => ({
        model,
        total: stats.total,
        qualified: stats.qualified,
        retailed: stats.retailed,
        qualification_rate: stats.total > 0 ? (stats.qualified / stats.total) * 100 : 0,
        retail_rate: stats.qualified > 0 ? (stats.retailed / stats.qualified) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // Finance Analysis
    const financeStats = dataToUse.reduce((acc: any, lead: any) => {
      const finance = lead.finance_option || 'Unknown'
      acc[finance] = (acc[finance] || 0) + 1
      return acc
    }, {})

    const financeDistribution = Object.entries(financeStats)
      .map(([option, count]: [string, any]) => ({
        option,
        count,
        percentage: dataToUse.length > 0 ? (count / dataToUse.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      realTimeMetrics: {
        todayLeads,
        monthlyLeads,
        monthlyConversionRate,
        activeCREs,
        retailedLeads,
        projectedRevenue,
        tradeInLeads,
        tradeInConversionRate
      },
      psPerformance,
      modelPerformance,
      financeDistribution,
      summary: {
        totalLeads: dataToUse.length,
        totalQualified: qualifiedLeads,
        totalRetailed: retailedLeads,
        overallConversionRate: dataToUse.length > 0 ? (qualifiedLeads / dataToUse.length) * 100 : 0,
        retailConversionRate: qualifiedLeads > 0 ? (retailedLeads / qualifiedLeads) * 100 : 0
      }
    })

  } catch (error) {
    console.error('Error in comprehensive analytics:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}


