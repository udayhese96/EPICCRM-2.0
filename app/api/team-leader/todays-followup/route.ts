import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamLeaderId = searchParams.get('team_leader_id')
    const search = searchParams.get('search') || ''
    const dateRange = searchParams.get('date_range') || 'all'
    const psMember = searchParams.get('ps_member') || 'all'
    const limit = searchParams.get('limit') || '10'
    const offset = searchParams.get('offset') || '0'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('[Todays Followup] Params:', { teamLeaderId, dateRange, psMember, startDate, endDate })

    if (!teamLeaderId) {
      return NextResponse.json(
        { error: 'Team leader ID is required' },
        { status: 400 }
      )
    }

    // Get the access token from cookies
    const accessToken = request.cookies.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Calculate date range
    let startDateObj: Date | null = null
    let endDateObj: Date | null = null

    if (startDate && endDate) {
      // Use custom date range
      startDateObj = new Date(startDate)
      endDateObj = new Date(endDate)
    } else if (dateRange === 'all') {
      // All time - no date filtering
      startDateObj = null
      endDateObj = null
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

    // Build query parameters for the backend
    const backendParams = new URLSearchParams({
      team_leader_id: teamLeaderId,
      date_range: dateRange,
      limit,
      offset,
    })

    if (search) {
      backendParams.append('search', search)
    }

    if (psMember !== 'all') {
      backendParams.append('ps_member', psMember)
    }

    // Add date parameters if calculated
    if (startDateObj && endDateObj) {
      backendParams.append('start_date', startDateObj.toISOString())
      backendParams.append('end_date', endDateObj.toISOString())
    }

    // Call the FastAPI backend
    const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    const response = await fetch(
      `${FASTAPI_BASE_URL}/api/team-leader/todays-followup?${backendParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TodaysFollowup API] Backend error:', response.status, errorText)

      return NextResponse.json(
        {
          error: 'Failed to fetch today\'s follow-up data',
          details: errorText
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })

  } catch (error) {
    console.error('[TodaysFollowup API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
