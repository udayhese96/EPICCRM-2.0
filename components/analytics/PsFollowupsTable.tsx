'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RefreshCw, Download, ChevronDown, Calendar, User } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PsFollowupsRow {
  ps_name: string
  lead_count: number
  unattended_count?: number
  f1_count?: number
  f2_count?: number
  f3_count?: number
  f4_count?: number
  f5_count?: number
  f6_count?: number
  f7_count?: number
  f8_count?: number
  f9_count?: number
  f10_count?: number
}

interface LeadDetail {
  lead_uid: string
  uid?: string  // legacy field name, prefer lead_uid
  customer_name: string
  customer_mobile_number: string
  alternate_mobile_number: string
  source: string
  cre_name?: string
  model_interested: string
  lead_status: string
  final_status: string
  first_call_date?: string
  first_call_remark?: string
  first_call_lead_status?: string
  second_call_date?: string
  second_call_remark?: string
  second_call_lead_status?: string
  third_call_date?: string
  third_call_remark?: string
  third_call_lead_status?: string
  fourth_call_date?: string
  fourth_call_remark?: string
  fourth_call_lead_status?: string
  fifth_call_date?: string
  fifth_call_remark?: string
  fifth_call_lead_status?: string
  sixth_call_date?: string
  sixth_call_remark?: string
  sixth_call_lead_status?: string
  seventh_call_date?: string
  seventh_call_remark?: string
  seventh_call_lead_status?: string
  created_at: string
  updated_at?: string
}

interface PsFollowupsTableProps {
  branch?: string
  dateFilterType?: 'today' | 'mtd' | 'from_to' | 'all_time'
  startDate?: string
  endDate?: string
}

