import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callFastAPIWithRetry(branch: string, authToken: string, dateFilterType?: string, startDate?: string, endDate?: string, retries = MAX_RETRIES): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
  
  try {
    const params = new URLSearchParams({
      branch: branch
    })
    
    if (dateFilterType && dateFilterType !== 'all_time') {
      params.append('date_filter_type', dateFilterType)
      if (dateFilterType === 'from_to' && startDate && endDate) {
        params.append('start_date', startDate)
        params.append('end_date', endDate)
      }
    }
    
    const url = `${FASTAPI_BASE_URL}/analytics/sales-manager/tl-performance?${params.toString()}`
    console.log(`🔄 Calling FastAPI: ${url}`)
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok && retries > 0) {
        console.warn(`FastAPI call failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`)
        await sleep(RETRY_DELAY)
        return callFastAPIWithRetry(branch, authToken, dateFilterType, startDate, endDate, retries - 1)
      }

      return response
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - FastAPI took too long to respond')
      }
      throw fetchError
    }

  } catch (error: any) {
    clearTimeout(timeoutId)
    if (retries > 0) {
      console.warn(`FastAPI call error, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`, error)
      await sleep(RETRY_DELAY)
      return callFastAPIWithRetry(branch, authToken, dateFilterType, startDate, endDate, retries - 1)
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch')
    const dateFilterType = searchParams.get('date_filter_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Validate branch parameter
    if (!branch || branch.trim() === '') {
      return NextResponse.json({ 
        error: 'Branch parameter is required and cannot be empty',
        success: false 
      }, { status: 400 })
    }

    // Validate date filter parameters
    if (dateFilterType === 'from_to') {
      if (!startDate || !endDate || startDate.trim() === '' || endDate.trim() === '') {
        return NextResponse.json({ 
          error: 'start_date and end_date are required for \'from_to\' filter. Please select both start and end dates.',
          success: false 
        }, { status: 400 })
      }
      
      // Validate date format
      const startDateObj = new Date(startDate)
      const endDateObj = new Date(endDate)
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return NextResponse.json({ 
          error: 'Invalid date format. Please provide dates in YYYY-MM-DD format.',
          success: false 
        }, { status: 400 })
      }
      
      // Validate date range
      if (endDateObj < startDateObj) {
        return NextResponse.json({ 
          error: 'End date must be after or equal to start date.',
          success: false 
        }, { status: 400 })
      }
    }

    // Get authentication token from request headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authentication required. Please provide a valid token.',
        success: false 
      }, { status: 401 })
    }

    const authToken = authHeader.substring(7) // Remove 'Bearer ' prefix
    console.log(`🔄 Fetching TL Performance data for branch: ${branch}`)
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    if (dateFilterType) {
      console.log(`🔄 Date filter: ${dateFilterType}`, startDate && endDate ? `(${startDate} to ${endDate})` : '')
    }

    // Call FastAPI backend with retry logic and authentication
    const fastApiResponse = await callFastAPIWithRetry(branch, authToken, dateFilterType || undefined, startDate || undefined, endDate || undefined)

    if (!fastApiResponse.ok) {
      let errorMessage = 'Failed to fetch TL Performance data from backend'
      
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
    
    // Validate response structure
    if (!result.success) {
      return NextResponse.json({ 
        error: result.message || 'Analytics service returned unsuccessful response',
        success: false 
      }, { status: 500 })
    }

    console.log(`✅ Successfully fetched TL Performance data for branch: ${branch}`)
    
    return NextResponse.json({ 
      data: result.data || [], 
      branch: result.branch,
      timestamp: result.timestamp,
      success: result.success,
      total_records: result.total_records || 0,
      requested_by: result.requested_by,
      user_role: result.user_role
    })
  } catch (error) {
    console.error('❌ TL Performance API error:', error)
    
    // Handle different types of errors
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.error('❌ FastAPI connection error:', error.message)
      return NextResponse.json({ 
        error: 'Unable to connect to analytics backend service. Please ensure the FastAPI backend is running.',
        success: false,
        details: `FastAPI URL: ${FASTAPI_BASE_URL}`,
        errorType: 'CONNECTION_ERROR'
      }, { status: 503 })
    }
    
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      console.error('❌ FastAPI timeout error:', error.message)
      return NextResponse.json({ 
        error: 'Request timeout - analytics service took too long to respond',
        success: false,
        errorType: 'TIMEOUT_ERROR'
      }, { status: 504 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error - Failed to process analytics request',
      success: false,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 })
  }
}
