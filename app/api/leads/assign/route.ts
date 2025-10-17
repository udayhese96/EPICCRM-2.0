import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Assignment API] Request body:', body)

    const { lead_ids, cre_id, cre_name } = body || {}

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: 'Lead UIDs are required' }, { status: 400 })
    }
    if (!cre_id || !cre_name) {
      return NextResponse.json({ error: 'CRE ID and name are required' }, { status: 400 })
    }

    const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')
    const authHeader = request.headers.get('Authorization') || ''

    let resp = await fetch(`${FASTAPI_URL}/api/leads/assign`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ lead_ids, cre_id, cre_name })
    })

    let text = await resp.text()
    let data: any
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { message: text }
    }

    if (!resp.ok) {
      console.error('[Assignment API] Backend error:', resp.status, data)
      // Fallback: write directly to Supabase using service role
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: data.detail || data.error || 'Failed to assign leads' }, { status: resp.status })
      }
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      const now = new Date().toISOString()
      let assigned = 0
      const errors: string[] = []
      for (const leadUidRaw of lead_ids as string[]) {
        const leadUid = String(leadUidRaw)
        const { error } = await supabase
          .from('lead_master')
          .update({ cre_id, cre_name, assigned: 'Yes', cre_assigned_at: now, updated_at: now })
          .eq('uid', leadUid)
        if (error) {
          errors.push(`${leadUid}: ${error.message}`)
        } else {
          assigned++
        }
      }
      const result = { success: assigned > 0, assigned, failed: (lead_ids?.length || 0) - assigned, total: lead_ids?.length || 0, cre_id, cre_name, errors: errors.length ? errors : undefined }
      const status = assigned > 0 ? 200 : resp.status
      console.log('[Assignment API] Fallback result:', result)
      return NextResponse.json(result, { status })
    }

    console.log('[Assignment API] Backend success:', data)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Assignment API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
