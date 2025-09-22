import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { lead_id } = await request.json()
    console.log('🔍 [Deassign API] Received request with lead_id:', lead_id)

    if (!lead_id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    console.log('🔍 [Deassign API] Authorization header:', authHeader ? 'Present' : 'Missing')

    const fastApiUrl = `${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/api/qualified-leads/deassign`
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
