import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const branch = searchParams.get('branch') || null;
    const month = searchParams.get('month') || null;
    const creNameFilter = searchParams.get('creName') || null;
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

    console.log('Source CRE Distribution API called with:', { period, branch, month, creNameFilter, sourceFilter, startDateParam, endDateParam });
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Use the exact same approach as dynamic-status API
    console.log('Fetching ALL data from lead_master...')
    
    let allLeadMaster = []
    let leadMasterError = null
    
    try {
      // First try: Direct query without ordering
      const { data, error } = await supabase
        .from('lead_master')
        .select('*')
      
      if (error) {
        console.error('Error fetching lead_master:', error)
        leadMasterError = error
      } else {
        allLeadMaster = data || []
        console.log(`Direct query - Lead Master count: ${allLeadMaster.length}`)
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

    // Function to get source with subsource
    const getSourceWithSubsource = (lead: any) => {
      const source = lead.source || 'Unknown';
      const subsource = lead.sub_source || '';
      
      if (subsource && subsource.trim()) {
        return `${source} - ${subsource}`;
      }
      
      return source;
    };

    // Apply filtering logic with proper date range handling
    let filteredLeads
    try {
      if (period === 'all' && !startDateParam && !endDateParam) {
        // Show ALL data when period is 'all' and no custom date range
        filteredLeads = (allLeadMaster || []).filter((lead: any) => {
          const branchMatch = !branch || lead.branch === branch
          const monthMatch = month === 'all' || !month || (lead.created_at && lead.created_at.startsWith(month))
          const creMatch = !creNameFilter || lead.cre_name === creNameFilter
          const sourceMatch = !sourceFilter || sourceFilter === 'all' || getSourceWithSubsource(lead) === sourceFilter
          return branchMatch && monthMatch && creMatch && sourceMatch
        })
      } else {
        // Apply date filtering for specific periods or custom date range
        filteredLeads = (allLeadMaster || []).filter((lead: any) => {
          const branchMatch = !branch || lead.branch === branch
          const monthMatch = month === 'all' || !month || (lead.created_at && lead.created_at.startsWith(month))
          const creMatch = !creNameFilter || lead.cre_name === creNameFilter
          const sourceMatch = !sourceFilter || sourceFilter === 'all' || getSourceWithSubsource(lead) === sourceFilter
          const dateMatch = !lead.created_at || (() => {
            const leadDate = new Date(lead.created_at);
            return leadDate >= startDate && leadDate <= endDate;
          })()
          return branchMatch && monthMatch && creMatch && sourceMatch && dateMatch
        })
      }
    } catch (filterError) {
      console.error('Error in filtering logic:', filterError);
      return NextResponse.json({ error: 'Error filtering leads data' }, { status: 500 });
    }
    
    console.log(`After filtering - Lead Master: ${filteredLeads.length}`)
    const leads = filteredLeads

    console.log(`Found ${leads?.length || 0} leads`);

    // Get CRE users
    const { data: creUsers, error: creUsersError } = await supabase
      .from('users')
      .select('username, full_name, branch')
      .eq('role', 'cre')
      .eq('is_active', true)
      .order('full_name');

    if (creUsersError) {
      console.error('Error fetching CRE users:', creUsersError);
    }

    // If no leads found, return empty data with proper structure
    if (leads.length === 0) {
      console.log('No leads found for the selected period')
      return NextResponse.json({
        sourceCreDistribution: [],
        overallCrePerformance: [],
        creUsers: creUsers || [],
        totalLeads: 0,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
          period,
          branch,
          month,
          creName: creNameFilter,
        },
        message: 'No leads found for the selected period'
      })
    }

    // Process data to match the expected interface structure
    const sourceCreDistribution: any = {};
    const overallCrePerformance: any = {};

    try {
    leads.forEach((lead: any, index: number) => {
      const sourceWithSubsource = getSourceWithSubsource(lead);
      const creName = lead.cre_name || 'Unassigned';
      const branch = lead.branch || 'Unknown';
      
      // Debug first few leads to check subsource data
      if (index < 5) {
        console.log(`Lead ${index}:`, {
          source: lead.source,
          sub_source: lead.sub_source,
          sourceWithSubsource,
          created_at: lead.created_at
        });
      }

      // Source-CRE distribution
      if (!sourceCreDistribution[sourceWithSubsource]) {
        sourceCreDistribution[sourceWithSubsource] = {
          totalLeads: 0,
          totalQualified: 0,
          totalBooked: 0,
          totalRetailed: 0,
          creDistribution: {},
        };
      }
      if (!sourceCreDistribution[sourceWithSubsource].creDistribution[creName]) {
        sourceCreDistribution[sourceWithSubsource].creDistribution[creName] = {
          creName,
          branch,
          count: 0,
          qualified: 0,
          booked: 0,
          retailed: 0,
        };
      }

      sourceCreDistribution[sourceWithSubsource].totalLeads++;
      sourceCreDistribution[sourceWithSubsource].creDistribution[creName].count++;

      // Check qualification status - using lead_status field from lead_master
      // Qualification is determined by checking if lead_status contains 'qualified' (case-insensitive)
      const isQualified = lead.lead_status?.toLowerCase().includes('qualified') || 
                         lead.final_status?.toLowerCase().includes('qualified');
      if (isQualified) {
        sourceCreDistribution[sourceWithSubsource].totalQualified++;
        sourceCreDistribution[sourceWithSubsource].creDistribution[creName].qualified++;
      }

      // Overall CRE Performance
      if (!overallCrePerformance[creName]) {
        overallCrePerformance[creName] = {
          creName,
          branch,
          count: 0,
          qualified: 0,
          booked: 0,
          retailed: 0,
          sources: new Set<string>(),
        };
      }
      overallCrePerformance[creName].count++;
      if (isQualified) overallCrePerformance[creName].qualified++;
      overallCrePerformance[creName].sources.add(sourceWithSubsource);
    });

    } catch (processingError) {
      console.error('Error processing leads data:', processingError);
      return NextResponse.json({ error: 'Error processing leads data' }, { status: 500 });
    }

    // Convert to array format with proper structure
    const sourceCreData = Object.entries(sourceCreDistribution).map(([sourceWithSubsource, data]: [string, any]) => {
      // Split source and subsource
      const parts = sourceWithSubsource.split(' - ');
      const source = parts[0];
      const subsource = parts.length > 1 ? parts[1] : '';
      
      return {
        source,
        subsource,
        sourceWithSubsource,
        totalLeads: data.totalLeads,
        totalQualified: data.totalQualified,
        totalBooked: data.totalBooked,
        totalRetailed: data.totalRetailed,
        conversionRate: data.totalLeads > 0 ? (data.totalQualified / data.totalLeads) * 100 : 0,
        creDistribution: Object.values(data.creDistribution).map((cre: any) => ({
          ...cre,
          conversionRate: cre.count > 0 ? (cre.qualified / cre.count) * 100 : 0,
        })).sort((a: any, b: any) => b.count - a.count),
      };
    }).sort((a: any, b: any) => b.totalLeads - a.totalLeads);

    const overallCreData = Object.values(overallCrePerformance).map((cre: any) => ({
      creName: cre.creName,
      branch: cre.branch,
      count: cre.count,
      qualified: cre.qualified,
      booked: cre.booked,
      retailed: cre.retailed,
      conversionRate: cre.count > 0 ? (cre.qualified / cre.count) * 100 : 0,
      sourceCount: cre.sources.size,
      sources: Array.from(cre.sources),
    })).sort((a: any, b: any) => b.count - a.count);

    // For pie charts, create simple data structure
    const sourcePieData = sourceCreData.slice(0, 8).map((source, index) => ({
      name: source.source,
      value: source.totalLeads,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'][index % 8]
    }));

    const crePieData = overallCreData.slice(0, 8).map((cre, index) => ({
      name: cre.creName,
      value: cre.count,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'][index % 8]
    }));

    // Get unique sources for filtering (including subsource)
    const uniqueSources = ['all', ...new Set(leads.map((lead: any) => getSourceWithSubsource(lead)).filter(Boolean))];

    console.log('Source CRE data:', sourceCreData.slice(0, 3));
    console.log('Overall CRE data:', overallCreData.slice(0, 3));

    return NextResponse.json({
      sourceCreDistribution: sourceCreData,
      overallCrePerformance: overallCreData,
      creUsers: creUsers || [],
      uniqueSources,
      totalLeads: leads?.length || 0,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        period,
        branch,
        month,
        creName: creNameFilter,
      },
    });

  } catch (error) {
    console.error('Error in source-CRE distribution analytics:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}