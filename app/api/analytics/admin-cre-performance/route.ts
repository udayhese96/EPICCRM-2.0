import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Use service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Admin CRE Performance] Missing Supabase environment variables');
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
    const filter = searchParams.get('filter') || 'all'; // all | today | range
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    console.log(`[Admin CRE Performance] filter=${filter}, startDate=${startDateParam}, endDate=${endDateParam}`);

    // Compute date bounds
    let startBound: Date | null = null;
    let endBound: Date | null = null;

    if (filter === 'today') {
      let today: Date;
      if (startDateParam) {
        today = new Date(startDateParam);
      } else {
        today = new Date();
      }
      today.setHours(0, 0, 0, 0);
      startBound = today;
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      endBound = tomorrow;
    } else if (filter === 'range') {
      if (!startDateParam || !endDateParam) {
        return NextResponse.json({ error: 'startDate and endDate required for range filter' }, { status: 400 });
      }
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateParam);
      end.setDate(end.getDate() + 1);
      end.setHours(0, 0, 0, 0);
      startBound = start;
      endBound = end;
    }
    // else: all time = no bounds

    console.log(`[Admin CRE Performance] Date bounds: ${startBound?.toISOString() || 'null'} to ${endBound?.toISOString() || 'null'}`);

    // Fetch data with different date filters for each metric
    // 1. Assigned: cre_assigned_at
    // 2. Qualified: qualified_leads.created_at (join)
    // 3. Untouched: cre_assigned_at
    // 4. Open Leads: cre_assigned_at
    // 5. Retailed: updated_at
    // 6. Lost: updated_at

    // Fetch base lead data with cre_assigned_at filter for Assigned, Untouched, Open Leads
    let assignedQuery = supabase
      .from('lead_master')
      .select('cre_name, assigned, lead_status, final_status, first_call_date, created_at, updated_at, cre_assigned_at, uid');

    if (startBound) {
      assignedQuery = assignedQuery.gte('cre_assigned_at', startBound.toISOString());
    }
    if (endBound) {
      assignedQuery = assignedQuery.lt('cre_assigned_at', endBound.toISOString());
    }

    const { data: assignedRows, error: assignedError } = await assignedQuery;

    if (assignedError) {
      console.error('[Admin CRE Performance] Assigned query error:', assignedError);
      return NextResponse.json({ error: 'Database query failed', details: assignedError.message }, { status: 500 });
    }

    // Fetch Booked, Retailed & Lost using updated_at from lead_master
    // Note: Database stores as 'Won', 'Lost', 'Booked' (capitalized), also check 'Retailed'
    let updatedQuery = supabase
      .from('lead_master')
      .select('cre_name, final_status, updated_at')
      .in('final_status', ['Won', 'Lost', 'Retailed', 'Booked', 'won', 'lost', 'retailed', 'booked']);

    if (startBound) {
      updatedQuery = updatedQuery.gte('updated_at', startBound.toISOString());
    }
    if (endBound) {
      updatedQuery = updatedQuery.lt('updated_at', endBound.toISOString());
    }

    const { data: updatedRows, error: updatedError } = await updatedQuery;

    if (updatedError) {
      console.error('[Admin CRE Performance] Updated query error:', updatedError);
      return NextResponse.json({ error: 'Database query failed', details: updatedError.message }, { status: 500 });
    }

    // Fetch qualified leads directly from qualified_leads grouped by cre_name
    let qualifiedQuery = supabase
      .from('qualified_leads')
      .select('cre_name, created_at');

    if (startBound) {
      qualifiedQuery = qualifiedQuery.gte('created_at', startBound.toISOString());
    }
    if (endBound) {
      qualifiedQuery = qualifiedQuery.lt('created_at', endBound.toISOString());
    }

    const { data: qualifiedRows, error: qualifiedError } = await qualifiedQuery;

    if (qualifiedError) {
      console.error('[Admin CRE Performance] Qualified query error:', qualifiedError);
      // Continue without qualified data
    }

    // Build qualified leads count per CRE directly from qualified_leads
    const qualifiedByCre = new Map<string, number>();
    for (const row of (qualifiedRows || [])) {
      const name = row.cre_name || 'Unassigned';
      qualifiedByCre.set(name, (qualifiedByCre.get(name) || 0) + 1);
    }

    const rows = assignedRows || [];
    const updatedData = updatedRows || [];

    // Build quick maps for booked, retailed and lost counts by CRE from updated_at filtered data
    const bookedByCre = new Map<string, number>();
    const retailedByCre = new Map<string, number>();
    const lostByCre = new Map<string, number>();
    
    for (const row of updatedData) {
      const creName = row.cre_name || 'Unassigned';
      const finalStatus = (row.final_status || '');
      const fsLower = finalStatus.toLowerCase();
      
      // Booked: final_status = 'booked' or 'Booked'
      if (fsLower === 'booked') {
        bookedByCre.set(creName, (bookedByCre.get(creName) || 0) + 1);
      }
      
      // Retailed: final_status = 'retailed', 'Retailed', 'won', 'Won'
      if (fsLower === 'retailed' || fsLower === 'won') {
        retailedByCre.set(creName, (retailedByCre.get(creName) || 0) + 1);
      }
      
      // Lost: final_status = 'lost' or 'Lost'
      if (fsLower === 'lost') {
        lostByCre.set(creName, (lostByCre.get(creName) || 0) + 1);
      }
    }

    console.log(`[Admin CRE Performance] Assigned: ${rows.length}, Updated (Won/Lost): ${updatedData.length}, Qualified rows: ${(qualifiedRows || []).length}`);

    // Aggregate by CRE
    const creMap: Record<string, any> = {};

    // Process Assigned, Untouched, Open Leads from cre_assigned_at filtered data
    for (const row of rows) {
      const creName = row.cre_name || 'Unassigned';
      if (!creMap[creName]) {
        creMap[creName] = {
          creName,
          assigned: 0,
          qualifiedLeads: 0,
          untouched: 0,
          openLeads: 0,
          booked: 0,
          retailed: 0,
          lost: 0,
          tatSum: 0,
          tatCount: 0,
          tatAvg: 0,
          tatUnit: 'd' as const
        };
      }

      const cre = creMap[creName];
      
      // Assigned: count all rows (filtered by cre_assigned_at)
      cre.assigned++;

      // Untouched calculation - matches CRE dashboard computeCountsSnapshot logic exactly
      // Untouched = lead_status is null/empty OR "Pending" AND final_status is "Pending" AND not finalized as won
      const leadStatus = (row.lead_status ?? "").toString().toLowerCase();
      const finalStatus = (row.final_status ?? "").toString().toLowerCase();
      
      // Check if finalized as won (booked, retailed, won)
      const isFinalizedWon = (fs: string) => {
        const fsLower = fs.toLowerCase();
        return fsLower === 'booked' || fsLower === 'retailed' || fsLower === 'won' || fsLower.includes('won');
      };
      
      // Untouched: filtered by cre_assigned_at
      if ((leadStatus === "" || leadStatus === "pending") && 
          finalStatus === "pending" && 
          !isFinalizedWon(finalStatus)) {
        cre.untouched++;
      }

      // Open leads: filtered by cre_assigned_at
      if (!['won', 'retailed', 'lost', 'booked'].includes(finalStatus)) {
        cre.openLeads++;
      }

      // TAT calculation (using created_at and first_call_date)
      if (row.first_call_date && row.created_at) {
        const created = new Date(row.created_at).getTime();
        const firstCall = new Date(row.first_call_date).getTime();
        const diffMs = firstCall - created;
        if (diffMs >= 0) {
          cre.tatSum += diffMs;
          cre.tatCount++;
        }
      }
    }

    // Apply Qualified Leads counts (from qualified_leads.created_at grouped by cre_name)
    for (const [creName, count] of qualifiedByCre.entries()) {
      if (!creMap[creName]) {
        creMap[creName] = {
          creName,
          assigned: 0,
          qualifiedLeads: 0,
          untouched: 0,
          openLeads: 0,
          booked: 0,
          retailed: 0,
          lost: 0,
          tatSum: 0,
          tatCount: 0,
          tatAvg: 0,
          tatUnit: 'd' as const
        };
      }
      creMap[creName].qualifiedLeads += count;
    }

    // Apply Booked counts (from updated_at filtered data)
    for (const [creName, count] of bookedByCre.entries()) {
      if (!creMap[creName]) {
        creMap[creName] = {
          creName,
          assigned: 0,
          qualifiedLeads: 0,
          untouched: 0,
          openLeads: 0,
          booked: 0,
          retailed: 0,
          lost: 0,
          tatSum: 0,
          tatCount: 0,
          tatAvg: 0,
          tatUnit: 'd' as const
        };
      }
      creMap[creName].booked += count;
    }

    // Apply Retailed counts
    for (const [creName, count] of retailedByCre.entries()) {
      if (!creMap[creName]) {
        creMap[creName] = {
          creName,
          assigned: 0,
          qualifiedLeads: 0,
          untouched: 0,
          openLeads: 0,
          booked: 0,
          retailed: 0,
          lost: 0,
          tatSum: 0,
          tatCount: 0,
          tatAvg: 0,
          tatUnit: 'd' as const
        };
      }
      creMap[creName].retailed += count;
    }

    // Apply Lost counts
    for (const [creName, count] of lostByCre.entries()) {
      if (!creMap[creName]) {
        creMap[creName] = {
          creName,
          assigned: 0,
          qualifiedLeads: 0,
          untouched: 0,
          openLeads: 0,
          booked: 0,
          retailed: 0,
          lost: 0,
          tatSum: 0,
          tatCount: 0,
          tatAvg: 0,
          tatUnit: 'd' as const
        };
      }
      creMap[creName].lost += count;
    }

    // Calculate TAT averages and format
    const crePerformance = Object.values(creMap).map((cre: any) => {
      if (cre.tatCount > 0) {
        const avgMs = cre.tatSum / cre.tatCount;
        const avgDays = avgMs / (1000 * 60 * 60 * 24);

        if (avgDays >= 1) {
          cre.tatAvg = avgDays;
          cre.tatUnit = 'd';
        } else {
          const avgHours = avgMs / (1000 * 60 * 60);
          if (avgHours >= 1) {
            cre.tatAvg = avgHours;
            cre.tatUnit = 'h';
          } else {
            const avgMinutes = avgMs / (1000 * 60);
            cre.tatAvg = avgMinutes;
            cre.tatUnit = 'm';
          }
        }
      }

      delete cre.tatSum;
      delete cre.tatCount;
      return cre;
    })
    // Sort by assigned count (descending)
    .sort((a, b) => b.assigned - a.assigned);

    // Calculate totals
    const total = crePerformance.reduce((acc, cre) => ({
      creName: 'TOTAL',
      assigned: acc.assigned + cre.assigned,
      qualifiedLeads: acc.qualifiedLeads + cre.qualifiedLeads,
      untouched: acc.untouched + cre.untouched,
      openLeads: acc.openLeads + cre.openLeads,
      booked: acc.booked + cre.booked,
      retailed: acc.retailed + cre.retailed,
      lost: acc.lost + cre.lost,
      tatAvg: 0,
      tatUnit: 'd' as const
    }), {
      creName: 'TOTAL',
      assigned: 0,
      qualifiedLeads: 0,
      untouched: 0,
      openLeads: 0,
      booked: 0,
      retailed: 0,
      lost: 0,
      tatAvg: 0,
      tatUnit: 'd' as const
    });

    // Calculate average TAT across all CREs
    const avgTat = crePerformance.reduce((sum, cre) => {
      // Convert to days for averaging
      let tatInDays = cre.tatAvg;
      if (cre.tatUnit === 'h') tatInDays = cre.tatAvg / 24;
      if (cre.tatUnit === 'm') tatInDays = cre.tatAvg / (24 * 60);
      return sum + tatInDays;
    }, 0) / (crePerformance.length || 1);

    total.tatAvg = avgTat;

    // Format date range
    const formatDate = (date: Date | null) => date ? date.toISOString().split('T')[0] : 'N/A';
    const period = filter === 'all' ? 'all time' :
                   filter === 'today' ? 'today' :
                   startDateParam && endDateParam ? `${startDateParam} to ${endDateParam}` : 'unknown';

    console.log(`[Admin CRE Performance] Returning ${crePerformance.length} CREs, total assigned: ${total.assigned}`);

    return NextResponse.json({
      crePerformance,
      total,
      dateRange: {
        start: startBound ? formatDate(startBound) : 'All Time',
        end: endBound ? formatDate(new Date(endBound.getTime() - 1)) : 'Now',
        period
      }
    });
  } catch (error) {
    console.error('[Admin CRE Performance] Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: String(error)
    }, { status: 500 });
  }
}
