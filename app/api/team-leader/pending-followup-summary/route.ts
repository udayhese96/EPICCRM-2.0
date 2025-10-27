import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[Pending Followup Summary] Starting request')
    
    const searchParams = request.nextUrl.searchParams
    const teamLeaderId = searchParams.get('team_leader_id')
    const dateRange = searchParams.get('date_range') || '30'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('[Pending Followup Summary] Params:', { teamLeaderId, dateRange, startDate, endDate })

    if (!teamLeaderId) {
      return NextResponse.json(
        { error: 'Team leader ID is required' },
        { status: 400 }
      )
    }

    // Get access token from cookies
    const accessToken = request.cookies.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 401 }
      )
    }

    // Calculate date range
    let startDateObj: Date
    let endDateObj: Date
    
    if (startDate && endDate) {
      // Use custom date range
      startDateObj = new Date(startDate)
      endDateObj = new Date(endDate)
    } else if (dateRange === 'all') {
      // All time - no date filtering
      startDateObj = null as any
      endDateObj = null as any
    } else if (dateRange === 'today') {
      // Today only
      const now = new Date()
      startDateObj = new Date(now)
      startDateObj.setHours(0, 0, 0, 0)
      endDateObj = new Date(now)
      endDateObj.setHours(23, 59, 59, 999)
    } else {
      // Last X days (default behavior)
      const now = new Date()
      startDateObj = new Date()
      startDateObj.setDate(now.getDate() - parseInt(dateRange))
      endDateObj = new Date()
      endDateObj.setHours(23, 59, 59, 999)
    }

    // Build the base URL for the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    console.log('[Pending Followup Summary] Fetching from backend:', `${backendUrl}/api/team-leader/${teamLeaderId}/pending-followup-summary`)

    // Prepare request body
    const requestBody: any = {}
    
    // Add date parameters if not "all time"
    if (startDateObj && endDateObj) {
      requestBody.start_date = startDateObj.toISOString()
      requestBody.end_date = endDateObj.toISOString()
    }

    console.log('[Pending Followup Summary] Request body:', requestBody)

    // Fetch pending followup summary data from backend
    const response = await fetch(
      `${backendUrl}/api/team-leader/${teamLeaderId}/pending-followup-summary`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      }
    )

    console.log('[Pending Followup Summary] Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Pending Followup Summary] Backend error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch pending followup summary data', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[Pending Followup Summary] Data received:', data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Pending Followup Summary] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

