import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
// Allow framework caching with short revalidation
export const dynamic = 'auto'

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
if (process.env.NODE_ENV === 'development') {
  console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
}

export async function GET(request: NextRequest) {
  const start = Date.now()
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') || ''
  const name = searchParams.get('name') || ''
  const forceRefresh = searchParams.get('refresh') === '1'
  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const url = new URL(`${FASTAPI_BASE_URL}/api/public/cre-assigned/${encodeURIComponent(username)}`)
  if (name) url.searchParams.set('name', name)
  // Only append cache-buster when explicitly requested
  if (forceRefresh) url.searchParams.set('_t', String(Date.now()))

  if (process.env.NODE_ENV === 'development') {
    console.log(`[cre-assigned] ${Date.now() - start}ms: starting fetch -> ${url.toString()}`)
  }
  const resp = await fetch(url.toString(), {
    next: { revalidate: 30 },
    headers: { 'Accept-Encoding': 'gzip, br' },
  })

  if (process.env.NODE_ENV === 'development') {
    console.log(`[cre-assigned] ${Date.now() - start}ms: fetch complete (status ${resp.status})`)
  }
  if (!resp.ok) {
    const body = await resp.text()
    return NextResponse.json(
      { error: 'Upstream error', body },
      {
        status: resp.status,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[cre-assigned] ${Date.now() - start}ms: streaming response`)
  }
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=30',
    },
  })
}


