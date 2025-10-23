import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';

    const days = period === 'all' ? 3650 : parseInt(period); // 10 years for 'all'
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`Fetching CRE performance data from ${startDate.toISOString()} to ${new Date().toISOString()}`);

    // Use the same approach as dynamic-status API - fetch ALL data first
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

    // Apply filtering logic (same as dynamic-status API)
    let filteredLeads
    if (period === 'all') {
      // Show ALL data when period is 'all'
      filteredLeads = (allLeadMaster || []).filter((lead: any) => {
        return lead.assigned === 'Yes' && lead.cre_name; // Only assigned leads with CRE
      })
    } else {
      // Apply date filtering for specific periods
      filteredLeads = (allLeadMaster || []).filter((lead: any) => {
        const dateMatch = !lead.created_at || new Date(lead.created_at) >= startDate
        return lead.assigned === 'Yes' && lead.cre_name && dateMatch
      })
    }
    
    console.log(`After filtering - Assigned leads with CRE: ${filteredLeads.length}`)

    // Process CRE performance data
    const crePerformanceMap: any = {};

    filteredLeads.forEach((lead: any) => {
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

      // Qualified Leads: leads where lead_status contains "Qualified" or final_status is "Qualified"
      const isQualified = lead.lead_status?.toLowerCase().includes('qualified') || 
                         lead.final_status?.toLowerCase() === 'qualified';
      if (isQualified) {
        crePerformanceMap[creName].qualifiedLeads++;
      }

      // Untouched: leads where first_call_date is empty
      if (!lead.first_call_date) {
        crePerformanceMap[creName].untouched++;
      }

      // Open leads: leads where final_status is "Pending"
      if (lead.final_status?.toLowerCase() === 'pending') {
        crePerformanceMap[creName].openLeads++;
      }

      // Retailed: leads with final_status indicating success
      const isRetailed = lead.final_status?.toLowerCase().includes('won') || 
                        lead.final_status?.toLowerCase().includes('retailed');
      if (isRetailed) {
        crePerformanceMap[creName].retailed++;
      }

      // Lost: leads with final_status indicating loss
      const isLost = lead.final_status?.toLowerCase().includes('lost');
      if (isLost) {
        crePerformanceMap[creName].lost++;
      }

      // TAT calculation: first_call_date - cre_assigned_at
      if (lead.first_call_date && lead.cre_assigned_at) {
        const firstCallTime = new Date(lead.first_call_date);
        const assignedTime = new Date(lead.cre_assigned_at);
        const tatHours = (firstCallTime.getTime() - assignedTime.getTime()) / (1000 * 60 * 60);
        if (tatHours > 0) {
          crePerformanceMap[creName].tatValues.push(tatHours);
        }
      }
    });

    // Convert to array format and calculate TAT averages
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
      tatAvg: 0, // Will calculate average TAT separately
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

    console.log(`CRE Performance data processed: ${crePerformance.length} CREs`);

    return NextResponse.json({
      crePerformance,
      total,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        period,
      },
    });

  } catch (error) {
    console.error('Error in CRE performance analytics:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}