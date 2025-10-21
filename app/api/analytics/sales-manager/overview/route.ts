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

    // Get user data and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, branch, id')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('User data error:', userError)
      // For now, allow access even if user data is not found
      // return NextResponse.json({ error: 'User data not found' }, { status: 403 })
    }

    // Check if user has appropriate role (optional for now)
    // if (userData && userData.role !== 'sales_manager') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'
    const branch = searchParams.get('branch') || userData.branch

    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get approval requests for the branch
    const { data: approvalRequests, error: approvalError } = await supabase
      .from('qualified_leads')
      .select(`
        *,
        lead_master!inner(
          uid,
          customer_name,
          customer_mobile_number,
          model_interested,
          cre_name,
          ps_name,
          branch
        )
      `)
      .eq('lead_master.branch', branch)
      .gte('created_at', startDate.toISOString())

    if (approvalError) {
      console.error('Error fetching approval requests:', approvalError)
      return NextResponse.json({ error: 'Failed to fetch approval data' }, { status: 500 })
    }

    // Get all leads for the branch for comprehensive analytics
    const { data: leads, error: leadsError } = await supabase
      .from('lead_master')
      .select('*')
      .eq('branch', branch)
      .gte('created_at', startDate.toISOString())

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads data' }, { status: 500 })
    }

    // Approval metrics
    const totalRequests = approvalRequests.length
    const pendingRequests = approvalRequests.filter(req => 
      req.booking_status === 'PENDING' || req.retailed_status === 'PENDING'
    ).length
    const approvedRequests = approvalRequests.filter(req => 
      req.booking_status === 'APPROVED' || req.retailed_status === 'APPROVED'
    ).length
    const rejectedRequests = approvalRequests.filter(req => 
      req.booking_status === 'REJECTED' || req.retailed_status === 'REJECTED'
    ).length

    const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0

    // Booking vs Retail breakdown
    const bookingRequests = approvalRequests.filter(req => req.booking_requested_at)
    const retailRequests = approvalRequests.filter(req => req.retailed_requested_at)

    const bookingStats = {
      pending: bookingRequests.filter(req => req.booking_status === 'PENDING').length,
      approved: bookingRequests.filter(req => req.booking_status === 'APPROVED').length,
      rejected: bookingRequests.filter(req => req.booking_status === 'REJECTED').length,
      total: bookingRequests.length
    }

    const retailStats = {
      pending: retailRequests.filter(req => req.retailed_status === 'PENDING').length,
      approved: retailRequests.filter(req => req.retailed_status === 'APPROVED').length,
      rejected: retailRequests.filter(req => req.retailed_status === 'REJECTED').length,
      total: retailRequests.length
    }

    // Sales performance metrics
    const totalLeads = leads.length
    const qualifiedLeads = leads.filter(lead => lead.final_status === 'QUALIFIED').length
    const bookedLeads = leads.filter(lead => 
      approvalRequests.some(req => req.lead_uid === lead.uid && req.booking_status === 'APPROVED')
    ).length
    const retailedLeads = leads.filter(lead => 
      approvalRequests.some(req => req.lead_uid === lead.uid && req.retailed_status === 'APPROVED')
    ).length

    const qualificationRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0
    const bookingRate = qualifiedLeads > 0 ? (bookedLeads / qualifiedLeads) * 100 : 0
    const retailRate = bookedLeads > 0 ? (retailedLeads / bookedLeads) * 100 : 0

    // Revenue metrics
    const projectedRevenue = retailedLeads * 1000000 // 10 lakhs per retail

    // CRE performance in branch
    const creStats = leads.reduce((acc: any, lead) => {
      if (!lead.cre_name) return acc
      
      if (!acc[lead.cre_name]) {
        acc[lead.cre_name] = {
          total: 0,
          qualified: 0,
          booked: 0,
          retailed: 0
        }
      }
      
      acc[lead.cre_name].total++
      if (lead.final_status === 'QUALIFIED') acc[lead.cre_name].qualified++
      
      const hasBooking = approvalRequests.some(req => 
        req.lead_uid === lead.uid && req.booking_status === 'APPROVED'
      )
      if (hasBooking) acc[lead.cre_name].booked++
      
      const hasRetail = approvalRequests.some(req => 
        req.lead_uid === lead.uid && req.retailed_status === 'APPROVED'
      )
      if (hasRetail) acc[lead.cre_name].retailed++

      return acc
    }, {})

    const crePerformance = Object.entries(creStats)
      .map(([creName, stats]: [string, any]) => ({
        creName,
        total: stats.total,
        qualified: stats.qualified,
        booked: stats.booked,
        retailed: stats.retailed,
        qualificationRate: stats.total > 0 ? (stats.qualified / stats.total) * 100 : 0,
        bookingRate: stats.qualified > 0 ? (stats.booked / stats.qualified) * 100 : 0,
        retailRate: stats.booked > 0 ? (stats.retailed / stats.booked) * 100 : 0
      }))
      .sort((a, b) => b.retailed - a.retailed)

    // Daily approval trends
    const dailyTrends = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayRequests = approvalRequests.filter(req => 
        req.booking_requested_at?.startsWith(dateStr) || 
        req.retailed_requested_at?.startsWith(dateStr)
      )
      
      const dayApproved = dayRequests.filter(req => 
        req.booking_status === 'APPROVED' || req.retailed_status === 'APPROVED'
      )
      
      const dayRejected = dayRequests.filter(req => 
        req.booking_status === 'REJECTED' || req.retailed_status === 'REJECTED'
      )

      dailyTrends.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        requests: dayRequests.length,
        approved: dayApproved.length,
        rejected: dayRejected.length
      })
    }

    // Approval timeline analysis
    const approvalTimelines = approvalRequests
      .filter(req => req.booking_status === 'APPROVED' || req.retailed_status === 'APPROVED')
      .map(req => {
        const requestedAt = req.booking_requested_at || req.retailed_requested_at
        const approvedAt = req.booking_approved_timestamp || req.retailed_approved_timestamp
        
        if (requestedAt && approvedAt) {
          const hours = (new Date(approvedAt).getTime() - new Date(requestedAt).getTime()) / (1000 * 60 * 60)
          return hours
        }
        return null
      })
      .filter(hours => hours !== null)

    const avgApprovalTime = approvalTimelines.length > 0 
      ? approvalTimelines.reduce((sum, hours) => sum + hours, 0) / approvalTimelines.length 
      : 0

    return NextResponse.json({
      approvalMetrics: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        approvalRate,
        avgApprovalTime
      },
      bookingStats,
      retailStats,
      salesMetrics: {
        totalLeads,
        qualifiedLeads,
        bookedLeads,
        retailedLeads,
        qualificationRate,
        bookingRate,
        retailRate,
        projectedRevenue
      },
      crePerformance,
      dailyTrends
    })

  } catch (error) {
    console.error('Error in sales manager analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
