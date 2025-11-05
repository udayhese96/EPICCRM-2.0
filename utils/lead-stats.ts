/**
 * Utility functions for calculating lead statistics
 * These match the logic in app/cre/dashboard/page.tsx computeCountsSnapshot
 */

export interface Lead {
  lead_status?: string | null
  final_status?: string | null
  assigned?: string
  cre_name?: string | null
  cre_id?: string | null
  cre_assigned_at?: string | null
  first_call_date?: string | null
  pending_reasons?: any[]
  won_timestamp?: string | null
  lost_timestamp?: string | null
  tat?: number | null
  [key: string]: any
}

export interface DateRangeFilter {
  startDate?: string | null
  endDate?: string | null
  dateMode?: 'All Time' | 'Today' | 'This Week' | 'Date Range'
}

export interface LeadStats {
  untouched: number
  assigned: number
  qualified: number
  open: number
  booked: number
  retailed: number
  lost: number
  tatAvg: number
}

/**
 * Check if a lead is finalized as won
 * Matches frontend logic exactly from app/cre/dashboard/page.tsx
 */
function isFinalizedWon(lead: Lead): boolean {
  const fs = (lead?.final_status || '').toString().toLowerCase()
  return fs === 'booked' || fs === 'retailed' || fs === 'won' || fs.includes('won')
}

/**
 * Filter leads by cre_assigned_at timestamp (matches CRE dashboard filtering)
 */
