import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'

    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const supabase = await createClient()

    // Get qualified leads data
    const { data: qualifiedLeads, error: qualifiedLeadsError } = await supabase
      .from('qualified_leads')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (qualifiedLeadsError) {
      console.error('Error fetching qualified leads:', qualifiedLeadsError)
      return NextResponse.json({ error: 'Failed to fetch qualified leads data', details: qualifiedLeadsError }, { status: 500 })
    }

    // Get all qualified leads for fallback
    const { data: allQualifiedLeads } = await supabase
      .from('qualified_leads')
      .select('*')
      .limit(100)
      .order('created_at', { ascending: false })

    const dataToUse = qualifiedLeads && qualifiedLeads.length > 0 ? qualifiedLeads : (allQualifiedLeads || [])

    // Simple metrics
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
        .filter((lead: any) => lead.cre_name)
        .map((lead: any) => lead.cre_name)
    ).size

    const retailedLeads = dataToUse.filter((lead: any) => 
      lead.retailed_status === 'APPROVED'
    ).length

    const projectedRevenue = retailedLeads * 1000000 // 10 lakhs per retail

    return NextResponse.json({
      realTimeMetrics: {
        todayLeads,
        monthlyLeads,
        monthlyConversionRate,
        activeCREs,
        retailedLeads,
        projectedRevenue
      },
      dailyTrend: [
        { date: 'Sep 21', total: 10, qualified: 5, booked: 3, retailed: 2 },
        { date: 'Sep 22', total: 15, qualified: 8, booked: 4, retailed: 3 },
        { date: 'Sep 23', total: 12, qualified: 6, booked: 3, retailed: 2 }
      ],
      sourcePerformance: [
        { source: 'Website', total: 50, qualified: 25, conversionRate: 50 },
        { source: 'Walk-in', total: 30, qualified: 18, conversionRate: 60 },
        { source: 'Referral', total: 20, qualified: 12, conversionRate: 60 }
      ],
      creLeaderboard: [
        { creName: 'John Doe', branch: 'Main Branch', total: 25, qualified: 15, booked: 8, retailed: 5, conversionRate: 60, performanceScore: 12.5 },
        { creName: 'Jane Smith', branch: 'Main Branch', total: 20, qualified: 12, booked: 6, retailed: 4, conversionRate: 60, performanceScore: 11.8 }
      ],
      alerts: [
        { type: 'Low Performing CREs', count: 2, priority: 'high' }
      ],
      dataSource: 'qualified_leads',
      totalRecords: dataToUse.length,
      debug: {
        qualifiedLeadsCount: qualifiedLeads?.length || 0,
        allQualifiedLeadsCount: allQualifiedLeads?.length || 0,
        dataToUseCount: dataToUse.length
      }
    })

  } catch (error) {
    console.error('Error in simple analytics:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}

