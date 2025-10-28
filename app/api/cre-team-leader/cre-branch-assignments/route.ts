import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    console.log('[NextJS API] Auth header:', authHeader ? 'Present' : 'Missing')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[NextJS API] No valid auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('[NextJS API] Token length:', token.length)
    
    // Better environment variable handling
    const fastApiUrl = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'
    console.log('[NextJS API] FASTAPI_URL:', fastApiUrl)
    console.log('[NextJS API] NODE_ENV:', process.env.NODE_ENV)
    
    // Forward to FastAPI backend
    console.log('[NextJS API] Forwarding to FastAPI...')
    const fullUrl = `${fastApiUrl}/api/cre-team-leader/cre-branch-assignments`
    console.log('[NextJS API] Full URL:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('[NextJS API] FastAPI response status:', response.status)
    if (!response.ok) {
      const error = await response.text()
      console.log('[NextJS API] FastAPI error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch CRE branch assignments',
        details: error,
        url: fullUrl,
        status: response.status
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[NextJS API] Error fetching CRE branch assignments:', error)
    console.error('[NextJS API] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
