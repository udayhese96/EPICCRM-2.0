import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || process.env.FASTAPI_URL || 'http://localhost:8000'
    
    console.log('[DEBUG] Testing FastAPI connection...')
    console.log('[DEBUG] FASTAPI_URL:', fastApiUrl)
    console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV)
    
    // Test basic connectivity to FastAPI
    const healthUrl = `${fastApiUrl}/api/health`
    console.log('[DEBUG] Testing health endpoint:', healthUrl)
    
    const startTime = Date.now()
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const responseTime = Date.now() - startTime
    
    console.log('[DEBUG] Health check response status:', response.status)
    console.log('[DEBUG] Health check response time:', responseTime, 'ms')
    console.log('[DEBUG] Health check response headers:', Object.fromEntries(response.headers.entries()))
    
    let responseBody = 'No body'
    try {
      responseBody = await response.text()
      console.log('[DEBUG] Health check response body:', responseBody)
    } catch (e) {
      console.log('[DEBUG] Could not read response body:', e)
    }
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseTime: responseTime,
      fastApiUrl: fastApiUrl,
      healthUrl: healthUrl,
      responseBody: responseBody,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[DEBUG] FastAPI connection test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      fastApiUrl: process.env.NEXT_PUBLIC_FASTAPI_URL || process.env.FASTAPI_URL || 'http://localhost:8000',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
