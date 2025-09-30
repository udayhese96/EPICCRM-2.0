import { NextRequest, NextResponse } from 'next/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') || ''
  const name = searchParams.get('name') || ''
  const cacheBuster = searchParams.get('_t') || `${Date.now()}`
  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }
  const url = new URL(`${FASTAPI_URL}/api/public/cre-assigned/${encodeURIComponent(username)}`)
  if (name) url.searchParams.set('name', name)
  url.searchParams.set('_t', cacheBuster)
  const resp = await fetch(url.toString(), {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    cache: 'no-store'
  })
  if (!resp.ok) {
    const body = await resp.text()
    return NextResponse.json({ error: 'Upstream error', body }, { status: resp.status, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' } })
  }
  const data = await resp.json()
  const next = NextResponse.json(data)
  next.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  next.headers.set('Pragma', 'no-cache')
  next.headers.set('Expires', '0')
  return next
}


