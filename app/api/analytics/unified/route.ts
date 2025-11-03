import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Use service role key to bypass RLS for analytics
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Unified Analytics] Missing Supabase environment variables');
      return NextResponse.json({
        error: 'Server configuration error',
        details: 'Missing Supabase credentials'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { searchParams } = new URL(request.url);
    
    const section = searchParams.get('section') || 'sourceCre'; // sourceCre | latestCall | statusSummary
    const filter = searchParams.get('filter') || 'all'; // all | today | range
    const sourceFilter = searchParams.get('source'); // Optional source filter
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    console.log(`[Unified Analytics] section=${section}, filter=${filter}, source=${sourceFilter}, startDate=${startDateParam}, endDate=${endDateParam}`);

    // Compute date bounds based on filter mode
    let startBound: string | null = null;
    let endBound: string | null = null;
    let dateRangeMode: 'all' | 'today' | 'range' = 'all';

    if (filter === 'all') {
      // All time: no bounds
      startBound = null;
      endBound = null;
      dateRangeMode = 'all';
    } else if (filter === 'today') {
      // Today: use provided startDate if available, otherwise use current date
      let today: Date;
      if (startDateParam) {
        today = new Date(startDateParam);
      } else {
        today = new Date();
      }
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      startBound = today.toISOString();
      endBound = tomorrow.toISOString();
      dateRangeMode = 'today';
    } else if (filter === 'range') {
      // Date range: startDate 00:00 to (endDate + 1 day) 00:00
      if (!startDateParam || !endDateParam) {
        return NextResponse.json({ error: 'startDate and endDate required for range filter' }, { status: 400 });
      }
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateParam);
      end.setDate(end.getDate() + 1);
      end.setHours(0, 0, 0, 0);
      startBound = start.toISOString();
      endBound = end.toISOString();
      dateRangeMode = 'range';
    }

    console.log(`[Unified Analytics] Date bounds: ${startBound || 'null'} to ${endBound || 'null'}`);

    // Build response based on section using direct aggregation
    if (section === 'sourceCre') {
      return await buildSourceCreResponseDirect(supabase, dateRangeMode, startBound, endBound, sourceFilter);
    } else if (section === 'latestCall') {
      return await buildLatestCallResponseDirect(supabase, dateRangeMode, startBound, endBound, sourceFilter);
    } else if (section === 'statusSummary') {
      return await buildStatusSummaryResponseDirect(supabase, dateRangeMode, startBound, endBound, sourceFilter);
    } else {
      return NextResponse.json({ error: 'Invalid section parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Unified Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Direct aggregation using Supabase query builder
async function buildSourceCreResponseDirect(
  supabase: any,
  mode: string,
  startBound: string | null,
  endBound: string | null,
  sourceFilter: string | null
) {
  console.log(`[buildSourceCreResponseDirect] Fetching with bounds: ${startBound} to ${endBound}, source: ${sourceFilter}`);

  // Build query with date filter
  let query = supabase
    .from('lead_master')
    .select('uid, source, sub_source, lead_status, final_status, cre_name, created_at');

  if (startBound) {
    query = query.gte('created_at', startBound);
  }
  if (endBound) {
    query = query.lt('created_at', endBound);
  }

  // Apply source filter if specified (not 'all')
  if (sourceFilter && sourceFilter !== 'all') {
    query = query.or(`source.eq.${sourceFilter},source.is.null`);
    // Filter for specific source or null (which becomes 'Unknown')
  }

  const { data: leads, error } = await query;

  if (error) {
    console.error('[buildSourceCreResponseDirect] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads data', details: error.message }, { status: 500 });
  }

  console.log(`[buildSourceCreResponseDirect] Fetched ${leads?.length || 0} leads`);

  // Fetch qualified leads from qualified_leads table
  let qualifiedLeadsQuery = supabase
    .from('qualified_leads')
    .select('lead_uid, created_at');

  if (startBound) {
    qualifiedLeadsQuery = qualifiedLeadsQuery.gte('created_at', startBound);
  }
  if (endBound) {
    qualifiedLeadsQuery = qualifiedLeadsQuery.lt('created_at', endBound);
  }

  const { data: qualifiedLeadsData, error: qualifiedError } = await qualifiedLeadsQuery;

  if (qualifiedError) {
    console.error('[buildSourceCreResponseDirect] Qualified leads query error:', qualifiedError);
  }

  // Create a Set of qualified lead UIDs for fast lookup
  const qualifiedLeadUids = new Set((qualifiedLeadsData || []).map(q => q.lead_uid));
  console.log(`[buildSourceCreResponseDirect] Found ${qualifiedLeadUids.size} qualified leads`);

  if (!leads || leads.length === 0) {
    return NextResponse.json({
      rows: [],
      overallCrePerformance: [],
      totalLeads: 0,
      noData: true, // Flag to indicate no data available
      dateRange: {
        mode,
        start: startBound ? startBound.split('T')[0] : null,
        end: endBound ? new Date(new Date(endBound).getTime() - 1).toISOString().split('T')[0] : null
      }
    });
  }

  // Aggregate in memory (fast since we're only working with filtered data)
  const sourceMap: Record<string, any> = {};
  const creMap: Record<string, any> = {};

  leads.forEach(lead => {
    const source = lead.source || 'Unknown';
    const subsource = lead.sub_source || '';
    const key = `${source}|||${subsource}`;

    if (!sourceMap[key]) {
      sourceMap[key] = {
        source,
        subsource,
        totalLeads: 0,
        qualified: 0,
        booked: 0,
        won: 0,  // Changed from 'retailed' to 'won'
        creCounts: {} as Record<string, number>
      };
    }

    const entry = sourceMap[key];
    entry.totalLeads++;

    // Check if lead is in qualified_leads table
    if (qualifiedLeadUids.has(lead.uid)) {
      entry.qualified++;
    }

    const finalStatus = (lead.final_status || '').toString().toLowerCase();
    if (finalStatus === 'booked') {
      entry.booked++;
    }
    // Only count final_status = 'won' (not 'retailed')
    if (finalStatus === 'won') {
      entry.won++;
    }

    const creName = lead.cre_name || 'Unassigned';
    entry.creCounts[creName] = (entry.creCounts[creName] || 0) + 1;

    // Also track overall CRE performance
    if (!creMap[creName]) {
      creMap[creName] = {
        creName,
        count: 0,
        qualified: 0,
        booked: 0,
        won: 0,  // Changed from 'retailed' to 'won'
        sources: new Set<string>()
      };
    }
    creMap[creName].count++;
    // Check if lead is in qualified_leads table
    if (qualifiedLeadUids.has(lead.uid)) {
      creMap[creName].qualified++;
    }
    if (finalStatus === 'booked') {
      creMap[creName].booked++;
    }
    // Only count final_status = 'won' (not 'retailed')
    if (finalStatus === 'won') {
      creMap[creName].won++;
    }
    creMap[creName].sources.add(source);
  });

  const rows = Object.values(sourceMap).map((data: any) => {
    let topCRE = 'N/A';
    let topCRELeads = 0;
    Object.entries(data.creCounts).forEach(([creName, count]: [string, any]) => {
      if (count > topCRELeads) {
        topCRE = creName;
        topCRELeads = count;
      }
    });

    return {
      source: data.source,
      subsource: data.subsource,
      totalLeads: data.totalLeads,
      qualified: data.qualified,
      booked: data.booked,
      retailed: data.won,  // Return 'won' as 'retailed' for backward compatibility with frontend
      conversionPct: data.totalLeads > 0 ? (data.won / data.totalLeads) * 100 : 0,  // Conversion based on 'won'
      topCRE,
      creLeads: topCRELeads
    };
  }).sort((a, b) => b.totalLeads - a.totalLeads);

  // Build overallCrePerformance array
  const overallCrePerformance = Object.values(creMap).map((cre: any) => ({
    creName: cre.creName,
    branch: '', // Not available in current data
    count: cre.count,
    qualified: cre.qualified,
    booked: cre.booked,
    retailed: cre.won,  // Return 'won' as 'retailed' for backward compatibility with frontend
    conversionRate: cre.count > 0 ? (cre.won / cre.count) * 100 : 0,  // Conversion based on 'won'
    sourceCount: cre.sources.size,
    sources: Array.from(cre.sources)
  })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    rows,
    overallCrePerformance,
    totalLeads: leads.length,
    dateRange: {
      mode,
      start: startBound ? startBound.split('T')[0] : null,
      end: endBound ? new Date(new Date(endBound).getTime() - 1).toISOString().split('T')[0] : null
    }
  });
}

async function buildLatestCallResponseDirect(
  supabase: any,
  mode: string,
  startBound: string | null,
  endBound: string | null,
  sourceFilter: string | null
) {
  console.log(`[buildLatestCallResponseDirect] Fetching with bounds: ${startBound} to ${endBound}, source: ${sourceFilter}`);

  let query = supabase
    .from('lead_master')
    .select('source, cre_name, lead_status, second_call_lead_status, third_call_lead_status, fourth_call_lead_status, fifth_call_lead_status, sixth_call_lead_status, created_at');

  if (startBound) {
    query = query.gte('created_at', startBound);
  }
  if (endBound) {
    query = query.lt('created_at', endBound);
  }

  // Apply source filter if specified (not 'all')
  if (sourceFilter && sourceFilter !== 'all') {
    query = query.or(`source.eq.${sourceFilter},source.is.null`);
  }

  const { data: leads, error } = await query;

  if (error) {
    console.error('[buildLatestCallResponseDirect] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads data', details: error.message }, { status: 500 });
  }

  console.log(`[buildLatestCallResponseDirect] Fetched ${leads?.length || 0} leads`);

  if (!leads || leads.length === 0) {
    return NextResponse.json({
      distribution: [],
      totalLeads: 0,
      summary: { totalStatuses: 0, sources: 0, topStatus: 'N/A', topStatusCount: 0 },
      uniqueSources: [],
      sourceWiseDistribution: [],
      noData: true, // Flag to indicate no data available
      dateRange: {
        mode,
        start: startBound ? startBound.split('T')[0] : null,
        end: endBound ? new Date(new Date(endBound).getTime() - 1).toISOString().split('T')[0] : null
      }
    });
  }

  // Track status with sources and CREs
  const statusMap: Record<string, {
    count: number;
    sources: Set<string>;
    cres: Set<string>;
  }> = {};

  const allSources = new Set<string>();
  const sourceStatusMap: Record<string, Record<string, number>> = {};

  leads.forEach(lead => {
    const source = lead.source || 'Unknown';
    const creName = lead.cre_name || 'Unassigned';
    
    allSources.add(source);

    let latestStatus = 'Unknown';
    if (lead.sixth_call_lead_status) latestStatus = lead.sixth_call_lead_status;
    else if (lead.fifth_call_lead_status) latestStatus = lead.fifth_call_lead_status;
    else if (lead.fourth_call_lead_status) latestStatus = lead.fourth_call_lead_status;
    else if (lead.third_call_lead_status) latestStatus = lead.third_call_lead_status;
    else if (lead.second_call_lead_status) latestStatus = lead.second_call_lead_status;
    else if (lead.lead_status) latestStatus = lead.lead_status;

    // Track overall status distribution with sources and CREs
    if (!statusMap[latestStatus]) {
      statusMap[latestStatus] = {
        count: 0,
        sources: new Set(),
        cres: new Set()
      };
    }
    statusMap[latestStatus].count++;
    statusMap[latestStatus].sources.add(source);
    statusMap[latestStatus].cres.add(creName);

    // Track source-wise status distribution
    if (!sourceStatusMap[source]) {
      sourceStatusMap[source] = {};
    }
    sourceStatusMap[source][latestStatus] = (sourceStatusMap[source][latestStatus] || 0) + 1;
  });

  const distribution = Object.entries(statusMap)
    .map(([status, data]) => ({ 
      latestCallStatus: status, 
      count: data.count,
      sourceCount: data.sources.size,
      creCount: data.cres.size,
      sources: Array.from(data.sources),
      cres: Array.from(data.cres)
    }))
    .sort((a, b) => b.count - a.count);

  // Build source-wise distribution
  const sourceWiseDistribution = Object.entries(sourceStatusMap).map(([source, statuses]) => {
    const totalLeads = Object.values(statuses).reduce((sum, count) => sum + count, 0);
    return {
      source,
      totalLeads,
      statusDistribution: Object.entries(statuses)
        .map(([status, count]) => ({
          status,
          count,
          percentage: ((count / totalLeads) * 100).toFixed(2)
        }))
        .sort((a, b) => b.count - a.count)
    };
  }).sort((a, b) => b.totalLeads - a.totalLeads);

  return NextResponse.json({
    distribution,
    totalLeads: leads.length,
    summary: {
      totalStatuses: distribution.length,
      sources: allSources.size,
      topStatus: distribution[0]?.latestCallStatus || 'N/A',
      topStatusCount: distribution[0]?.count || 0
    },
    uniqueSources: Array.from(allSources).sort(),
    sourceWiseDistribution,
    dateRange: {
      mode,
      start: startBound ? startBound.split('T')[0] : null,
      end: endBound ? new Date(new Date(endBound).getTime() - 1).toISOString().split('T')[0] : null
    }
  });
}

async function buildStatusSummaryResponseDirect(
  supabase: any,
  mode: string,
  startBound: string | null,
  endBound: string | null,
  sourceFilter: string | null
) {
  // Same as latest call
  return buildLatestCallResponseDirect(supabase, mode, startBound, endBound, sourceFilter);
}
