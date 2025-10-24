import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const teamLeaderId = searchParams.get('team_leader_id')
    const search = searchParams.get('search')
    const psMember = searchParams.get('ps_member')
    const dateRange = searchParams.get('date_range')
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'

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

    // Build query parameters for backend
    const backendParams = new URLSearchParams({
      team_leader_id: teamLeaderId,
      limit,
      offset,
    })

    if (search) backendParams.append('search', search)
    if (psMember) backendParams.append('ps_member', psMember)
    if (dateRange) backendParams.append('date_range', dateRange)

    // Call the FastAPI backend with proper auth
    const backendUrl = process.env.FASTAPI_URL || 'http://localhost:8000'
    const response = await fetch(
      `${backendUrl}/api/team-leader/lost?${backendParams.toString()}`,
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
      console.error('Backend error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch lost leads' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching lost leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
