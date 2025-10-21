import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test different table name variations
    const tableTests = [
      'lead_master',
      'public.lead_master',
      'leads',
      'lead_data'
    ]
    
    const results = {}
    
    for (const tableName of tableTests) {
      try {
        // Test count query
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        // Test sample data
        const { data, error: dataError } = await supabase
          .from(tableName)
          .select('*')
          .limit(3)
          .order('created_at', { ascending: false })
        
        results[tableName] = {
          count: count || 0,
          sample: data?.slice(0, 2) || [],
          countError: error?.message || null,
          dataError: dataError?.message || null
        }
      } catch (err) {
        results[tableName] = {
          count: 0,
          sample: [],
          countError: err.message,
          dataError: err.message
        }
      }
    }
    
    // Also test qualified_leads for comparison
    const { data: qualifiedLeadsData, error: qualifiedLeadsError } = await supabase
      .from('qualified_leads')
      .select('*')
      .limit(3)
      .order('created_at', { ascending: false })
    
    const { count: qualifiedLeadsCount, error: qualifiedCountError } = await supabase
      .from('qualified_leads')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      tableTests: results,
      qualifiedLeads: {
        sample: qualifiedLeadsData?.slice(0, 2) || [],
        count: qualifiedLeadsCount,
        error: qualifiedLeadsError?.message || null
      },
      summary: {
        qualifiedLeadsCount: qualifiedLeadsCount,
        qualifiedCountError: qualifiedCountError?.message
      }
    })

  } catch (error) {
    console.error('Error in test endpoint:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}
