import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cacheBuster = searchParams.get('_t') || `${Date.now()}`
    const bearer = request.headers.get('Authorization') || (request.cookies.get('access_token') ? `Bearer ${request.cookies.get('access_token')!.value}` : '')
    
    // Resolve branch on the server for sales_manager to prevent cross-branch visibility
    let branchFilter = searchParams.get('branch') || ''
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, branch')
          .eq('id', user.id)
          .single()
        if (profile?.role === 'sales_manager' && profile.branch) {
          branchFilter = profile.branch
        }
      }
    } catch (_) {
      // Non-fatal; fall back to query param if available
    }
    
    // Build FastAPI URL with optional branch filter
    let fastapiUrl = `${FASTAPI_URL}/api/qualified-leads/pending-approvals?_t=${cacheBuster}`
    if (branchFilter) {
      fastapiUrl += `&branch=${encodeURIComponent(branchFilter)}`
      console.log(`[Pending Approvals API] Filtering by branch: ${branchFilter}`)
    }
    
    const response = await fetch(fastapiUrl, {
      method: 'GET',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })

    let data: any
    if (!response.ok) {
      // Fallback: fetch all then filter by branch on the server to avoid exposing cross-branch data
      const fallbackUrl = `${FASTAPI_URL}/api/qualified-leads/pending-approvals?_t=${cacheBuster}`
      const fbResp = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Authorization': bearer,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      })
      const fbText = await fbResp.text()
      try {
        const all = fbText ? JSON.parse(fbText) : []
        if (Array.isArray(all) && branchFilter) {
          data = all.filter((r: any) => {
            const b = (r.branch || r.ps_branch || '').trim()
            return b && b.toLowerCase() === branchFilter.toLowerCase()
          })
        } else {
          data = []
        }
      } catch (_) {
        return NextResponse.json(
          { error: 'Failed to fetch pending approval requests' },
          { status: response.status }
        )
      }
    } else {
      data = await response.json()
    }

    const res = NextResponse.json(data)
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Expires', '0')
    return res
  } catch (error) {
    console.error('Error fetching pending approval requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
