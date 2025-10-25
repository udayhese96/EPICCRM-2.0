import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[Analytics Summary] Starting request')
    
    const searchParams = request.nextUrl.searchParams
    const teamLeaderId = searchParams.get('team_leader_id')
    const dateRange = searchParams.get('date_range') || '30'
    const psMember = searchParams.get('ps_member') || 'all'

    console.log('[Analytics Summary] Params:', { teamLeaderId, dateRange, psMember })

    if (!teamLeaderId) {
      return NextResponse.json(
        { error: 'Team leader ID is required' },
        { status: 400 }
      )
    }

    // Get the access token from cookies
    const accessToken = request.cookies.get('access_token')?.value
    console.log('[Analytics Summary] Access token from cookies:', accessToken ? 'Present' : 'Missing')
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 401 }
      )
    }

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    startDate.setDate(now.getDate() - parseInt(dateRange))
    
    // Set end date to end of current day to include all leads assigned today
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999) // End of current day

    // Build the base URL for the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    console.log('[Analytics Summary] Fetching PS members from:', `${backendUrl}/api/team-leader/${teamLeaderId}/ps-members`)

    // Fetch PS members for this team leader
    const psResponse = await fetch(
      `${backendUrl}/api/team-leader/${teamLeaderId}/ps-members`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    console.log('[Analytics Summary] PS members response status:', psResponse.status)

    if (!psResponse.ok) {
      const errorText = await psResponse.text()
      console.error('[Analytics Summary] PS members error:', errorText)
      throw new Error(`Failed to fetch PS members: ${psResponse.status} ${errorText}`)
    }

    const psMembers = await psResponse.json()
    console.log('[Analytics Summary] PS members:', psMembers)
    
    // Filter PS members if a specific one is selected
    let targetPsIds: string[] = []
    if (psMember === 'all') {
      targetPsIds = psMembers.map((ps: any) => ps.id)
    } else {
      targetPsIds = [psMember]
    }

    console.log('[Analytics Summary] Target PS IDs:', targetPsIds)

    if (targetPsIds.length === 0) {
      return NextResponse.json({
        total_assigned: 0,
        open_leads: 0,
        won_leads: 0,
        lost_leads: 0,
      })
    }

    console.log('[Analytics Summary] Fetching analytics data from:', `${backendUrl}/api/team-leader/${teamLeaderId}/analytics-kpi`)

    // Fetch analytics data from backend
    const analyticsResponse = await fetch(
      `${backendUrl}/api/team-leader/${teamLeaderId}/analytics-kpi`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ps_ids: targetPsIds,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        }),
      }
    )

    console.log('[Analytics Summary] Analytics response status:', analyticsResponse.status)

    if (!analyticsResponse.ok) {
      const errorText = await analyticsResponse.text()
      console.error('[Analytics Summary] Analytics error:', errorText)
      throw new Error(`Failed to fetch analytics data: ${analyticsResponse.status} ${errorText}`)
    }

    const analyticsData = await analyticsResponse.json()
    console.log('[Analytics Summary] Analytics data:', analyticsData)

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

