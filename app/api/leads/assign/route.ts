import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Assignment API] Request body:', body)
    
    const { lead_ids, cre_id, cre_name } = body

    // Validation
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'Lead UIDs are required' },
        { status: 400 }
      )
    }

    if (!cre_id || !cre_name) {
      return NextResponse.json(
        { error: 'CRE ID and name are required' },
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    const timestamp = new Date().toISOString()
    let assigned = 0
    let failed = 0
    const errors: string[] = []

    // Update each lead
    for (const leadUid of lead_ids) {
      try {
        // Update lead_master
        const { error: updateError } = await supabase
          .from('lead_master')
          .update({
            cre_id: cre_id,
            cre_name: cre_name,
            assigned: 'Yes',
            updated_at: timestamp
          })
          .eq('uid', leadUid)

        if (updateError) {
          console.error(`Failed to assign lead ${leadUid}:`, updateError)
          failed++
          errors.push(`Lead ${leadUid}: ${updateError.message}`)
          continue
        }

        // Update qualified_leads if it exists
        const { error: qlError } = await supabase
          .from('qualified_leads')
          .update({
            cre_id: cre_id,
            cre_name: cre_name,
            updated_at: timestamp
          })
          .eq('lead_uid', leadUid)

        if (qlError) {
          console.warn(`Failed to update qualified_leads for ${leadUid}:`, qlError)
        }

        assigned++

      } catch (error: any) {
        console.error(`Error assigning lead ${leadUid}:`, error)
        failed++
        errors.push(`Lead ${leadUid}: ${error.message}`)
      }
    }

    const result = {
      success: assigned > 0,
      assigned,
      failed,
      total: lead_ids.length,
      cre_id,
      cre_name,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log('[Assignment API] Result:', result)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Assignment API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
