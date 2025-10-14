import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creId = searchParams.get('cre_id')
    const excludeIdsParam = searchParams.get('exclude_ids') // comma-separated ids
    const excludeUidsParam = searchParams.get('exclude_uids') // comma-separated uids
    
    if (!creId) {
      return NextResponse.json(
        { error: 'cre_id is required' },
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
    // Add unique request ID to force cache bypass in Supabase client
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
    console.log('CRE Leads API - Fetching for CRE ID:', creId)
    console.log('Timestamp:', new Date().toISOString())
    console.log('Exclude IDs:', excludeIdsParam || 'none')
    console.log('Exclude UIDs:', excludeUidsParam || 'none')
    
    // Fetch leads from lead_master (cache is bypassed via X-Request-ID header)
    const { data: leads, error: queryError } = await supabase
      .from('lead_master')
      .select('*')
      .eq('cre_id', creId)
      .in('final_status', ['Pending', 'Follow-up'])
      .order('updated_at', { ascending: false })

    if (queryError) {
      console.error('Query error:', queryError.message)
      return NextResponse.json(
        { error: 'Failed to fetch CRE leads from database' },
        { status: 500 }
      )
    }

    console.log('Fetched leads:', leads?.length || 0)
    
    // Strict server-side filter - only keep rows where cre_id matches exactly
    const strictlyFiltered = (leads || []).filter((l: any) => {
      const leadCreId = String(l.cre_id || '').trim()
      const requestedCreId = String(creId || '').trim()
      return leadCreId === requestedCreId
    })
    console.log('After cre_id filter:', strictlyFiltered.length, 'leads')

    // Apply exclusions by id
    let finalLeads = strictlyFiltered
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
        finalLeads = finalLeads.filter((l: any) => !excludeIds.has(l.id))
      }
    }
    
    // Apply exclusions by uid
    if (excludeUidsParam) {
      const excludeUids = new Set(
        excludeUidsParam
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      )
      if (excludeUids.size > 0) {
        finalLeads = finalLeads.filter((l: any) => !excludeUids.has(String(l.uid || '')))
      }
    }

    console.log('Final leads count:', finalLeads.length)
    console.log('========================================')
    
    return NextResponse.json(
      { leads: finalLeads },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error: any) {
    console.error('Error in CRE leads API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

