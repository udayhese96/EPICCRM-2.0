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

    // Create Supabase client with no-store headers to bypass all caching
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    })
    
    console.log('========================================')
    console.log('CRE Leads API - Fetching for CRE ID:', creId)
    console.log('Timestamp:', new Date().toISOString())
    console.log('Exclude IDs:', excludeIdsParam || 'none')
    console.log('Exclude UIDs:', excludeUidsParam || 'none')
    
    // CRITICAL: Fetch with timestamp-based cache busting to defeat replica lag
    // Use a slightly delayed retry strategy to ensure we get fresh data
    let leads: any[] = []
    let attempts = 0
    const maxAttempts = 2
    
    while (attempts < maxAttempts) {
      attempts++
      const { data: queryData, error: queryError } = await supabase
        .from('lead_master')
        .select('*')
        .eq('cre_id', creId)
        .order('created_at', { ascending: false })
      
      if (queryError) {
        console.error(`Query attempt ${attempts} error:`, queryError.message)
        if (attempts >= maxAttempts) {
          return NextResponse.json(
            { error: 'Failed to fetch CRE leads from database' },
            { status: 500 }
          )
        }
        await new Promise(resolve => setTimeout(resolve, 50))
        continue
      }
      
      leads = queryData || []
      
      // If this is a re-query for a recently transferred lead, ensure consistency
      // by checking if returned cre_id matches exactly
      const allMatch = leads.every((l: any) => String(l.cre_id).trim() === String(creId).trim())
      if (!allMatch && attempts < maxAttempts) {
        console.warn(`Attempt ${attempts}: Some leads have mismatched cre_id, retrying...`)
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }
      
      break
    }
    
    console.log('Query returned:', leads.length, 'leads after', attempts, 'attempts')
    
    // GUARD 3: Strict server-side filter - only keep rows where cre_id matches exactly
    // This prevents stale data from other CREs appearing in the list
    const strictlyFiltered = leads.filter((l: any) => {
      const leadCreId = String(l.cre_id || '').trim()
      const requestedCreId = String(creId || '').trim()
      return leadCreId === requestedCreId
    })
    console.log('After strict cre_id filter:', strictlyFiltered.length, 'leads')

    // GUARD 4: Apply exclusions by id (for recently transferred leads)
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
        console.log('Applying exclude_ids:', Array.from(excludeIds))
        finalLeads = finalLeads.filter((l: any) => !excludeIds.has(l.id))
      }
    }
    
    // GUARD 5: Apply exclusions by uid
    if (excludeUidsParam) {
      const excludeUids = new Set(
        excludeUidsParam
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      )
      if (excludeUids.size > 0) {
        console.log('Applying exclude_uids:', Array.from(excludeUids))
        finalLeads = finalLeads.filter((l: any) => !excludeUids.has(String(l.uid || '')))
      }
    }

    console.log('Final leads count:', finalLeads.length)
    console.log('Final UIDs:', finalLeads.map((l: any) => l.uid).join(', '))
    
    // Log sample for debugging
    if (finalLeads.length > 0) {
      console.log('Sample lead (first):', {
        id: finalLeads[0].id,
        uid: finalLeads[0].uid,
        cre_name: finalLeads[0].cre_name,
        cre_id: finalLeads[0].cre_id,
        customer_name: finalLeads[0].customer_name,
        updated_at: finalLeads[0].updated_at
      })
    }
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

