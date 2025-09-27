import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') || ''
  const name = searchParams.get('name') || ''
  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }
  const url = new URL(`${FASTAPI_URL}/api/public/cre-assigned/${encodeURIComponent(username)}`)
  if (name) url.searchParams.set('name', name)
  const resp = await fetch(url.toString(), {
    headers: { 'Cache-Control': 'no-store' }
  })
  if (!resp.ok) {
    const body = await resp.text()
    return NextResponse.json({ error: 'Upstream error', body }, { status: resp.status })
  }
  const data = await resp.json()
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}


