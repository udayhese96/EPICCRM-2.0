import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_ids, transfer_type, from_id, to_id, to_name } = body

    // Validation
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs are required' },
        { status: 400 }
      )
    }

    if (!transfer_type || !['cre', 'ps'].includes(transfer_type)) {
      return NextResponse.json(
        { error: 'Invalid transfer type. Must be "cre" or "ps"' },
        { status: 400 }
      )
    }

    if (!from_id || !to_id || !to_name) {
      return NextResponse.json(
        { error: 'Missing transfer parameters' },
        { status: 400 }
      )
    }

    // Initialize Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create Supabase client with unique request ID to bypass PostgREST cache
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Request-ID': `${Date.now()}-${Math.random()}` // Force unique request
        }
      }
    })

    const timestamp = new Date().toISOString()
    let transferred = 0
    let failed = 0
    const errors: string[] = []

    // Process each lead
    for (const leadId of lead_ids) {
      try {
        // 1. Fetch existing lead data
        const { data: existingLead, error: fetchError } = await supabase
          .from('lead_master')
          .select('*')
          .eq('id', leadId)
          .single()

        if (fetchError || !existingLead) {
          console.error(`Lead ${leadId} not found:`, fetchError)
          failed++
          errors.push(`Lead ${leadId}: Not found`)
          continue
        }

        // 2. Build transfer history
        const metadata = typeof existingLead.metadata === 'object' 
          ? existingLead.metadata 
          : {}
        
        const transferHistory = Array.isArray(metadata.transfer_history) 
          ? metadata.transfer_history 
          : []

        transferHistory.push({
          type: transfer_type === 'cre' ? 'cre_transferred' : 'ps_transferred',
          from: transfer_type === 'cre' ? existingLead.cre_name : existingLead.ps_name,
          to: to_name,
          by: 'Admin',
          timestamp: timestamp
        })

        metadata.transfer_history = transferHistory

        // 3. Update lead_master
        const updateData: any = {
          metadata: metadata,
          updated_at: timestamp
        }

        if (transfer_type === 'cre') {
          updateData.cre_id = to_id
          updateData.cre_name = to_name
        } else {
          updateData.ps_id = to_id
          updateData.ps_name = to_name
        }

        const { error: updateError } = await supabase
          .from('lead_master')
          .update(updateData)
          .eq('id', leadId)

        if (updateError) {
          console.error(`Failed to update lead_master for ${leadId}:`, updateError)
          failed++
          errors.push(`Lead ${leadId}: ${updateError.message}`)
          continue
        }

        // 4. Update qualified_leads if CRE transfer
        if (transfer_type === 'cre' && existingLead.uid) {
          const { error: qlError } = await supabase
            .from('qualified_leads')
            .update({
              cre_id: to_id,
              cre_name: to_name,
              updated_at: timestamp
            })
            .eq('lead_uid', existingLead.uid)

          if (qlError) {
            console.warn(`Failed to update qualified_leads for ${existingLead.uid}:`, qlError)
          }
        }

        // 5. Update ps_followup_master if PS transfer
        if (transfer_type === 'ps' && existingLead.uid) {
          const { error: pfError } = await supabase
            .from('ps_followup_master')
            .update({
              ps_id: to_id,
              ps_name: to_name,
              updated_at: timestamp
            })
            .eq('lead_uid', existingLead.uid)

          if (pfError) {
            console.warn(`Failed to update ps_followup_master for ${existingLead.uid}:`, pfError)
          }
        }

        transferred++

      } catch (error: any) {
        console.error(`Error processing lead ${leadId}:`, error)
        failed++
        errors.push(`Lead ${leadId}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: transferred > 0,
      transferred,
      failed,
      total: lead_ids.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Transfer API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

