import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[Test Connection] Environment variables check:');
    console.log('[Test Connection] SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.log('[Test Connection] ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
    console.log('[Test Connection] SERVICE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing');

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        details: {
          url: !!supabaseUrl,
          serviceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }

    // Test with service role key (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Test 1: Count total leads
    const { count: totalCount, error: countError } = await serviceClient
      .from('lead_master')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('[Test Connection] Count error:', countError);
      return NextResponse.json({
        error: 'Database query failed',
        details: countError.message
      }, { status: 500 });
    }

    // Test 2: Fetch sample leads
    const { data: sampleLeads, error: sampleError } = await serviceClient
      .from('lead_master')
      .select('id, name, source, sub_source, cre_name, lead_status, final_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (sampleError) {
      console.error('[Test Connection] Sample error:', sampleError);
      return NextResponse.json({
        error: 'Sample query failed',
        details: sampleError.message
      }, { status: 500 });
    }

    // Test 3: Check date range
    const { data: dateRange, error: dateError } = await serviceClient
      .from('lead_master')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1);

    const { data: dateRangeEnd, error: dateErrorEnd } = await serviceClient
      .from('lead_master')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      success: true,
      database: {
        totalLeads: totalCount,
        sampleLeads: sampleLeads?.length || 0,
        dateRange: {
          earliest: dateRange?.[0]?.created_at || null,
          latest: dateRangeEnd?.[0]?.created_at || null
        }
      },
      samples: sampleLeads?.map(lead => ({
        id: lead.id,
        name: lead.name,
        source: lead.source,
        subsource: lead.sub_source,
        cre: lead.cre_name,
        status: lead.lead_status,
        finalStatus: lead.final_status,
        createdAt: lead.created_at
      }))
    });
  } catch (error) {
    console.error('[Test Connection] Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: String(error)
    }, { status: 500 });
  }
}
