import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callFastAPIWithRetry(params: string, authToken: string, retries = MAX_RETRIES): Promise<Response> {
  try {
    const url = `${FASTAPI_BASE_URL}/analytics/sales-manager/source-leads?${params}`
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
    const source = searchParams.get('source')
    const subSource = searchParams.get('sub_source')

    if (!branch || branch.trim() === '') {
      return NextResponse.json({ 
        error: 'Branch parameter is required and cannot be empty',
        success: false 
      }, { status: 400 })
    }
    
    if (!source || source.trim() === '') {
      return NextResponse.json({ 
        error: 'Source name parameter is required and cannot be empty',
        success: false 
      }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authentication required. Please provide a valid token.',
        success: false 
      }, { status: 401 })
    }

    const authToken = authHeader.substring(7)
    console.log(`🔄 Fetching Source leads data for branch: ${branch}, source: ${source}, sub_source: ${subSource || 'N/A'}`)
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)

    const params = new URLSearchParams({
      branch,
      source
    })
    if (subSource) {
      params.append('sub_source', subSource)
    }

    const fastApiResponse = await callFastAPIWithRetry(params.toString(), authToken)

    if (!fastApiResponse.ok) {
      let errorMessage = 'Failed to fetch Source leads data from backend'
      
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

    console.log(`✅ Successfully fetched Source leads data for branch: ${branch}, source: ${source} - ${result.count} leads`)
    
    return NextResponse.json({ 
      leads: result.leads || [], 
      count: result.count || 0,
      branch: result.branch,
      source: result.source,
      sub_source: result.sub_source,
      timestamp: result.timestamp,
      success: result.success,
      requested_by: result.requested_by
    })
  } catch (error) {
    console.error('❌ Source leads drill-down API error:', error)
    
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

