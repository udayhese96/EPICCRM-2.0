import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
    const resp = await fetch(`${FASTAPI_URL}/api/public/unassigned`, { method: 'GET' })
    const data = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to fetch unassigned' }, { status: resp.status })
    }
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


