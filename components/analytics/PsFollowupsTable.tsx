'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RefreshCw, Download, ChevronDown } from 'lucide-react'

interface PsFollowupsRow {
  ps_name: string
  lead_count: number
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
  cre_name: string
  model_interested: string
  lead_status: string
  final_status: string
  first_call_date: string
  second_call_date: string
  third_call_date: string
  fourth_call_date: string
  fifth_call_date: string
  sixth_call_date: string
  seventh_call_date: string
  created_at: string
  updated_at: string
}

interface PsFollowupsTableProps {
  branch?: string
}

const PsFollowupsTable: React.FC<PsFollowupsTableProps> = ({ branch }) => {
  const [data, setData] = useState<PsFollowupsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userBranch, setUserBranch] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const [drillDownOpen, setDrillDownOpen] = useState(false)
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [drillDownTitle, setDrillDownTitle] = useState('')
  const [drillDownLeads, setDrillDownLeads] = useState<LeadDetail[]>([])

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

      const res = await fetch(`/api/analytics/sales-manager/ps-followups?branch=${encodeURIComponent(currentBranch)}&_t=${Date.now()}` ,{
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
    } catch (e:any) {
      setError(e?.message || 'Error loading PS followups data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userBranch) fetchData()
  }, [userBranch, branch])

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      setError('No data available to export')
      return
    }
    setExporting(true)
    try {
      const currentDate = new Date().toISOString().split('T')[0]
      const branchName = userBranch || branch || 'analytics'

      const headers = ['PS Name', 'Total Leads', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10']
      const rows = data.map(r => [
        `"${r.ps_name}"`, r.lead_count,
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

  const openDrillDown = async (psName: string, total: number, filter?: 'f1') => {
    if (psName === 'TOTAL' || total === 0) return
    try {
      setDrillDownLoading(true)
      setDrillDownTitle(`${psName} - ${filter === 'f1' ? 'F1' : 'Total Leads'} (${total})`)
      setDrillDownOpen(true)

      const currentBranch = branch || userBranch
      if (!currentBranch) return

      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      if (!token) return

      const res = await fetch(`/api/analytics/sales-manager/ps-followup-leads?branch=${encodeURIComponent(currentBranch)}&ps_name=${encodeURIComponent(psName)}${filter ? `&filter=${filter}` : ''}` ,{
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>PS Followups</CardTitle>
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
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f1_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f1_count || 0) > 0 && openDrillDown(row.ps_name, row.f1_count || 0, 'f1')}
                    >
                      <Badge className={(row.f1_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f1_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f2_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f2_count || 0) > 0 && openDrillDown(row.ps_name, row.f2_count || 0, 'f2')}
                    >
                      <Badge className={(row.f2_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f2_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f3_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f3_count || 0) > 0 && openDrillDown(row.ps_name, row.f3_count || 0, 'f3')}
                    >
                      <Badge className={(row.f3_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f3_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f4_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f4_count || 0) > 0 && openDrillDown(row.ps_name, row.f4_count || 0, 'f4')}
                    >
                      <Badge className={(row.f4_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f4_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f5_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f5_count || 0) > 0 && openDrillDown(row.ps_name, row.f5_count || 0, 'f5')}
                    >
                      <Badge className={(row.f5_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f5_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f6_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f6_count || 0) > 0 && openDrillDown(row.ps_name, row.f6_count || 0, 'f6')}
                    >
                      <Badge className={(row.f6_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f6_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f7_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f7_count || 0) > 0 && openDrillDown(row.ps_name, row.f7_count || 0, 'f7')}
                    >
                      <Badge className={(row.f7_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f7_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f8_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f8_count || 0) > 0 && openDrillDown(row.ps_name, row.f8_count || 0, 'f8')}
                    >
                      <Badge className={(row.f8_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f8_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f9_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f9_count || 0) > 0 && openDrillDown(row.ps_name, row.f9_count || 0, 'f9')}
                    >
                      <Badge className={(row.f9_count || 0) === 0 ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}>{row.f9_count || 0}</Badge>
                    </TableCell>
                    <TableCell 
                      className={`text-center ${row.ps_name !== 'TOTAL' && (row.f10_count || 0) > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => row.ps_name !== 'TOTAL' && (row.f10_count || 0) > 0 && openDrillDown(row.ps_name, row.f10_count || 0, 'f10')}
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
                <DialogDescription>Click on a lead to export the list if needed</DialogDescription>
              </div>
              {drillDownLeads.length > 0 && !drillDownLoading && (
                <div className="flex-shrink-0 pt-2 mr-10">
                  <Button
                    onClick={() => {
                      try {
                        const currentDate = new Date().toISOString().split('T')[0]
                        const headers = ['Lead UID', 'Customer Name', 'Mobile', 'Alternate Mobile', 'Source', 'CRE', 'Model', 'Status', 'First Call', 'Second Call', 'Third Call', 'Fourth Call', 'Fifth Call', 'Sixth Call', 'Seventh Call']
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
                            `"${lead.cre_name || ''}"`,
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
                    <TableHead>CRE</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownLeads.map((lead) => (
                    <TableRow key={lead.lead_uid || (lead as any).uid || Math.random()}>
                      <TableCell className="font-medium">{lead.customer_name || 'N/A'}</TableCell>
                      <TableCell>{lead.customer_mobile_number || 'N/A'}</TableCell>
                      <TableCell>{lead.source || 'N/A'}</TableCell>
                      <TableCell>{lead.cre_name || 'N/A'}</TableCell>
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
    </div>
  )
}

export default PsFollowupsTable


