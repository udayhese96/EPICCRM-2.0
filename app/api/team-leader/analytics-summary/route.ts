import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamLeaderId = searchParams.get('team_leader_id')
    const dateRange = searchParams.get('date_range') || '30'
    const psMember = searchParams.get('ps_member') || 'all'

    if (!teamLeaderId) {
      return NextResponse.json(
        { error: 'Team leader ID is required' },
        { status: 400 }
      )
    }

    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      )
    }

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    startDate.setDate(now.getDate() - parseInt(dateRange))

    // Build the base URL for the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    // Fetch PS members for this team leader
    const psResponse = await fetch(
      `${backendUrl}/api/team-leader/${teamLeaderId}/ps-members`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      }
    )

    if (!psResponse.ok) {
      throw new Error('Failed to fetch PS members')
    }

    const psMembers = await psResponse.json()
    
    // Filter PS members if a specific one is selected
    let targetPsIds: string[] = []
    if (psMember === 'all') {
      targetPsIds = psMembers.map((ps: any) => ps.id)
    } else {
      targetPsIds = [psMember]
    }

    if (targetPsIds.length === 0) {
      return NextResponse.json({
        total_assigned: 0,
        open_leads: 0,
        won_leads: 0,
        lost_leads: 0,
      })
    }

    // Fetch analytics data from backend
    const analyticsResponse = await fetch(
      `${backendUrl}/api/team-leader/${teamLeaderId}/analytics-kpi`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          ps_ids: targetPsIds,
          start_date: startDate.toISOString(),
          end_date: now.toISOString(),
        }),
      }
    )

    if (!analyticsResponse.ok) {
      throw new Error('Failed to fetch analytics data')
    }

    const analyticsData = await analyticsResponse.json()

    return NextResponse.json({
      total_assigned: analyticsData.total_assigned || 0,
      open_leads: analyticsData.open_leads || 0,
      won_leads: analyticsData.won_leads || 0,
      lost_leads: analyticsData.lost_leads || 0,
    })
  } catch (error) {
    console.error('Error fetching analytics summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary' },
      { status: 500 }
    )
  }
}

