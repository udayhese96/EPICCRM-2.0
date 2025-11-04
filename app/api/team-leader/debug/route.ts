import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/utils/api/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamLeaderId = searchParams.get('team_leader_id')
    
    // Test auth extraction
    const authCtx = getAuthFromRequest(request)
    const { bearer, tenantId, tlId } = authCtx
    
    // Get backend URL
    const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      auth: {
        hasBearer: !!bearer,
        bearerPrefix: bearer ? bearer.substring(0, 20) + '...' : 'none',
        tenantId: tenantId || 'not set',
        tlId: tlId || 'not set',
        teamLeaderId: teamLeaderId || 'not provided',
      },
      backend: {
        url: FASTAPI_BASE_URL,
        environment: process.env.NODE_ENV,
      },
      cookies: {
        hasAccessToken: !!request.cookies.get('access_token')?.value,
      },
      headers: {
        hasAuthorization: !!request.headers.get('authorization'),
      }
    }
    
    // Try to fetch PS members to test backend connectivity
    if (teamLeaderId && bearer) {
      try {
        const psResponse = await fetch(
          `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/ps-members`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': bearer,
            },
          }
        )
        
        diagnostics.backend.psMembersStatus = psResponse.status
        diagnostics.backend.psMembersOk = psResponse.ok
        
        if (!psResponse.ok) {
          const errorText = await psResponse.text()
          diagnostics.backend.psMembersError = errorText.substring(0, 500)
        } else {
          const psData = await psResponse.json()
          diagnostics.backend.psMembersCount = psData?.length || 0
        }
      } catch (error) {
        diagnostics.backend.psMembersException = error instanceof Error ? error.message : String(error)
      }
      
      // Try analytics-kpi endpoint
      try {
        const analyticsResponse = await fetch(
          `${FASTAPI_BASE_URL}/api/team-leader/${teamLeaderId}/analytics-kpi`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': bearer,
            },
            body: JSON.stringify({
              ps_ids: [],
              start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end_date: new Date().toISOString(),
            }),
          }
        )
        
        diagnostics.backend.analyticsStatus = analyticsResponse.status
        diagnostics.backend.analyticsOk = analyticsResponse.ok
        
        if (!analyticsResponse.ok) {
          const errorText = await analyticsResponse.text()
          diagnostics.backend.analyticsError = errorText.substring(0, 500)
        }
      } catch (error) {
        diagnostics.backend.analyticsException = error instanceof Error ? error.message : String(error)
      }
    }
    
    return NextResponse.json(diagnostics, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}

