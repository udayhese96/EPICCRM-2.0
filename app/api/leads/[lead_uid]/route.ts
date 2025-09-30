import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest, { params }: { params: { lead_uid: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const response = await fetch(`${FASTAPI_URL}/api/public/lead-master/${encodeURIComponent(params.lead_uid)}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Lead details fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead details' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { lead_uid: string } }) {
  try {
    const body = await request.json()
    
    // 🔍 Enhanced Debug Logging
    console.log('🔄 [API Route] Received request for lead:', params.lead_uid)
    console.log('🔄 [API Route] Request body:', JSON.stringify(body, null, 2))
    console.log('🔍 [API Route] followup_note analysis:', {
      has_followup_note: 'followup_note' in body,
      followup_note_value: body.followup_note,
      followup_note_type: typeof body.followup_note,
      followup_note_truthy: !!body.followup_note,
      all_keys: Object.keys(body)
    })
    
    const resp = await fetch(`${FASTAPI_URL}/api/public/lead-master/${encodeURIComponent(params.lead_uid)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    // 🔍 Log what we're sending to FastAPI
    console.log('📤 [API Route] Forwarding to FastAPI:', JSON.stringify(body, null, 2))
    
    const text = await resp.text()
    
    // 🔍 Log FastAPI response
    console.log('📥 [API Route] FastAPI response status:', resp.status)
    console.log('📥 [API Route] FastAPI response body:', text)
    
    if (!resp.ok) {
      console.error('❌ [API Route] FastAPI error:', resp.status, text)
      return NextResponse.json({ error: 'Upstream error', body: text }, { status: resp.status })
    }
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 })
    }
  } catch (e: any) {
    console.error('❌ [API Route] Error:', e)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
