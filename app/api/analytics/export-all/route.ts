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

    console.log(`Exporting all analytics data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch all lead data with multiple fallback strategies
    let allLeadMaster = []
    let leadMasterError = null
    
    console.log('Starting data fetch...');
    
    // Strategy 1: Try with qualified_leads table first (has data)
    try {
      const { data, error } = await supabase
        .from('qualified_leads')
        .select('*')
        .limit(10000) // Add limit to prevent timeout
      
      if (error) {
        console.error('Error fetching qualified_leads:', error)
        leadMasterError = error
      } else {
        allLeadMaster = data || []
        console.log(`Strategy 1 - Qualified leads count: ${allLeadMaster.length}`)
      }
    } catch (err) {
      console.error('Exception fetching qualified_leads:', err)
      leadMasterError = err
    }
    
    // Strategy 2: Try with direct client if needed
    if (allLeadMaster.length === 0) {
      try {
        console.log('Trying direct client...');
        const directSupabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        const { data, error } = await directSupabase
          .from('lead_master')
          .select('*')
          .limit(10000)
        
        if (!error && data) {
          allLeadMaster = data
          console.log(`Strategy 2 - Lead Master count: ${allLeadMaster.length}`)
        } else {
          console.error('Direct client error:', error)
        }
      } catch (err) {
        console.error('Exception with direct client:', err)
      }
    }
    
    // Strategy 3: Try with service role key if still empty
    if (allLeadMaster.length === 0) {
      try {
        console.log('Trying service role...');
        const serviceSupabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const { data, error } = await serviceSupabase
          .from('lead_master')
          .select('*')
          .limit(10000)
        
        if (!error && data) {
          allLeadMaster = data
          console.log(`Strategy 3 - Lead Master count: ${allLeadMaster.length}`)
        } else {
          console.error('Service role error:', error)
        }
      } catch (err) {
        console.error('Exception with service role:', err)
      }
    }
    
    // Strategy 4: Try with qualified_leads table as fallback
    if (allLeadMaster.length === 0) {
      try {
        console.log('Trying qualified_leads table as fallback...');
        const { data, error } = await supabase
          .from('qualified_leads')
          .select('*')
          .limit(10000)
        
        if (!error && data) {
          allLeadMaster = data
          console.log(`Strategy 4 - Qualified leads count: ${allLeadMaster.length}`)
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

    // Apply filtering with better error handling
    let filteredLeads = allLeadMaster || []
    
    console.log(`Raw data count: ${filteredLeads.length}`);
    console.log(`Period: ${period}, StartDate: ${startDateParam}, EndDate: ${endDateParam}`);
    
    // Only apply date filtering if we have specific date parameters
    if (startDateParam && endDateParam) {
      console.log(`Applying custom date range filtering from ${startDateParam} to ${endDateParam}`);
      filteredLeads = filteredLeads.filter((lead: any) => {
        if (!lead.created_at) return true; // Include leads without dates
        
        try {
          const leadDate = new Date(lead.created_at);
          const start = new Date(startDateParam);
          const end = new Date(endDateParam);
          
          // Add one day to end date to include the entire day
          end.setDate(end.getDate() + 1);
          
          return leadDate >= start && leadDate < end;
        } catch (error) {
          console.error('Date parsing error for lead:', lead.uid, error);
          return true; // Include leads with invalid dates
        }
      });
    } else if (period !== 'all') {
      console.log(`Applying period-based filtering: ${period} days`);
      filteredLeads = filteredLeads.filter((lead: any) => {
        if (!lead.created_at) return true; // Include leads without dates
        
        try {
          const leadDate = new Date(lead.created_at);
          return leadDate >= startDate;
        } catch (error) {
          console.error('Date parsing error for lead:', lead.uid, error);
          return true; // Include leads with invalid dates
        }
      });
    }

    console.log(`After filtering - Total leads: ${filteredLeads.length}`);
    
    // Log sample data for debugging
    if (filteredLeads.length > 0) {
      console.log('Sample lead data:', {
        uid: filteredLeads[0].uid,
        customer_name: filteredLeads[0].customer_name,
        source: filteredLeads[0].source,
        created_at: filteredLeads[0].created_at
      });
    } else {
      console.log('No leads found after filtering. Raw data sample:', allLeadMaster.slice(0, 2));
    }

    // Generate comprehensive CSV content
    if (format === 'csv') {
      const csvHeaders = [
        'Lead UID',
        'Customer Name',
        'Customer Mobile',
        'Source',
        'Sub Source',
        'CRE Name',
        'PS Name',
        'Branch',
        'Lead Status',
        'Final Status',
        'Lead Category',
        'Model Interested',
        'Variant',
        'Buying Plan',
        'Finance Option',
        'Profession',
        'Test Drive Type',
        'Trade In',
        'First Call Date',
        'Follow Up Date',
        'Created At',
        'Updated At',
        'Assigned',
        'First Remark',
        'Lead Remark',
        'CRE Assigned At',
        'PS Assigned At',
        'Lead Source',
        'Lead Sub Source'
      ];

      const csvRows = filteredLeads.map((lead: any) => [
        lead.lead_uid || lead.uid || '',
        lead.customer_name || '',
        lead.customer_mobile_number || lead.customer_mobile || '',
        lead.source || '',
        lead.sub_source || '',
        lead.cre_name || '',
        lead.ps_name || '',
        lead.branch || '',
        lead.lead_status || '',
        lead.final_status || '',
        lead.lead_category || '',
        lead.model_interested || '',
        lead.variant || '',
        lead.buying_plan || '',
        lead.finance_option || '',
        lead.profession || '',
        lead.test_drive_type || '',
        lead.trade_in || '',
        lead.first_call_date || '',
        lead.follow_up_date || '',
        lead.created_at || '',
        lead.updated_at || '',
        lead.assigned || '',
        lead.first_remark || '',
        lead.lead_remark || '',
        lead.cre_assigned_at || '',
        lead.ps_assigned_at || '',
        lead.lead_source || '',
        lead.lead_sub_source || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Generate filename with date range
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const filename = `analytics-complete-report-${startDateStr}-to-${endDateStr}.csv`;

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
      totalLeads: filteredLeads.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        period,
      },
      leads: filteredLeads.slice(0, 100), // Limit to first 100 for JSON response
      message: 'Complete analytics data exported successfully'
    });

  } catch (error) {
    console.error('Error in analytics export:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}
