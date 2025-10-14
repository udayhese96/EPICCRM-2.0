import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    const response = await fetch(`${FASTAPI_URL}/api/leads${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // Fallback to Supabase direct query for export use-cases
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 })
        }
        const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
        let query = supabase.from('lead_master').select('*')
        const q = (searchParams.get('q') || '').trim()
        const branch = (searchParams.get('branch') || '').trim()
        const status = (searchParams.get('status') || '').trim()
        const category = (searchParams.get('category') || '').trim()
        const tradeIn = (searchParams.get('trade_in') || '').trim()
        const from = (searchParams.get('from') || '').trim()
        const to = (searchParams.get('to') || '').trim()

        if (q) query = query.or(`uid.ilike.%${q}%,customer_name.ilike.%${q}%,customer_mobile_number.ilike.%${q}%`)
        if (branch) query = query.eq('branch', branch)
        if (status) query = query.or(`lead_status.eq.${status},final_status.eq.${status}`)
        if (category) query = query.eq('lead_category', category)
        if (tradeIn) query = query.eq('trade_in', tradeIn)
        if (from) query = query.gte('created_at', from)
        if (to) {
          try { const d = new Date(to); d.setDate(d.getDate()+1); query = query.lt('created_at', d.toISOString()) } catch {}
        }

        const { data: rows, error } = await query.order('created_at', { ascending: false })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        const res = NextResponse.json(rows || [])
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        res.headers.set('Pragma', 'no-cache')
        res.headers.set('Expires', '0')
        return res
      } catch (e) {
        return NextResponse.json(
          { error: 'Failed to fetch leads' },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    const nextResponse = NextResponse.json(data)
    nextResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    nextResponse.headers.set('Pragma', 'no-cache')
    nextResponse.headers.set('Expires', '0')
    return nextResponse
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${FASTAPI_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to create lead' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
