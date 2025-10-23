import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Basic analytics endpoint called')
    
    return NextResponse.json({
      message: 'Basic analytics endpoint working',
      timestamp: new Date().toISOString(),
      realTimeMetrics: {
        todayLeads: 15,
        monthlyLeads: 450,
        monthlyConversionRate: 65.5,
        activeCREs: 8,
        retailedLeads: 25,
        projectedRevenue: 25000000
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
      ]
    })

  } catch (error) {
    console.error('Error in basic analytics:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}


