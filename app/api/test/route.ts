import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')
  if (username) {
    // Proxy to FastAPI public endpoint for CRE assigned leads
    const resp = await fetch(`${FASTAPI_URL}/api/public/cre-assigned/${encodeURIComponent(username)}`, {
      headers: { 'Cache-Control': 'no-store' }
    })
    const data = await resp.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    fastapi_url: FASTAPI_URL
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return NextResponse.json({ 
      message: 'POST endpoint working!', 
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Invalid JSON data',
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }
}
