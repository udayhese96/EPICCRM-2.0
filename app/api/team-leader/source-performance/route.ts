import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[Source Performance] Starting request')
    
    const searchParams = request.nextUrl.searchParams
    const teamLeaderId = searchParams.get('team_leader_id')
    const dateRange = searchParams.get('date_range') || '30'
    const psMember = searchParams.get('ps_member') || 'all'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('[Source Performance] Params:', { teamLeaderId, dateRange, psMember, startDate, endDate })

    if (!teamLeaderId) {
      return NextResponse.json(
        { error: 'Team leader ID is required' },
        { status: 400 }
      )
    }

    // Get the access token from cookies
    const accessToken = request.cookies.get('access_token')?.value
    console.log('[Source Performance] Access token from cookies:', accessToken ? 'Present' : 'Missing')
    
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
    const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)

    console.log('[Source Performance] Fetching PS members from:', `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/ps-members`)

    // Fetch PS members for this team leader
    const psResponse = await fetch(
      `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/ps-members`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    console.log('[Source Performance] PS members response status:', psResponse.status)

    if (!psResponse.ok) {
      const errorText = await psResponse.text()
      console.error('[Source Performance] PS members error:', errorText)
      throw new Error(`Failed to fetch PS members: ${psResponse.status} ${errorText}`)
    }

    const psMembers = await psResponse.json()
    console.log('[Source Performance] PS members:', psMembers)
    
    // Filter PS members if a specific one is selected
    let targetPsIds: string[] = []
    let psName: string | null = null
    
    if (psMember === 'all') {
      targetPsIds = psMembers.map((ps: any) => ps.id)
    } else {
      targetPsIds = [psMember]
      // Find the PS name for the selected PS member
      const selectedPs = psMembers.find((ps: any) => ps.id === psMember)
      if (selectedPs) {
        psName = selectedPs.full_name || selectedPs.name
      }
    }

    console.log('[Source Performance] Target PS IDs:', targetPsIds)
    console.log('[Source Performance] PS Name:', psName)

    if (targetPsIds.length === 0) {
      return NextResponse.json({
        sources: [],
      })
    }

    console.log('[Source Performance] Fetching source performance data from:', `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/source-performance`)

    // Prepare request body
    const requestBody: any = {
      ps_ids: targetPsIds,
    }
    
    // Add date parameters if not "all time"
    if (startDateObj && endDateObj) {
      requestBody.start_date = startDateObj.toISOString()
      requestBody.end_date = endDateObj.toISOString()
    }
    
    // Add ps_name if filtering by specific PS
    if (psName) {
      requestBody.ps_name = psName
    }

    // Fetch source performance data from backend
    const sourcePerformanceResponse = await fetch(
      `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/source-performance`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      }
    )

    console.log('[Source Performance] Source performance response status:', sourcePerformanceResponse.status)

    if (!sourcePerformanceResponse.ok) {
      const errorText = await sourcePerformanceResponse.text()
      console.error('[Source Performance] Source performance error:', errorText)
      throw new Error(`Failed to fetch source performance data: ${sourcePerformanceResponse.status} ${errorText}`)
    }

    const sourcePerformanceData = await sourcePerformanceResponse.json()
    console.log('[Source Performance] Source performance data:', sourcePerformanceData)

    return NextResponse.json({
      sources: sourcePerformanceData.sources || [],
    })
  } catch (error) {
    console.error('Error fetching source performance summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch source performance summary' },
      { status: 500 }
    )
  }
}
