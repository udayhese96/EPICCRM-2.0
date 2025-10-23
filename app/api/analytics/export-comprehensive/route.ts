import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Handle date range calculation
    let startDate: Date;
    let endDate: Date;
    
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else if (period === 'all') {
      startDate = new Date('2020-01-01');
      endDate = new Date();
    } else {
      const days = parseInt(period) || 30;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      endDate = new Date();
    }

    console.log(`Exporting comprehensive analytics data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Use the same data fetching approach as CRE performance API
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
    
    // If still empty, try with qualified_leads table as fallback
    if (allLeadMaster.length === 0) {
      try {
        console.log('Trying qualified_leads table as fallback...');
        const { data, error } = await supabase
          .from('qualified_leads')
          .select('*')
        
        if (!error && data) {
          allLeadMaster = data
          console.log(`Qualified leads count: ${allLeadMaster.length}`)
        } else {
          console.error('Qualified leads error:', error)
        }
      } catch (err) {
        console.error('Exception with qualified_leads:', err)
      }
    }

    if (leadMasterError) {
      return NextResponse.json({ error: 'Failed to fetch leads data' }, { status: 500 });
    }

    // Apply filtering - use same logic as CRE performance API
    let filteredLeads
    if (period === 'all' && !startDateParam && !endDateParam) {
      // Show ALL data when period is 'all' and no custom date range
      filteredLeads = (allLeadMaster || []).filter((lead: any) => {
        return lead.assigned === 'Yes' && lead.cre_name; // Only assigned leads with CRE
      })
    } else {
      // Apply date filtering for specific periods or custom date range
      filteredLeads = (allLeadMaster || []).filter((lead: any) => {
        const dateMatch = !lead.created_at || (() => {
          const leadDate = new Date(lead.created_at);
          return leadDate >= startDate && leadDate <= endDate;
        })()
        return lead.assigned === 'Yes' && lead.cre_name && dateMatch
      })
    }
    
    console.log(`After filtering - Assigned leads with CRE: ${filteredLeads.length}`)

    console.log(`After filtering - Total leads: ${filteredLeads.length}`);

    // Generate comprehensive analytics data
    const analyticsData = generateAnalyticsData(filteredLeads);

    // Generate Excel-compatible CSV with multiple sections
    if (format === 'csv') {
      const csvContent = generateComprehensiveCSV(analyticsData, startDate, endDate, period);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const filename = `comprehensive-analytics-report-${startDateStr}-to-${endDateStr}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // For JSON format, return structured data
    return NextResponse.json({
      analytics: analyticsData,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        period,
      },
      totalLeads: filteredLeads.length,
      message: 'Comprehensive analytics data exported successfully'
    });

  } catch (error) {
    console.error('Error in comprehensive analytics export:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}

function generateAnalyticsData(leads: any[]) {
  // 1. CRE Performance Analysis
  const crePerformanceMap: any = {};
  const creTatValues: any = {};

  leads.forEach((lead: any) => {
    const creName = lead.cre_name || 'Unassigned';
    
    if (!crePerformanceMap[creName]) {
      crePerformanceMap[creName] = {
        creName,
        assigned: 0,
        qualifiedLeads: 0,
        untouched: 0,
        openLeads: 0,
        retailed: 0,
        lost: 0,
        tatValues: []
      };
    }

    crePerformanceMap[creName].assigned++;

    // Qualified Leads
    const isQualified = lead.lead_status?.toLowerCase().includes('qualified') || 
                       lead.final_status?.toLowerCase() === 'qualified';
    if (isQualified) {
      crePerformanceMap[creName].qualifiedLeads++;
    }

    // Untouched
    if (!lead.first_call_date) {
      crePerformanceMap[creName].untouched++;
    }

    // Open leads
    if (lead.final_status?.toLowerCase() === 'pending') {
      crePerformanceMap[creName].openLeads++;
    }

    // Retailed
    const isRetailed = lead.final_status?.toLowerCase().includes('won') || 
                      lead.final_status?.toLowerCase().includes('retailed');
    if (isRetailed) {
      crePerformanceMap[creName].retailed++;
    }

    // Lost
    const isLost = lead.final_status?.toLowerCase().includes('lost');
    if (isLost) {
      crePerformanceMap[creName].lost++;
    }

    // TAT calculation
    if (lead.first_call_date && lead.cre_assigned_at) {
      const firstCallTime = new Date(lead.first_call_date);
      const assignedTime = new Date(lead.cre_assigned_at);
      const tatHours = (firstCallTime.getTime() - assignedTime.getTime()) / (1000 * 60 * 60);
      if (tatHours > 0) {
        crePerformanceMap[creName].tatValues.push(tatHours);
      }
    }
  });

  // Convert CRE performance to array with TAT calculations
  const crePerformance = Object.values(crePerformanceMap).map((cre: any) => {
    const avgTat = cre.tatValues.length > 0 
      ? cre.tatValues.reduce((sum: number, tat: number) => sum + tat, 0) / cre.tatValues.length
      : 0;

    let tatUnit: 'd' | 'h' | 'm' = 'h';
    let tatValue = avgTat;

    if (avgTat >= 24) {
      tatUnit = 'd';
      tatValue = avgTat / 24;
    } else if (avgTat < 1) {
      tatUnit = 'm';
      tatValue = avgTat * 60;
    }

    return {
      creName: cre.creName,
      assigned: cre.assigned,
      qualifiedLeads: cre.qualifiedLeads,
      untouched: cre.untouched,
      openLeads: cre.openLeads,
      retailed: cre.retailed,
      lost: cre.lost,
      tatAvg: tatValue,
      tatUnit
    };
  }).sort((a: any, b: any) => b.assigned - a.assigned);

  // Calculate totals
  const total = crePerformance.reduce((acc: any, cre: any) => ({
    creName: 'TOTAL',
    assigned: acc.assigned + cre.assigned,
    qualifiedLeads: acc.qualifiedLeads + cre.qualifiedLeads,
    untouched: acc.untouched + cre.untouched,
    openLeads: acc.openLeads + cre.openLeads,
    retailed: acc.retailed + cre.retailed,
    lost: acc.lost + cre.lost,
    tatAvg: 0,
    tatUnit: 'd' as 'd' | 'h' | 'm'
  }), {
    creName: 'TOTAL',
    assigned: 0,
    qualifiedLeads: 0,
    untouched: 0,
    openLeads: 0,
    retailed: 0,
    lost: 0,
    tatAvg: 0,
    tatUnit: 'd' as 'd' | 'h' | 'm'
  });

  // Calculate average TAT for total
  const allTatValues = Object.values(crePerformanceMap).flatMap((cre: any) => cre.tatValues);
  if (allTatValues.length > 0) {
    const avgTat = allTatValues.reduce((sum: number, tat: number) => sum + tat, 0) / allTatValues.length;
    if (avgTat >= 24) {
      total.tatUnit = 'd';
      total.tatAvg = avgTat / 24;
    } else if (avgTat < 1) {
      total.tatUnit = 'm';
      total.tatAvg = avgTat * 60;
    } else {
      total.tatUnit = 'h';
      total.tatAvg = avgTat;
    }
  }

  // 2. Source-wise Analysis
  const sourceAnalysis: any = {};
  const sourceCREMap: any = {};

  leads.forEach((lead: any) => {
    const source = lead.source || 'Unknown';
    const subsource = lead.sub_source || '';
    const creName = lead.cre_name || 'Unassigned';
    const key = `${source} - ${subsource}`;

    if (!sourceAnalysis[key]) {
      sourceAnalysis[key] = {
        source,
        subsource,
        totalLeads: 0,
        qualified: 0,
        booked: 0,
        retailed: 0,
        creLeads: {}
      };
    }

    sourceAnalysis[key].totalLeads++;
    
    if (lead.lead_status?.toLowerCase().includes('qualified') || lead.final_status?.toLowerCase() === 'qualified') {
      sourceAnalysis[key].qualified++;
    }
    
    if (lead.final_status?.toLowerCase().includes('booked')) {
      sourceAnalysis[key].booked++;
    }
    
    if (lead.final_status?.toLowerCase().includes('retailed')) {
      sourceAnalysis[key].retailed++;
    }

    // Track CRE performance per source
    if (!sourceCREMap[key]) {
      sourceCREMap[key] = {};
    }
    if (!sourceCREMap[key][creName]) {
      sourceCREMap[key][creName] = 0;
    }
    sourceCREMap[key][creName]++;
  });

  // Convert source analysis to array
  const sourceWiseDistribution = Object.values(sourceAnalysis).map((source: any) => {
    const conversionRate = source.totalLeads > 0 ? (source.qualified / source.totalLeads) * 100 : 0;
    
    // Find top CRE for this source
    const topCRE = sourceCREMap[`${source.source} - ${source.subsource}`] 
      ? Object.entries(sourceCREMap[`${source.source} - ${source.subsource}`])
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]
      : ['N/A', 0];

    return {
      source: source.source,
      subsource: source.subsource,
      totalLeads: source.totalLeads,
      qualified: source.qualified,
      booked: source.booked,
      retailed: source.retailed,
      conversionRate: conversionRate,
      topCRE: topCRE[0],
      creLeads: topCRE[1]
    };
  }).sort((a: any, b: any) => b.totalLeads - a.totalLeads);

  // 3. Lead Status Analysis
  const statusAnalysis: any = {};
  const statusSourceMap: any = {};
  const statusCREMap: any = {};

  leads.forEach((lead: any) => {
    const status = lead.lead_status || 'Unknown';
    const source = lead.source || 'Unknown';
    const creName = lead.cre_name || 'Unassigned';

    if (!statusAnalysis[status]) {
      statusAnalysis[status] = {
        status,
        count: 0,
        percentage: 0,
        sources: new Set(),
        cres: new Set()
      };
    }

    statusAnalysis[status].count++;
    statusAnalysis[status].sources.add(source);
    statusAnalysis[status].cres.add(creName);
  });

  // Calculate percentages and convert to array
  const totalLeads = leads.length;
  const leadStatusDistribution = Object.values(statusAnalysis).map((status: any) => ({
    status: status.status,
    count: status.count,
    percentage: totalLeads > 0 ? (status.count / totalLeads) * 100 : 0,
    sources: status.sources.size,
    cres: status.cres.size
  })).sort((a: any, b: any) => b.count - a.count);

  return {
    crePerformance: [...crePerformance, total],
    sourceWiseDistribution,
    leadStatusDistribution,
    summary: {
      totalLeads,
      totalCREs: Object.keys(crePerformanceMap).length,
      totalSources: Object.keys(sourceAnalysis).length,
      totalStatuses: Object.keys(statusAnalysis).length
    }
  };
}

function generateComprehensiveCSV(analyticsData: any, startDate: Date, endDate: Date, period: string): string {
  const sections = [];

  // Header
  sections.push('COMPREHENSIVE ANALYTICS REPORT');
  sections.push(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  sections.push(`Period: ${period}`);
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push('');

  // 1. CRE Performance Section
  sections.push('=== CRE PERFORMANCE ANALYSIS ===');
  sections.push('CRE Name,Assigned,Qualified Leads,Untouched,Open Leads,Retailed,Lost,TAT(Avg)');
  
  analyticsData.crePerformance.forEach((cre: any) => {
    sections.push([
      cre.creName,
      cre.assigned,
      cre.qualifiedLeads,
      cre.untouched,
      cre.openLeads,
      cre.retailed,
      cre.lost,
      `${cre.tatAvg.toFixed(1)}${cre.tatUnit}`
    ].map(cell => `"${cell}"`).join(','));
  });
  sections.push('');

  // 2. Source-wise Distribution Section
  sections.push('=== SOURCE-WISE CRE DISTRIBUTION ===');
  sections.push('Source,Sub Source,Total Leads,Qualified,Booked,Retailed,Conversion %,Top CRE,CRE Leads');
  
  analyticsData.sourceWiseDistribution.forEach((source: any) => {
    sections.push([
      source.source,
      source.subsource,
      source.totalLeads,
      source.qualified,
      source.booked,
      source.retailed,
      `${source.conversionRate.toFixed(1)}%`,
      source.topCRE,
      source.creLeads
    ].map(cell => `"${cell}"`).join(','));
  });
  sections.push('');

  // 3. Lead Status Distribution Section
  sections.push('=== LEAD STATUS DISTRIBUTION ===');
  sections.push('Latest Call Status,Count,Percentage,Sources,CREs');
  
  analyticsData.leadStatusDistribution.forEach((status: any) => {
    sections.push([
      status.status,
      status.count,
      `${status.percentage.toFixed(2)}%`,
      status.sources,
      status.cres
    ].map(cell => `"${cell}"`).join(','));
  });
  sections.push('');

  // 4. Summary Section
  sections.push('=== SUMMARY ===');
  sections.push('Metric,Value');
  sections.push(`"Total Leads","${analyticsData.summary.totalLeads}"`);
  sections.push(`"Total CREs","${analyticsData.summary.totalCREs}"`);
  sections.push(`"Total Sources","${analyticsData.summary.totalSources}"`);
  sections.push(`"Total Statuses","${analyticsData.summary.totalStatuses}"`);

  return sections.join('\n');
}
