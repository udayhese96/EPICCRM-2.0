import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const psId = searchParams.get('ps_id')
    const branch = searchParams.get('branch')
    const excludeIdsParam = searchParams.get('exclude_ids')
    const excludeUidsParam = searchParams.get('exclude_uids')
    
    if (!psId || !branch) {
      return NextResponse.json(
        { error: 'ps_id and branch are required' },
        { status: 400 }
      )
    }

    // CRITICAL: Validate that service role key is available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
      console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not set')
      return NextResponse.json(
        { error: 'Server configuration error: Supabase URL not configured' },
        { status: 500 }
      )
    }
    
    if (!supabaseServiceKey) {
      console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
      console.error('The service role key is REQUIRED for admin operations to bypass RLS policies')
      console.error('Please set SUPABASE_SERVICE_ROLE_KEY in your Netlify environment variables')
      return NextResponse.json(
        { 
          error: 'Server configuration error: Service role key not configured. This is required for admin operations. Please contact your administrator to set SUPABASE_SERVICE_ROLE_KEY in the environment variables.',
          details: 'The SUPABASE_SERVICE_ROLE_KEY environment variable must be set in your production environment (Netlify) to enable admin operations like lead transfer. The anon key cannot be used as it is subject to RLS policies.'
        },
        { status: 500 }
      )
    }
    
    // Create Supabase client with service role key (bypasses RLS)
    // Create Supabase client with unique request ID to force cache bypass
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Request-ID': `${Date.now()}-${Math.random()}` // Force unique request to bypass PostgREST cache
        }
      }
    })
    
    console.log('========================================')
    console.log('PS Leads API - Fetching for PS ID:', psId, 'Branch:', branch)
    console.log('Timestamp:', new Date().toISOString())
    console.log('Exclude IDs:', excludeIdsParam || 'none')
    console.log('Exclude UIDs:', excludeUidsParam || 'none')
    
    // Fetch PS followup leads (cache is bypassed via X-Request-ID header)
    const { data: followups, error: queryError } = await supabase
      .from('ps_followup_master')
      .select('*')
      .eq('ps_id', psId)
      .ilike('ps_branch', branch)
      .order('created_at', { ascending: false })
    
    if (queryError) {
      console.error('Query error:', queryError.message)
      return NextResponse.json(
        { error: 'Failed to fetch PS leads from database' },
        { status: 500 }
      )
    }
    
    console.log('Query returned:', (followups || []).length, 'PS followups')
    
    // GUARD 3: Map to lead_master id for UI consistency using lead_uid
    const result = [] as any[]
    if (followups && followups.length > 0) {
      // Batch map by uids to get lead_master.id
      const uids = followups.map((f: any) => f.lead_uid).filter(Boolean)
      if (uids.length > 0) {
        const { data: lmRows } = await supabase
          .from('lead_master')
          .select('id, uid')
          .in('uid', uids)
        const uidToId = new Map((lmRows || []).map((r: any) => [r.uid, r.id]))
        
        for (const f of followups) {
          result.push({
            // Map to lead_master.id for transfer API
            id: uidToId.get(f.lead_uid) || null,
            uid: f.lead_uid,
            customer_name: f.customer_name,
            customer_mobile_number: f.customer_mobile_number,
            lead_status: f.lead_status,
            final_status: f.final_status,
            source: f.source,
            sub_source: f.sub_source,
            model_interested: f.model_interested,
            branch: f.ps_branch,
            ps_name: f.ps_name,
            ps_id: f.ps_id,
            cre_name: f.cre_name,
            cre_id: f.cre_id,
            metadata: f.metadata || {}
          })
        }
      }
    }
    
    // GUARD 4: Strict server-side filter - only keep rows where ps_id matches exactly
    let filtered = result.filter((r: any) => {
      const leadPsId = String(r.ps_id || '').trim()
      const requestedPsId = String(psId || '').trim()
      return leadPsId === requestedPsId
    })
    console.log('After strict ps_id filter:', filtered.length, 'leads')
    
    // GUARD 5: Apply exclusions by id
    if (excludeIdsParam) {
      const excludeIds = new Set(
        excludeIdsParam
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(v => Number(v))
          .filter(n => !isNaN(n))
      )
      if (excludeIds.size > 0) {
        console.log('Applying exclude_ids:', Array.from(excludeIds))
        filtered = filtered.filter((r: any) => !excludeIds.has(Number(r.id)))
      }
    }
    
    // GUARD 6: Apply exclusions by uid
    if (excludeUidsParam) {
      const excludeUids = new Set(
        excludeUidsParam
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      )
      if (excludeUids.size > 0) {
        console.log('Applying exclude_uids:', Array.from(excludeUids))
        filtered = filtered.filter((r: any) => !excludeUids.has(String(r.uid || '')))
      }
    }

    console.log('Final PS leads count:', filtered.length)
    console.log('Final UIDs:', filtered.map((l: any) => l.uid).join(', '))
    
    // Log sample for debugging
    if (filtered.length > 0) {
      console.log('Sample lead (first):', {
        id: filtered[0].id,
        uid: filtered[0].uid,
        ps_name: filtered[0].ps_name,
        ps_id: filtered[0].ps_id,
        customer_name: filtered[0].customer_name
      })
    }
    console.log('========================================')
    
    return NextResponse.json(
      { leads: filtered },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error: any) {
    console.error('Error in PS leads API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

