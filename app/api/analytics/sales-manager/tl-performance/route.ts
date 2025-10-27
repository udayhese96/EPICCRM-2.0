import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callFastAPIWithRetry(branch: string, authToken: string, retries = MAX_RETRIES): Promise<Response> {
  try {
    const url = `${FASTAPI_BASE_URL}/analytics/sales-manager/tl-performance?branch=${encodeURIComponent(branch)}`
    console.log(`🔄 Calling FastAPI: ${url}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok && retries > 0) {
      console.warn(`FastAPI call failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`)
      await sleep(RETRY_DELAY)
      return callFastAPIWithRetry(branch, authToken, retries - 1)
    }

    return response
  } catch (error) {
    if (retries > 0) {
      console.warn(`FastAPI call error, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`, error)
      await sleep(RETRY_DELAY)
      return callFastAPIWithRetry(branch, authToken, retries - 1)
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch')

    // Validate branch parameter
    if (!branch || branch.trim() === '') {
      return NextResponse.json({ 
        error: 'Branch parameter is required and cannot be empty',
        success: false 
      }, { status: 400 })
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

    // Call FastAPI backend with retry logic and authentication
    const fastApiResponse = await callFastAPIWithRetry(branch, authToken)

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
