/**
 * Maps tab IDs to human-readable labels for the Team Leader Dashboard
 */
export const tabLabels: Record<string, string> = {
  analytics: 'Analytics',
  freshLeads: 'Fresh Leads',
  todaysFollowUp: "Today's Follow Up",
  openLeads: 'Open Leads',
  waitingForApproval: 'Waiting for Approval',
  booked: 'Booked',
  retailed: 'Retailed',
  exportLeads: 'Export Leads'
}

/**
 * Order of tabs in the Team Leader Dashboard
 */
export const tabOrder = [
  'analytics',
  'freshLeads',
  'todaysFollowUp',
  'openLeads',
  'waitingForApproval',
  'booked',
  'retailed',
  'exportLeads'
]
