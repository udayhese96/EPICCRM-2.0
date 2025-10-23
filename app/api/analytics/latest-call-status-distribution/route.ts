import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    const branch = searchParams.get('branch') || null;
    const month = searchParams.get('month') || null;
    const sourceFilter = searchParams.get('source') || null;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Handle date range calculation
    let startDate: Date;
    let endDate: Date;
    
    if (startDateParam && endDateParam) {
      // Use custom date range
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else if (period === 'all') {
      // All time - use a very wide range
      startDate = new Date('2020-01-01');
      endDate = new Date();
    } else {
      // Use period-based calculation
      const days = parseInt(period) || 30;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      endDate = new Date();
    }

    console.log(`Fetching latest call lead status data from ${startDate.toISOString()} to ${new Date().toISOString()}`);

    // Fetch data using the same approach as other APIs
    let allLeadMaster = []
    let leadMasterError = null
    
    try {
      const { data, error } = await supabase
        .from('lead_master')
        .select('*')
      
      if (error) {
        console.error('Error fetching lead_master:', error)
        leadMasterError = error
      } else {
        allLeadMaster = data || []
        console.log(`Lead Master count: ${allLeadMaster.length}`)
      }
    } catch (err) {
      console.error('Exception fetching lead_master:', err)
      leadMasterError = err
    }
    
    // If still empty, try with direct Supabase client
    if (allLeadMaster.length === 0) {
      try {
        const directSupabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        const { data, error } = await directSupabase
          .from('lead_master')
          .select('*')
        
        if (!error && data) {
          allLeadMaster = data
          console.log(`Direct client query - Lead Master count: ${allLeadMaster.length}`)
        } else {
          console.error('Direct client error:', error)
        }
      } catch (err) {
        console.error('Exception with direct client:', err)
      }
    }
    
    // If still empty, try with service role key
    if (allLeadMaster.length === 0) {
      try {
        const serviceSupabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const { data, error } = await serviceSupabase
          .from('lead_master')
          .select('*')
        
        if (!error && data) {
          allLeadMaster = data
          console.log(`Service role query - Lead Master count: ${allLeadMaster.length}`)
        } else {
          console.error('Service role error:', error)
        }
      } catch (err) {
        console.error('Exception with service role:', err)
      }
    }

    if (leadMasterError) {
      console.error('Error fetching leads:', leadMasterError);
      return NextResponse.json({ error: 'Failed to fetch leads data' }, { status: 500 });
    }

    // Apply filtering with proper date range handling
    let filteredLeads
    if (period === 'all' && !startDateParam && !endDateParam) {
      filteredLeads = (allLeadMaster || []).filter((lead: any) => {
        const branchMatch = !branch || lead.branch === branch
        const monthMatch = month === 'all' || !month || (lead.created_at && lead.created_at.startsWith(month))
        const sourceMatch = !sourceFilter || sourceFilter === 'all' || getSourceWithSubsource(lead) === sourceFilter
        return branchMatch && monthMatch && sourceMatch
      })
    } else {
      filteredLeads = (allLeadMaster || []).filter((lead: any) => {
        const branchMatch = !branch || lead.branch === branch
        const monthMatch = month === 'all' || !month || (lead.created_at && lead.created_at.startsWith(month))
        const sourceMatch = !sourceFilter || sourceFilter === 'all' || getSourceWithSubsource(lead) === sourceFilter
        const dateMatch = !lead.created_at || (() => {
          const leadDate = new Date(lead.created_at);
          return leadDate >= startDate && leadDate <= endDate;
        })()
        return branchMatch && monthMatch && sourceMatch && dateMatch
      })
    }
    
    console.log(`After filtering - Lead Master: ${filteredLeads.length}`);
    console.log('Sample lead data:', filteredLeads.slice(0, 2));

    if (filteredLeads.length === 0) {
      return NextResponse.json({
        latestCallStatusDistribution: [],
        sourceWiseStatusDistribution: [],
        uniqueSources: ['all'],
        totalLeads: 0,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
          period,
          branch,
          month,
          source: sourceFilter,
        },
        message: 'No leads found for the selected period'
      })
    }

    // Function to get the latest call lead status
    const getLatestCallLeadStatus = (lead: any) => {
      // Check in order: sixth -> fifth -> fourth -> third -> second -> lead_status
      if (lead.sixth_call_lead_status && lead.sixth_call_lead_status.trim()) {
        return lead.sixth_call_lead_status;
      }
      if (lead.fifth_call_lead_status && lead.fifth_call_lead_status.trim()) {
        return lead.fifth_call_lead_status;
      }
      if (lead.fourth_call_lead_status && lead.fourth_call_lead_status.trim()) {
        return lead.fourth_call_lead_status;
      }
      if (lead.third_call_lead_status && lead.third_call_lead_status.trim()) {
        return lead.third_call_lead_status;
      }
      if (lead.second_call_lead_status && lead.second_call_lead_status.trim()) {
        return lead.second_call_lead_status;
      }
      // Fallback to main lead_status
      return lead.lead_status || 'Unknown';
    };

    // Function to get consolidated status (including pending reasons)
    const getConsolidatedStatus = (lead: any) => {
      const latestStatus = getLatestCallLeadStatus(lead);
      
      // If the status is pending and has pending reasons, consolidate them
      if (latestStatus.toLowerCase().includes('pending') && lead.pending_reasons && Array.isArray(lead.pending_reasons) && lead.pending_reasons.length > 0) {
        const pendingReasons = lead.pending_reasons.map((reasonItem: any) => {
          if (typeof reasonItem === 'string') {
            return reasonItem;
          } else if (typeof reasonItem === 'object' && reasonItem !== null) {
            return reasonItem.reason || reasonItem.status || reasonItem.description || JSON.stringify(reasonItem);
          } else {
            return String(reasonItem);
          }
        }).filter((reason: string) => reason && reason.trim());
        
        if (pendingReasons.length > 0) {
          return `Pending: ${pendingReasons.join(', ')}`;
        }
      }
      
      return latestStatus;
    };

    // Function to get source with subsource
    const getSourceWithSubsource = (lead: any) => {
      const source = lead.source || 'Unknown';
      const subsource = lead.sub_source || '';
      
      if (subsource && subsource.trim()) {
        return `${source} - ${subsource}`;
      }
      
      return source;
    };

    // Process data for latest call lead status distribution
    const latestCallStatusDistribution: any = {};
    const sourceWiseStatusDistribution: any = {};

    console.log('Processing leads for latest call status...');
    filteredLeads.forEach((lead: any, index: number) => {
      const sourceWithSubsource = getSourceWithSubsource(lead);
      const consolidatedStatus = getConsolidatedStatus(lead);
      const branch = lead.branch || 'Unknown';
      
      // Debug first few leads
      if (index < 3) {
        console.log(`Lead ${index}:`, {
          uid: lead.uid,
          source: lead.source,
          sub_source: lead.sub_source,
          sourceWithSubsource,
          consolidatedStatus,
          pending_reasons: lead.pending_reasons,
          lead_status: lead.lead_status,
          second_call_lead_status: lead.second_call_lead_status,
          third_call_lead_status: lead.third_call_lead_status,
          fourth_call_lead_status: lead.fourth_call_lead_status,
          fifth_call_lead_status: lead.fifth_call_lead_status,
          sixth_call_lead_status: lead.sixth_call_lead_status
        });
      }

      // Latest Call Status Distribution (using consolidated status)
      if (!latestCallStatusDistribution[consolidatedStatus]) {
        latestCallStatusDistribution[consolidatedStatus] = {
          status: consolidatedStatus,
          count: 0,
          percentage: 0,
          sources: new Set<string>(),
          cres: new Set<string>(),
        };
      }
      latestCallStatusDistribution[consolidatedStatus].count++;
      latestCallStatusDistribution[consolidatedStatus].sources.add(sourceWithSubsource);
      if (lead.cre_name) {
        latestCallStatusDistribution[consolidatedStatus].cres.add(lead.cre_name);
      }

      // Source-wise Status Distribution (using source + subsource)
      if (!sourceWiseStatusDistribution[sourceWithSubsource]) {
        sourceWiseStatusDistribution[sourceWithSubsource] = {
          source: sourceWithSubsource,
          totalLeads: 0,
          statusDistribution: {},
        };
      }
      if (!sourceWiseStatusDistribution[sourceWithSubsource].statusDistribution[consolidatedStatus]) {
        sourceWiseStatusDistribution[sourceWithSubsource].statusDistribution[consolidatedStatus] = {
          status: consolidatedStatus,
          count: 0,
          percentage: 0,
        };
      }

      sourceWiseStatusDistribution[sourceWithSubsource].totalLeads++;
      sourceWiseStatusDistribution[sourceWithSubsource].statusDistribution[consolidatedStatus].count++;
    });

    // Calculate percentages and convert to array format
    const totalLeads = filteredLeads.length;
    const latestCallStatusData = Object.values(latestCallStatusDistribution).map((status: any) => ({
      status: status.status,
      count: status.count,
      percentage: ((status.count / totalLeads) * 100).toFixed(2),
      sourceCount: status.sources.size,
      creCount: status.cres.size,
      sources: Array.from(status.sources),
      cres: Array.from(status.cres),
    })).sort((a: any, b: any) => b.count - a.count);

    const sourceWiseData = Object.entries(sourceWiseStatusDistribution).map(([source, data]: [string, any]) => {
      const statusArray = Object.values(data.statusDistribution).map((status: any) => ({
        ...status,
        percentage: data.totalLeads > 0 ? ((status.count / data.totalLeads) * 100).toFixed(2) : '0.00'
      })).sort((a: any, b: any) => b.count - a.count);

      return {
        source,
        totalLeads: data.totalLeads,
        statusDistribution: statusArray,
      };
    }).sort((a: any, b: any) => b.totalLeads - a.totalLeads);

    // Get unique sources for filtering (including subsource)
    const uniqueSources = ['all', ...new Set(filteredLeads.map((lead: any) => getSourceWithSubsource(lead)).filter(Boolean))];

    console.log('Latest Call Status data:', latestCallStatusData.slice(0, 5));
    console.log('Source-wise Status data:', sourceWiseData.slice(0, 3));

    return NextResponse.json({
      latestCallStatusDistribution: latestCallStatusData,
      sourceWiseStatusDistribution: sourceWiseData,
      uniqueSources,
      totalLeads,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        period,
        branch,
        month,
        source: sourceFilter,
      },
    });

  } catch (error) {
    console.error('Error in latest call lead status analytics:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}