const PsFollowupsTable: React.FC<PsFollowupsTableProps> = ({ branch, dateFilterType = 'all_time', startDate = '', endDate = '' }) => {
  const [data, setData] = useState<PsFollowupsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userBranch, setUserBranch] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [teamLeaders, setTeamLeaders] = useState<string[]>([])
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('all')

  const [drillDownOpen, setDrillDownOpen] = useState(false)
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [drillDownTitle, setDrillDownTitle] = useState('')
  const [drillDownLeads, setDrillDownLeads] = useState<LeadDetail[]>([])
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null)
  const [leadDetailOpen, setLeadDetailOpen] = useState(false)

  useEffect(() => {
    const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
    const parsed = session ? JSON.parse(session) : null
    setUserBranch(parsed?.branch || null)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      const currentBranch = branch || userBranch

      if (!currentBranch) {
        setError('Branch information not available')
        return
      }
      if (!token) {
        setError('Authentication token not found. Please log in again.')
        return
      }

      // Build query params with date filter and team leader filter
      const params = new URLSearchParams({
        branch: currentBranch,
        _t: Date.now().toString()
      })
      
      if (dateFilterType !== 'all_time') {
        params.append('date_filter_type', dateFilterType)
        if (dateFilterType === 'from_to' && startDate && endDate) {
          params.append('start_date', startDate)
          params.append('end_date', endDate)
        }
      }
      
      if (selectedTeamLeader && selectedTeamLeader !== 'all') {
        params.append('team_leader', selectedTeamLeader)
        console.log('✅ Adding Team Leader filter:', selectedTeamLeader)
      }
      
      const res = await fetch(`/api/analytics/sales-manager/ps-followups?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to load PS followups data')
      }

      const result = await res.json()
      setData(result.data || [])
      
      // Ensure team_leaders is an array
      const teamLeadersArray = Array.isArray(result.team_leaders) 
        ? result.team_leaders 
        : (result.team_leaders ? [result.team_leaders] : [])
      
      setTeamLeaders(teamLeadersArray)
      console.log(`✅ Team Leaders loaded:`, teamLeadersArray)
      console.log(`✅ Team Leaders count:`, teamLeadersArray.length)
    } catch (e:any) {
      setError(e?.message || 'Error loading PS followups data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userBranch) fetchData()
  }, [userBranch, branch, dateFilterType, startDate, endDate, selectedTeamLeader])

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      setError('No data available to export')
      return
    }
    setExporting(true)
    try {
      const currentDate = new Date().toISOString().split('T')[0]
      const branchName = userBranch || branch || 'analytics'

      const headers = ['PS Name', 'Total Leads', 'Unattended', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10']
      const rows = data.map(r => [
        `"${r.ps_name}"`, r.lead_count,
        (r.unattended_count ?? 0),
        (r.f1_count ?? 0), (r.f2_count ?? 0), (r.f3_count ?? 0), (r.f4_count ?? 0),
        (r.f5_count ?? 0), (r.f6_count ?? 0), (r.f7_count ?? 0), (r.f8_count ?? 0),
        (r.f9_count ?? 0), (r.f10_count ?? 0)
      ].join(','))

      const csv = [
        'PS Followups Report',
        `Branch: ${branchName}`,
        `Generated: ${currentDate}`,
        `Total Records: ${data.length}`,
        '',
        headers.join(','),
        ...rows
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `ps-followups-${branchName}-${currentDate}.csv`
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      setError('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const openDrillDown = async (psName: string, total: number, filter?: 'unattended' | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8' | 'f9' | 'f10') => {
    if (psName === 'TOTAL' || total === 0) return
    try {
      setDrillDownLoading(true)
      const filterLabel = filter === 'unattended' ? 'Unattended' : filter ? filter.toUpperCase() : 'Total Leads'
      setDrillDownTitle(`${psName} - ${filterLabel} (${total})`)
      setDrillDownOpen(true)

      const currentBranch = branch || userBranch
      if (!currentBranch) return

      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      if (!token) return

      // Build query params with date filter and team leader filter
      const params = new URLSearchParams({
        branch: currentBranch,
        ps_name: psName
      })
      
      if (filter) {
        params.append('filter', filter)
      }
      
      if (dateFilterType !== 'all_time') {
        params.append('date_filter_type', dateFilterType)
        if (dateFilterType === 'from_to' && startDate && endDate) {
          params.append('start_date', startDate)
          params.append('end_date', endDate)
        }
      }
      
      // Note: team_leader filter is already applied at the main table level,
      // so drill-down will only show PS under the selected team leader
      
      const res = await fetch(`/api/analytics/sales-manager/ps-followup-leads?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to load followup leads')
      }
      const result = await res.json()
      setDrillDownLeads(result.leads || [])
    } catch (e:any) {
      setError(e?.message || 'Error loading drill-down data')
    } finally {
      setDrillDownLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PS Followups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading PS followups...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>PS Followups</CardTitle>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            {/* Team Leader Filter */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <Select value={selectedTeamLeader} onValueChange={setSelectedTeamLeader} disabled={loading}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={loading ? "Loading..." : teamLeaders.length === 0 ? "No Team Leaders" : "Select Team Leader"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {teamLeaders.length > 0 ? (
                    teamLeaders.map((tl) => (
                      <SelectItem key={tl} value={tl}>
                        {tl}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_tl" disabled>No Team Leaders Found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm" disabled={exporting || data.length === 0} className="px-2 sm:px-3">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export CSV'}</span>
              </Button>
              <Button onClick={fetchData} variant="outline" size="sm" className="px-2 sm:px-3">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-4 text-red-600">{error}</div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">PS Name</TableHead>
                  <TableHead className="text-center">Total Leads</TableHead>
                  <TableHead className="text-center">Unattended</TableHead>
                  <TableHead className="text-center">F1</TableHead>
                  <TableHead className="text-center">F2</TableHead>
                  <TableHead className="text-center">F3</TableHead>
                  <TableHead className="text-center">F4</TableHead>
                  <TableHead className="text-center">F5</TableHead>
                  <TableHead className="text-center">F6</TableHead>
                  <TableHead className="text-center">F7</TableHead>
                  <TableHead className="text-center">F8</TableHead>
                  <TableHead className="text-center">F9</TableHead>
                  <TableHead className="text-center">F10</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(row => (
                  <TableRow key={row.ps_name} className={row.ps_name === 'TOTAL' ? 'bg-gray-50 font-semibold' : ''}>
                    <TableCell className={row.ps_name === 'TOTAL' ? 'font-bold' : ''}>{row.ps_name}</TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && openDrillDown(row.ps_name, row.lead_count)}
                    >
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">{row.lead_count}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.unattended_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.unattended_count || 0) > 0 && openDrillDown(row.ps_name, row.unattended_count || 0, 'unattended')}
                    >
                      <Badge className={(row.unattended_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-800'}>{row.unattended_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f1_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f1_count || 0) > 0 && openDrillDown(row.ps_name, row.f1_count || 0, 'f1' as const)}
                    >
                      <Badge className={(row.f1_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f1_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f2_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f2_count || 0) > 0 && openDrillDown(row.ps_name, row.f2_count || 0, 'f2' as const)}
                    >
                      <Badge className={(row.f2_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f2_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f3_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f3_count || 0) > 0 && openDrillDown(row.ps_name, row.f3_count || 0, 'f3' as const)}
                    >
                      <Badge className={(row.f3_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f3_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f4_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f4_count || 0) > 0 && openDrillDown(row.ps_name, row.f4_count || 0, 'f4' as const)}
                    >
                      <Badge className={(row.f4_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f4_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f5_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f5_count || 0) > 0 && openDrillDown(row.ps_name, row.f5_count || 0, 'f5' as const)}
                    >
                      <Badge className={(row.f5_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f5_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f6_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f6_count || 0) > 0 && openDrillDown(row.ps_name, row.f6_count || 0, 'f6' as const)}
                    >
                      <Badge className={(row.f6_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f6_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f7_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f7_count || 0) > 0 && openDrillDown(row.ps_name, row.f7_count || 0, 'f7' as const)}
                    >
                      <Badge className={(row.f7_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f7_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f8_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f8_count || 0) > 0 && openDrillDown(row.ps_name, row.f8_count || 0, 'f8' as const)}
                    >
                      <Badge className={(row.f8_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f8_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f9_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f9_count || 0) > 0 && openDrillDown(row.ps_name, row.f9_count || 0, 'f9' as const)}
                    >
                      <Badge className={(row.f9_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f9_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f10_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f10_count || 0) > 0 && openDrillDown(row.ps_name, row.f10_count || 0, 'f10' as const)}
                    >
                      <Badge className={(row.f10_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f10_count || 0}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.length === 0 && (
            <div className="text-center py-8 text-gray-500">No PS followups data available for this branch.</div>
          )}
        </CardContent>
      </Card>

      {/* Drill-down Leads Modal */}
      <Dialog open={drillDownOpen} onOpenChange={setDrillDownOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="mb-2">{drillDownTitle}</DialogTitle>
                <DialogDescription>Click on a lead to view detailed call history and remarks</DialogDescription>
              </div>
              {drillDownLeads.length > 0 && !drillDownLoading && (
                <div className="flex-shrink-0 pt-2 mr-10">
                  <Button
                    onClick={() => {
                      try {
                        const currentDate = new Date().toISOString().split('T')[0]
                        const headers = ['Lead UID', 'Customer Name', 'Mobile', 'Alternate Mobile', 'Source', 'Created At', 'Model', 'Status', 'First Call', 'Second Call', 'Third Call', 'Fourth Call', 'Fifth Call', 'Sixth Call', 'Seventh Call']
                        const csvRows = [
                          drillDownTitle,
                          `Generated: ${currentDate}`,
                          `Total Records: ${drillDownLeads.length}`,
                          '',
                          headers.join(','),
                          ...drillDownLeads.map(lead => [
                            `"${lead.lead_uid || (lead as any).uid || ''}"`,
                            `"${lead.customer_name || ''}"`,
                            lead.customer_mobile_number || '',
                            lead.alternate_mobile_number || '',
                            `"${lead.source || ''}"`,
                            lead.created_at ? new Date(lead.created_at).toISOString() : '',
                            `"${lead.model_interested || ''}"`,
                            `"${lead.final_status || lead.lead_status || 'Pending'}"`,
                            lead.first_call_date ? new Date(lead.first_call_date).toISOString() : '',
                            lead.second_call_date ? new Date(lead.second_call_date).toISOString() : '',
                            lead.third_call_date ? new Date(lead.third_call_date).toISOString() : '',
                            lead.fourth_call_date ? new Date(lead.fourth_call_date).toISOString() : '',
                            lead.fifth_call_date ? new Date(lead.fifth_call_date).toISOString() : '',
                            lead.sixth_call_date ? new Date(lead.sixth_call_date).toISOString() : '',
                            lead.seventh_call_date ? new Date(lead.seventh_call_date).toISOString() : ''
                          ].join(','))
                        ]
                        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
                        const link = document.createElement('a')
                        const url = URL.createObjectURL(blob)
                        link.href = url
                        link.download = `${drillDownTitle.replace(/[^a-z0-9]/gi, '_')}-${currentDate}.csv`
                        link.style.visibility = 'hidden'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      } catch {}
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {drillDownLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading leads...</span>
            </div>
          ) : drillDownLeads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No leads found for this selection.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownLeads.map((lead) => (
                    <TableRow 
                      key={lead.lead_uid || (lead as any).uid || Math.random()}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedLead(lead)
                        setLeadDetailOpen(true)
                      }}
                    >
                      <TableCell className="font-medium">{lead.customer_name || 'N/A'}</TableCell>
                      <TableCell>{lead.customer_mobile_number || 'N/A'}</TableCell>
                      <TableCell>{lead.source || 'N/A'}</TableCell>
                      <TableCell>{lead.created_at ? new Date(lead.created_at).toLocaleString() : 'N/A'}</TableCell>
                      <TableCell>{lead.model_interested || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={
                          lead.final_status === 'Won' ? 'bg-green-100 text-green-800' :
                          lead.final_status === 'Lost' ? 'bg-red-100 text-red-800' :
                          lead.final_status === 'Booked' ? 'bg-blue-100 text-blue-800' :
                          lead.final_status === 'Waiting for Approval' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {lead.final_status || lead.lead_status || 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lead Detail Modal */}
      <Dialog open={leadDetailOpen} onOpenChange={setLeadDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle>Lead Details - {selectedLead.customer_name}</DialogTitle>
                <DialogDescription>Full call history and remarks for {selectedLead.lead_uid}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-500">Lead UID</label>
                      <div className="text-sm">{selectedLead.lead_uid}</div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500">Customer Name</label>
                      <div className="text-sm">{selectedLead.customer_name || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500">Mobile</label>
                      <div className="text-sm">{selectedLead.customer_mobile_number || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500">Alternate Mobile</label>
                      <div className="text-sm">{selectedLead.alternate_mobile_number || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500">Source</label>
                      <div className="text-sm">{selectedLead.source || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500">CRE</label>
                      <div className="text-sm">{selectedLead.cre_name || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500">Model Interested</label>
                      <div className="text-sm">{selectedLead.model_interested || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500">Final Status</label>
                      <div className="text-sm">
                        <Badge className={
                          selectedLead.final_status === 'Won' ? 'bg-green-100 text-green-800' :
                          selectedLead.final_status === 'Lost' ? 'bg-red-100 text-red-800' :
                          selectedLead.final_status === 'Booked' ? 'bg-blue-100 text-blue-800' :
                          selectedLead.final_status === 'Waiting for Approval' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {selectedLead.final_status || 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Call History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Call History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* First Call */}
                    {selectedLead.first_call_date && (
                      <div className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold">First Call</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Date: {new Date(selectedLead.first_call_date).toLocaleString()}
                        </div>
                        {selectedLead.first_call_remark && (
                          <div className="text-sm mb-2">
                            <span className="font-semibold">Remarks:</span> {selectedLead.first_call_remark}
                          </div>
                        )}
                        {selectedLead.first_call_lead_status && (
                          <div className="text-sm">
                            <span className="font-semibold">Status:</span> {selectedLead.first_call_lead_status}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Second Call */}
                    {selectedLead.second_call_date && (
                      <div className="border-l-4 border-green-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-green-500" />
                          <span className="font-semibold">Second Call</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Date: {new Date(selectedLead.second_call_date).toLocaleString()}
                        </div>
                        {selectedLead.second_call_remark && (
                          <div className="text-sm mb-2">
                            <span className="font-semibold">Remarks:</span> {selectedLead.second_call_remark}
                          </div>
                        )}
                        {selectedLead.second_call_lead_status && (
                          <div className="text-sm">
                            <span className="font-semibold">Status:</span> {selectedLead.second_call_lead_status}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Third Call */}
                    {selectedLead.third_call_date && (
                      <div className="border-l-4 border-purple-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-purple-500" />
                          <span className="font-semibold">Third Call</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Date: {new Date(selectedLead.third_call_date).toLocaleString()}
                        </div>
                        {selectedLead.third_call_remark && (
                          <div className="text-sm mb-2">
                            <span className="font-semibold">Remarks:</span> {selectedLead.third_call_remark}
                          </div>
                        )}
                        {selectedLead.third_call_lead_status && (
                          <div className="text-sm">
                            <span className="font-semibold">Status:</span> {selectedLead.third_call_lead_status}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Fourth Call */}
                    {selectedLead.fourth_call_date && (
                      <div className="border-l-4 border-yellow-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold">Fourth Call</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Date: {new Date(selectedLead.fourth_call_date).toLocaleString()}
                        </div>
                        {selectedLead.fourth_call_remark && (
                          <div className="text-sm mb-2">
                            <span className="font-semibold">Remarks:</span> {selectedLead.fourth_call_remark}
                          </div>
                        )}
                        {selectedLead.fourth_call_lead_status && (
                          <div className="text-sm">
                            <span className="font-semibold">Status:</span> {selectedLead.fourth_call_lead_status}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Fifth Call */}
                    {selectedLead.fifth_call_date && (
                      <div className="border-l-4 border-red-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-red-500" />
                          <span className="font-semibold">Fifth Call</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Date: {new Date(selectedLead.fifth_call_date).toLocaleString()}
                        </div>
                        {selectedLead.fifth_call_remark && (
                          <div className="text-sm mb-2">
                            <span className="font-semibold">Remarks:</span> {selectedLead.fifth_call_remark}
                          </div>
                        )}
                        {selectedLead.fifth_call_lead_status && (
                          <div className="text-sm">
                            <span className="font-semibold">Status:</span> {selectedLead.fifth_call_lead_status}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Sixth Call */}
                    {selectedLead.sixth_call_date && (
                      <div className="border-l-4 border-indigo-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-indigo-500" />
                          <span className="font-semibold">Sixth Call</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Date: {new Date(selectedLead.sixth_call_date).toLocaleString()}
                        </div>
                        {selectedLead.sixth_call_remark && (
                          <div className="text-sm mb-2">
                            <span className="font-semibold">Remarks:</span> {selectedLead.sixth_call_remark}
                          </div>
                        )}
                        {selectedLead.sixth_call_lead_status && (
                          <div className="text-sm">
                            <span className="font-semibold">Status:</span> {selectedLead.sixth_call_lead_status}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Seventh Call */}
                    {selectedLead.seventh_call_date && (
                      <div className="border-l-4 border-pink-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-pink-500" />
                          <span className="font-semibold">Seventh Call</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Date: {new Date(selectedLead.seventh_call_date).toLocaleString()}
                        </div>
                        {selectedLead.seventh_call_remark && (
                          <div className="text-sm mb-2">
                            <span className="font-semibold">Remarks:</span> {selectedLead.seventh_call_remark}
                          </div>
                        )}
                        {selectedLead.seventh_call_lead_status && (
                          <div className="text-sm">
                            <span className="font-semibold">Status:</span> {selectedLead.seventh_call_lead_status}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!selectedLead.first_call_date && (
                      <div className="text-center py-4 text-gray-500">
                        No call history available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PsFollowupsTable


