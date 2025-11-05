import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callFastAPIWithRetry(params: string, authToken: string, retries = MAX_RETRIES): Promise<Response> {
  try {
    const url = `${FASTAPI_BASE_URL}/analytics/sales-manager/tl-leads?${params}`
    console.log(`🔄 Calling FastAPI: ${url}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok && retries > 0) {
      console.warn(`FastAPI call failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`)
      await sleep(RETRY_DELAY)
      return callFastAPIWithRetry(params, authToken, retries - 1)
    }

    return response
  } catch (error) {
    if (retries > 0) {
      console.warn(`FastAPI call error, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`, error)
      await sleep(RETRY_DELAY)
      return callFastAPIWithRetry(params, authToken, retries - 1)
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch')
    const tlName = searchParams.get('tl_name')
    const statusType = searchParams.get('status_type')
    const dateFilterType = searchParams.get('date_filter_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!branch || branch.trim() === '') {
      return NextResponse.json({ 
        error: 'Branch parameter is required and cannot be empty',
        success: false 
      }, { status: 400 })
    }
    
    if (!tlName || tlName.trim() === '') {
      return NextResponse.json({ 
        error: 'Team Leader name parameter is required and cannot be empty',
        success: false 
      }, { status: 400 })
    }
    
    if (!statusType || statusType.trim() === '') {
      return NextResponse.json({ 
        error: 'Status type parameter is required and cannot be empty',
        success: false 
      }, { status: 400 })
    }

    // Validate date filter parameters if from_to is selected
    if (dateFilterType === 'from_to') {
      const normalizedStartDate = startDate?.trim() || ''
      const normalizedEndDate = endDate?.trim() || ''
      
      if (!normalizedStartDate || !normalizedEndDate) {
        return NextResponse.json({ 
          error: 'start_date and end_date are required for \'from_to\' filter. Please select both start and end dates.',
          success: false 
        }, { status: 400 })
      }
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authentication required. Please provide a valid token.',
        success: false 
      }, { status: 401 })
    }

    const authToken = authHeader.substring(7)
    console.log(`🔄 Fetching TL leads data for branch: ${branch}, tl: ${tlName}, status: ${statusType}`)
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    if (dateFilterType) {
      console.log(`🔄 Date filter: ${dateFilterType}`, startDate && endDate ? `(${startDate} to ${endDate})` : '')
    }

    const params = new URLSearchParams({
      branch,
      tl_name: tlName,
      status_type: statusType
    })
    
    // Add date filter parameters if provided
    if (dateFilterType && dateFilterType !== 'all_time') {
      params.append('date_filter_type', dateFilterType)
      if (dateFilterType === 'from_to' && startDate && endDate) {
        params.append('start_date', startDate.trim())
        params.append('end_date', endDate.trim())
      }
    }
    
    const paramsString = params.toString()

    const fastApiResponse = await callFastAPIWithRetry(paramsString, authToken)

    if (!fastApiResponse.ok) {
      let errorMessage = 'Failed to fetch TL leads data from backend'
      
      try {
        const errorData = await fastApiResponse.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
        console.error('FastAPI error response:', errorData)
      } catch (parseError) {
        console.error('Failed to parse FastAPI error response:', parseError)
      }

      return NextResponse.json({ 
        error: errorMessage,
        success: false,
        status: fastApiResponse.status
      }, { status: fastApiResponse.status })
    }

    const result = await fastApiResponse.json()
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.message || 'Analytics service returned unsuccessful response',
        success: false 
      }, { status: 500 })
    }

    console.log(`✅ Successfully fetched TL leads data for branch: ${branch}, tl: ${tlName}, status: ${statusType} - ${result.count} leads`)
    
    return NextResponse.json({ 
      leads: result.leads || [], 
      count: result.count || 0,
      branch: result.branch,
      tl_name: result.tl_name,
      status_type: result.status_type,
      timestamp: result.timestamp,
      success: result.success,
      requested_by: result.requested_by
    })
  } catch (error) {
    console.error('❌ TL leads drill-down API error:', error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({ 
        error: 'Unable to connect to analytics backend service',
        success: false,
        details: 'Please check if the FastAPI backend is running'
      }, { status: 503 })
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        error: 'Request timeout - analytics service took too long to respond',
        success: false
      }, { status: 504 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error - Failed to process analytics request',
      success: false,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 })
  }
}

