import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    // Always use public lead_master updater by UID
    const resp = await fetch(`${FASTAPI_URL}/api/public/lead-master/${encodeURIComponent(params.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const text = await resp.text()
    if (!resp.ok) {
      return NextResponse.json({ error: 'Upstream error', body: text }, { status: resp.status })
    }
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


