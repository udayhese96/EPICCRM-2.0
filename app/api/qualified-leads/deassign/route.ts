import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { lead_id } = await request.json()
    console.log('🔍 [Deassign API] Received request with lead_id:', lead_id)

    if (!lead_id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    console.log('🔍 [Deassign API] Authorization header:', authHeader ? 'Present' : 'Missing')

    const fastApiUrl = `${process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')}/api/qualified-leads/deassign`
    console.log('🔍 [Deassign API] Forwarding to FastAPI:', fastApiUrl)

    // Forward the request to FastAPI
    const fastApiResponse = await fetch(fastApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
      body: JSON.stringify({ lead_id }),
    })

    console.log('🔍 [Deassign API] FastAPI response status:', fastApiResponse.status)
    const data = await fastApiResponse.json()
    console.log('🔍 [Deassign API] FastAPI response data:', data)

    if (!fastApiResponse.ok) {
      return NextResponse.json(data, { status: fastApiResponse.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ [Deassign API] Error in deassign API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
