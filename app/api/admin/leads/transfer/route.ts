import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, from_id, to_id, lead_ids, from_name, to_name, branch } = body
    
    console.log('Transfer request:', { type, from_id, to_id, lead_ids, from_name, to_name, branch })
    
    if (!type || !from_id || !to_id || !lead_ids || !Array.isArray(lead_ids)) {
      return NextResponse.json(
        { error: 'Missing required fields: type, from_id, to_id, lead_ids' },
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
    
    // Create Supabase client with service role key to bypass RLS
    // Add unique request ID to bypass PostgREST cache
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Request-ID': `${Date.now()}-${Math.random()}` // Force unique request
        }
      }
    })

    // Get user details for the target user
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('username, full_name')
      .eq('id', to_id)
      .single()
    
    if (userError || !targetUser) {
      console.error('Error fetching target user:', userError)
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    const targetName = targetUser.full_name || targetUser.username
    let updateData: any = {}
    
    if (type === 'cre') {
      updateData = {
        cre_id: to_id,
        cre_name: targetName,
        updated_at: new Date().toISOString()
      }
    } else if (type === 'ps') {
      updateData = {
        ps_id: to_id,
        ps_name: targetName,
        updated_at: new Date().toISOString()
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid transfer type. Must be "cre" or "ps"' },
        { status: 400 }
      )
    }

    console.log(`========================================`)
    console.log(`Transfer API - ${type.toUpperCase()} Transfer`)
    console.log(`From: ${from_name} (${from_id})`)
    console.log(`To: ${targetName} (${to_id})`)
    console.log(`Lead count: ${lead_ids.length}`)
    console.log(`Timestamp: ${new Date().toISOString()}`)
    
    // Update leads in batches to avoid timeout
    const batchSize = 50
    let transferred = 0
    let failed = 0
    const errors: string[] = []
    const allLeadUids: string[] = []
    
    for (let i = 0; i < lead_ids.length; i += batchSize) {
      const batch = lead_ids.slice(i, i + batchSize)
      
      try {
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(lead_ids.length/batchSize)}`)
        
        // 1) Fetch existing data to build transfer history
        const { data: existingRows } = await supabase
          .from('lead_master')
          .select('id, uid, metadata, cre_name, ps_name')
          .in('id', batch)

        if (!existingRows || existingRows.length === 0) {
          console.warn(`Batch ${Math.floor(i/batchSize) + 1}: No rows found for IDs:`, batch)
          failed += batch.length
          continue
        }

        // Collect UIDs for later sync
        existingRows.forEach((r: any) => {
          if (r.uid) allLeadUids.push(r.uid)
        })

        // 2) Build metadata with transfer history for each row
        const historyTimestamp = new Date().toISOString()
        const metadataUpdates = (existingRows || []).map((row: any) => {
          const meta = typeof row.metadata === 'object' ? row.metadata : (row.metadata ? JSON.parse(row.metadata) : {})
          const history = Array.isArray(meta.transfer_history) ? meta.transfer_history : []
          history.push({
            type: type === 'cre' ? 'cre_transferred' : 'ps_transferred',
            from: type === 'cre' ? (row.cre_name || from_name) : (row.ps_name || from_name),
            to: targetName,
            by: 'Admin',
            timestamp: historyTimestamp
          })
          meta.transfer_history = history
          return { id: row.id, uid: row.uid, metadata: meta }
        })

        // 3) Update lead_master with new CRE/PS assignment
        const updateQuery = supabase
          .from('lead_master')
          .update(updateData)
          .in('id', batch)
        // Concurrency guard: only move rows still owned by the source user
        if (type === 'cre') {
          updateQuery.eq('cre_id', from_id)
        } else {
          updateQuery.eq('ps_id', from_id)
        }
        const { data: updateResult, error: updateError } = await updateQuery
          .select('id, uid, cre_id, cre_name, ps_id, ps_name')
        
        if (updateError) {
          console.error(`Batch ${Math.floor(i/batchSize) + 1} update error:`, updateError)
          failed += batch.length
          errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${updateError.message}`)
          continue
        }

        // 4) Update metadata row-wise to append transfer history
        for (const row of metadataUpdates) {
          await supabase.from('lead_master').update({ metadata: row.metadata }).eq('id', row.id)
        }

        console.log(`Batch ${Math.floor(i/batchSize) + 1} transferred successfully:`, updateResult?.length || 0, 'leads')
        transferred += batch.length

      } catch (error: any) {
        console.error(`Batch ${Math.floor(i/batchSize) + 1} error:`, error)
        failed += batch.length
        errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`)
      }
    }

    console.log(`Core transfer completed: ${transferred} transferred, ${failed} failed`)
    
    // 5) Sync to related tables (ps_followup_master for PS, qualified_leads for CRE)
    try {
      if (type === 'ps' && allLeadUids.length > 0) {
        console.log('Syncing to ps_followup_master for', allLeadUids.length, 'leads')
        const { error: pfError } = await supabase
          .from('ps_followup_master')
          .update({ ps_id: to_id, ps_name: targetName, updated_at: new Date().toISOString() })
          .in('lead_uid', allLeadUids)
        
        if (pfError) {
          console.error('ps_followup_master sync error:', pfError)
        } else {
          // Also append transfer history in ps_followup_master metadata
          const { data: pfRows } = await supabase
            .from('ps_followup_master')
            .select('id, metadata')
            .in('lead_uid', allLeadUids)
          
          for (const r of pfRows || []) {
            const meta = typeof r.metadata === 'object' ? r.metadata : (r.metadata ? JSON.parse(r.metadata) : {})
            const history = Array.isArray(meta.transfer_history) ? meta.transfer_history : []
            history.push({ 
              type: 'ps_transferred', 
              from: from_name, 
              to: targetName, 
              by: 'Admin', 
              timestamp: new Date().toISOString() 
            })
            meta.transfer_history = history
            await supabase.from('ps_followup_master').update({ metadata: meta }).eq('id', r.id)
          }
          console.log('ps_followup_master sync completed')
        }
      }
      
      if (type === 'cre' && allLeadUids.length > 0) {
        console.log('Syncing to qualified_leads for', allLeadUids.length, 'lead UIDs')
        
        // IMPORTANT: qualified_leads uses lead_uid (not lead_id which is numeric)
        const { error: qlError } = await supabase
          .from('qualified_leads')
          .update({ cre_id: to_id, cre_name: targetName, updated_at: new Date().toISOString() })
          .in('lead_uid', allLeadUids)
        
        if (qlError) {
          console.error('qualified_leads sync error:', qlError)
          console.error('Attempted to update UIDs:', allLeadUids)
        } else {
          console.log('qualified_leads CRE assignment updated successfully')
          
          // Also append transfer history in qualified_leads metadata if it exists
          const { data: qlRows } = await supabase
            .from('qualified_leads')
            .select('id, metadata, lead_uid')
            .in('lead_uid', allLeadUids)
          
          console.log('Found', qlRows?.length || 0, 'rows in qualified_leads to update metadata')
          
          for (const r of qlRows || []) {
            const meta = typeof r.metadata === 'object' ? r.metadata : (r.metadata ? JSON.parse(r.metadata) : {})
            const history = Array.isArray(meta.transfer_history) ? meta.transfer_history : []
            history.push({ 
              type: 'cre_transferred', 
              from: from_name, 
              to: targetName, 
              by: 'Admin', 
              timestamp: new Date().toISOString() 
            })
            meta.transfer_history = history
            await supabase.from('qualified_leads').update({ metadata: meta }).eq('id', r.id)
          }
          console.log('qualified_leads sync completed with metadata updates')
        }
      }
    } catch (e: any) {
      console.error('Related tables sync error:', e.message)
    }
    
    console.log('========================================')

    const response = NextResponse.json({
      success: true,
      transferred,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully transferred ${transferred} leads from ${from_name} to ${targetName}`
    })

    // Force no-cache to ensure fresh data after transfer
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
    
  } catch (error: any) {
    console.error('Error in lead transfer API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