function filterByCreAssignedAt(leads: Lead[], dateFilter?: DateRangeFilter): Lead[] {
  if (!dateFilter || dateFilter.dateMode === 'All Time' || (!dateFilter.startDate && !dateFilter.endDate)) {
    return leads
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString().slice(0, 10)

  // Calculate start of week (Monday)
  const startOfWeek = (() => {
    const d = new Date(today)
    const day = d.getDay() || 7
    if (day !== 1) d.setDate(d.getDate() - (day - 1))
    return d.toISOString().slice(0, 10)
  })()

  return leads.filter(lead => {
    const creAssignedAt = lead?.cre_assigned_at
    if (!creAssignedAt) return false

    // Extract date part (YYYY-MM-DD) from timestamp
    // Handle both ISO format (2025-11-04T09:16:11) and space format (2025-11-04 09:16:11)
    const assignedDate = typeof creAssignedAt === 'string' 
      ? creAssignedAt.trim().slice(0, 10) 
      : String(creAssignedAt).trim().slice(0, 10)

    if (dateFilter.dateMode === 'Today') {
      return assignedDate === todayIso
    }

    if (dateFilter.dateMode === 'This Week') {
      return assignedDate >= startOfWeek && assignedDate <= todayIso
    }

    if (dateFilter.dateMode === 'Date Range' || dateFilter.startDate || dateFilter.endDate) {
      if (dateFilter.startDate && assignedDate < dateFilter.startDate) return false
      if (dateFilter.endDate && assignedDate > dateFilter.endDate) return false
      return true
    }

    return true
  })
}

/**
 * Calculate untouched leads count
 * Untouched = lead_status is null/empty OR "Pending" AND final_status is "Pending" AND not won
 * Matches CRE dashboard computeCountsSnapshot logic EXACTLY
 * 
 * Note: Leads should already be filtered by cre_assigned_at before calling this function
 * if you want to match CRE dashboard filtering
 */
export function calculateUntouched(leads: Lead[]): number {
  return leads.filter(l => {
    // Match frontend exactly: (l?.lead_status ?? "").toString().toLowerCase()
    // This converts null/undefined to "", and "Pending" to "pending"
    const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
    const finalStatus = (l?.final_status ?? "").toString().toLowerCase()
    
    // lead_status must be empty string (null/undefined) OR "pending" (case-insensitive)
    // final_status must be "pending" (case-insensitive)
    // must not be finalized as won
    return (leadStatus === "" || leadStatus === "pending") && 
           finalStatus === "pending" && 
           !isFinalizedWon(l)
  }).length
}

/**
 * Calculate assigned leads count
 */
export function calculateAssigned(leads: Lead[]): number {
  return leads.filter(l => l?.assigned === 'Yes').length
}

/**
 * Calculate qualified leads count
 * Qualified = lead_status is 'Qualified' AND final_status is 'pending' AND not won
 */
export function calculateQualified(leads: Lead[]): number {
  return leads.filter(l => 
    (l?.lead_status === 'Qualified') && 
    ((l?.final_status || '').toString().toLowerCase() === 'pending') && 
    !isFinalizedWon(l)
  ).length
}

/**
 * Calculate open leads count
 * Open = final_status is 'Pending' AND has activity (first_call_date OR pending_reasons)
 */
export function calculateOpen(leads: Lead[]): number {
  return leads.filter(l => {
    const fs = (l?.final_status ?? '').toString().toLowerCase()
    const hasActivity = !!(l?.first_call_date) || (l?.pending_reasons && l.pending_reasons.length > 0)
    return fs === 'pending' && hasActivity && !isFinalizedWon(l)
  }).length
}

/**
 * Calculate booked leads count
 */
export function calculateBooked(leads: Lead[]): number {
  return leads.filter(l => {
    const fs = (l?.final_status || '').toString().toLowerCase()
    return fs === 'booked'
  }).length
}

/**
 * Calculate retailed leads count
 */
export function calculateRetailed(leads: Lead[]): number {
  return leads.filter(l => {
    const fs = (l?.final_status || '').toString().toLowerCase()
    return fs === 'retailed'
  }).length
}

/**
 * Calculate lost leads count
 */
export function calculateLost(leads: Lead[]): number {
  return leads.filter(l => {
    const fs = (l?.final_status || '').toString().toLowerCase()
    return fs === 'lost'
  }).length
}

/**
 * Calculate average TAT (Turnaround Time)
 */
export function calculateTatAvg(leads: Lead[]): number {
  const leadsWithTat = leads.filter(l => l?.tat !== null && l?.tat !== undefined)
  if (leadsWithTat.length === 0) return 0
  
  const sum = leadsWithTat.reduce((acc, l) => acc + (Number(l.tat) || 0), 0)
  return sum / leadsWithTat.length
}

/**
 * Calculate all statistics for a set of leads
 * If dateFilter is provided, filters by cre_assigned_at timestamp to match CRE dashboard
 */
export function calculateLeadStats(leads: Lead[], dateFilter?: DateRangeFilter): LeadStats {
  // Filter leads by cre_assigned_at if date filter provided
  // This ensures stats match what the CRE sees on their dashboard
  const filteredLeads = dateFilter ? filterByCreAssignedAt(leads, dateFilter) : leads

  return {
    untouched: calculateUntouched(filteredLeads),
    assigned: calculateAssigned(filteredLeads),
    qualified: calculateQualified(filteredLeads),
    open: calculateOpen(filteredLeads),
    booked: calculateBooked(filteredLeads),
    retailed: calculateRetailed(filteredLeads),
    lost: calculateLost(filteredLeads),
    tatAvg: calculateTatAvg(filteredLeads)
  }
}

/**
 * Calculate statistics grouped by CRE name
 * Filters by cre_assigned_at timestamp for each CRE to match their dashboard view
 * Only counts leads assigned to that specific CRE (matching cre_id or cre_name)
 */
export function calculateStatsByCRE(
  leads: Lead[], 
  dateFilter?: DateRangeFilter,
  options?: { filterByCreId?: boolean }
): Record<string, LeadStats & { cre_name: string; cre_id?: string }> {
  const byCRE: Record<string, { leads: Lead[]; cre_id?: string }> = {}
  
  // Group leads by CRE (prefer cre_id if available, fallback to cre_name)
  leads.forEach(lead => {
    const creId = lead?.cre_id
    const creName = lead?.cre_name || 'Unknown'
    
    // Use cre_id as primary key if available and option is enabled
    const key = (options?.filterByCreId && creId) ? `id:${creId}` : creName
    
    if (!byCRE[key]) {
      byCRE[key] = { leads: [], cre_id: creId || undefined }
    }
    byCRE[key].leads.push(lead)
  })
  
  // Calculate stats for each CRE (using cre_assigned_at filtering)
  const statsByCRE: Record<string, LeadStats & { cre_name: string; cre_id?: string }> = {}
  Object.keys(byCRE).forEach(key => {
    const creData = byCRE[key]
    // Get cre_name from first lead in the group
    const creName = creData.leads[0]?.cre_name || key.replace(/^id:/, '') || 'Unknown'
    
    statsByCRE[key] = {
      cre_name: creName,
      cre_id: creData.cre_id,
      ...calculateLeadStats(creData.leads, dateFilter)
    }
  })
  
  return statsByCRE
}

/**
 * Calculate statistics for a specific CRE (by cre_id or cre_name)
 * Filters by cre_assigned_at timestamp to match what the CRE sees on their dashboard
 */
export function calculateStatsForCRE(
  leads: Lead[],
  creIdentifier: { cre_id?: string; cre_name?: string },
  dateFilter?: DateRangeFilter
): LeadStats & { cre_name: string } {
  // Filter leads for this specific CRE
  const creLeads = leads.filter(lead => {
    if (creIdentifier.cre_id && lead?.cre_id) {
      return String(lead.cre_id).trim() === String(creIdentifier.cre_id).trim()
    }
    if (creIdentifier.cre_name && lead?.cre_name) {
      return String(lead.cre_name).trim().toLowerCase() === String(creIdentifier.cre_name).trim().toLowerCase()
    }
    return false
  })

  const creName = creLeads[0]?.cre_name || creIdentifier.cre_name || 'Unknown'
  
  return {
    cre_name: creName,
    ...calculateLeadStats(creLeads, dateFilter)
  }
}

/**
 * Calculate total statistics across all CREs
 */
export function calculateTotalStats(statsByCRE: Record<string, LeadStats & { cre_name: string }>): LeadStats {
  const totals: LeadStats = {
    untouched: 0,
    assigned: 0,
    qualified: 0,
    open: 0,
    booked: 0,
    retailed: 0,
    lost: 0,
    tatAvg: 0
  }
  
  const creStats = Object.values(statsByCRE)
  
  // Sum all counts
  creStats.forEach(stats => {
    totals.untouched += stats.untouched
    totals.assigned += stats.assigned
    totals.qualified += stats.qualified
    totals.open += stats.open
    totals.booked += stats.booked
    totals.retailed += stats.retailed
    totals.lost += stats.lost
  })
  
  // Calculate weighted average for TAT
  let totalTatSum = 0
  let totalLeadsWithTat = 0
  creStats.forEach(stats => {
    const creTotalLeads = stats.untouched + stats.assigned + stats.qualified + stats.open + 
                          stats.booked + stats.retailed + stats.lost
    if (creTotalLeads > 0 && stats.tatAvg > 0) {
      totalTatSum += stats.tatAvg * creTotalLeads
      totalLeadsWithTat += creTotalLeads
    }
  })
  
  totals.tatAvg = totalLeadsWithTat > 0 ? totalTatSum / totalLeadsWithTat : 0
  
  return totals
}
