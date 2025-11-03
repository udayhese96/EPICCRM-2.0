'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { RefreshCw, ChevronDown, Download, Calendar, Phone, User, X } from 'lucide-react'

interface TlPerformanceData {
  tl_name: string
  lead_count: number
  unattended: number
  open_leads: number
  lost_leads: number
  approval_pending: number
  booked: number
  retailed: number
}

interface LeadDetail {
  lead_uid: string
  ps_name?: string
  customer_name: string
  customer_mobile_number: string
  alternate_mobile_number: string
  source: string
  sub_source?: string
  cre_name: string
  lead_category: string
  model_interested: string
  follow_up_date: string
  lead_status: string
  final_status: string
  first_call_date: string
  first_call_remark: string
  first_call_lead_status: string
  second_call_date: string
  second_call_remark: string
  second_call_lead_status: string
  third_call_date: string
  third_call_remark: string
  third_call_lead_status: string
  fourth_call_date: string
  fourth_call_remark: string
  fourth_call_lead_status: string
  fifth_call_date: string
  fifth_call_remark: string
  fifth_call_lead_status: string
  sixth_call_date: string
  sixth_call_remark: string
  sixth_call_lead_status: string
  seventh_call_date: string
  seventh_call_remark: string
  seventh_call_lead_status: string
  created_at: string
  updated_at: string
}

interface TlPerformanceTableProps {
  branch?: string
}

const TlPerformanceTable: React.FC<TlPerformanceTableProps> = ({ branch }) => {
  const [data, setData] = useState<TlPerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userBranch, setUserBranch] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  
  // Drill-down modal state
  const [drillDownOpen, setDrillDownOpen] = useState(false)
  const [drillDownLeads, setDrillDownLeads] = useState<LeadDetail[]>([])
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [drillDownTitle, setDrillDownTitle] = useState('')
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null)
  const [leadDetailOpen, setLeadDetailOpen] = useState(false)

  // Get user's branch from localStorage on mount
  useEffect(() => {
    const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
    const parsed = session ? JSON.parse(session) : null
    const branchFromSession = parsed?.branch || null
    setUserBranch(branchFromSession)
  }, [])

  const fetchTlPerformanceData = async () => {
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

      const response = await fetch(`/api/analytics/sales-manager/tl-performance?branch=${encodeURIComponent(currentBranch)}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
        console.log(`✅ TL Performance data loaded for branch: ${currentBranch}`, result.data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load TL Performance data')
        console.error('❌ Failed to load TL Performance data:', errorData)
      }
    } catch (error) {
      console.error('❌ Error loading TL Performance data:', error)
      setError('Error loading TL Performance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userBranch) {
      fetchTlPerformanceData()
    }
  }, [userBranch, branch])

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      setError('No data available to export')
      return
    }

    setExporting(true)

    try {
      const currentDate = new Date().toISOString().split('T')[0]
      const currentTime = new Date().toLocaleTimeString()
      const branchName = userBranch || branch || 'analytics'

      // Create CSV headers
      const headers = [
        'Team Leader Name',
        'Total Leads',
        'Unattended',
        'Open Leads',
        'Lost Leads',
        'Approval Pending',
        'Booked',
        'Retailed'
      ]

      // Create CSV content with metadata
      const csvRows = [
        // Metadata rows
        `Team Leader Performance Analytics Report`,
        `Branch: ${branchName}`,
        `Generated: ${currentDate} at ${currentTime}`,
        `Total Records: ${data.length}`,
        '', // Empty row for spacing
        // Headers
        headers.join(','),
        // Data rows
        ...data.map(row => [
          `"${row.tl_name}"`,
          row.lead_count,
          row.unattended,
          row.open_leads,
          row.lost_leads,
          row.approval_pending,
          row.booked,
          row.retailed
        ].join(','))
      ]

      // Create CSV content
      const csvContent = csvRows.join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `tl-performance-${branchName}-${currentDate}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log(`✅ TL Performance data exported successfully for branch: ${branchName}`)
    } catch (error) {
      console.error('❌ Error exporting data:', error)
      setError('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadgeColor = (status: string, count: number) => {
    if (count === 0) return 'bg-gray-100 text-gray-600'

    switch (status) {
      case 'Unattended':
        return 'bg-yellow-100 text-yellow-800'
      case 'Open Leads':
        return 'bg-blue-100 text-blue-800'
      case 'Lost':
        return 'bg-red-100 text-red-800'
      case 'Waiting for Approval':
        return 'bg-purple-100 text-purple-800'
      case 'Booked':
        return 'bg-green-100 text-green-800'
      case 'Won':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Unattended':
        return 'Unattended'
      case 'Open Leads':
        return 'Open Leads'
      case 'Lost':
        return 'Lost Leads'
      case 'Waiting for Approval':
        return 'Approval Pending'
      case 'Booked':
        return 'Booked'
      case 'Won':
        return 'Retailed'
      default:
        return status
    }
  }

  const handleCellClick = async (tlName: string, statusType: string) => {
    // Don't allow clicking on TOTAL row
    if (tlName === 'TOTAL') return
    
    // Don't allow clicking on cells with 0 count
    const row = data.find(r => r.tl_name === tlName)
    if (!row) return
    
    const countMap: { [key: string]: number } = {
      'total': row.lead_count,
      'unattended': row.unattended,
      'open_leads': row.open_leads,
      'lost_leads': row.lost_leads,
      'approval_pending': row.approval_pending,
      'booked': row.booked,
      'retailed': row.retailed
    }
    
    if (countMap[statusType] === 0) return
    
    try {
      setDrillDownLoading(true)
      setDrillDownTitle(`${tlName} - ${getStatusLabel(statusType)} (${countMap[statusType]})`)
      setDrillDownOpen(true)
      
      const currentBranch = branch || userBranch
      if (!currentBranch) {
        setError('Branch information not available')
        return
      }
      
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      
      if (!token) {
        setError('Authentication token not found. Please log in again.')
        return
      }
      
      const response = await fetch(
        `/api/analytics/sales-manager/tl-leads?branch=${encodeURIComponent(currentBranch)}&tl_name=${encodeURIComponent(tlName)}&status_type=${statusType}`,
        {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        }
      )
      
      if (response.ok) {
        const result = await response.json()
        setDrillDownLeads(result.leads || [])
        console.log(`✅ Drill-down leads loaded: ${result.leads?.length || 0} leads`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load drill-down data')
        console.error('❌ Failed to load drill-down data:', errorData)
      }
    } catch (error) {
      console.error('❌ Error loading drill-down data:', error)
      setError('Error loading drill-down data')
    } finally {
      setDrillDownLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Leader Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
            <p className="text-gray-500 mt-4">Loading Team Leader Performance data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Leader Analytics</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              disabled={exporting || data.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button onClick={fetchTlPerformanceData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Team Leader Analytics</CardTitle>
        <div className="flex gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            disabled={exporting || data.length === 0}
            className="px-2 sm:px-3"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
          <Button 
            onClick={fetchTlPerformanceData} 
            variant="outline" 
            size="sm"
            className="px-2 sm:px-3"
          >
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-left w-24">Team Leader</TableHead>
                <TableHead className="text-center font-semibold w-12">Total</TableHead>
                <TableHead className="text-center font-semibold w-16">Unattended</TableHead>
                <TableHead className="text-center font-semibold w-12">Open</TableHead>
                <TableHead className="text-center font-semibold w-12">Lost</TableHead>
                <TableHead className="text-center font-semibold w-16">Pending</TableHead>
                <TableHead className="text-center font-semibold w-12">Booked</TableHead>
                <TableHead className="text-center font-semibold w-12">Retailed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow 
                  key={row.tl_name} 
                  className={row.tl_name === 'TOTAL' ? 'font-bold bg-gray-50' : ''}
                >
                  <TableCell className="text-left">
                    <div className="truncate max-w-20" title={row.tl_name}>
                      {row.tl_name}
                    </div>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.tl_name !== 'TOTAL' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.tl_name !== 'TOTAL' && handleCellClick(row.tl_name, 'total')}
                  >
                    {row.lead_count}
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.tl_name !== 'TOTAL' && row.unattended > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.tl_name !== 'TOTAL' && row.unattended > 0 && handleCellClick(row.tl_name, 'unattended')}
                  >
                    <Badge variant="outline" className={`${getStatusBadgeColor('Unattended', row.unattended)} text-xs px-1 py-0`}>
                      {row.unattended}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.tl_name !== 'TOTAL' && row.open_leads > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.tl_name !== 'TOTAL' && row.open_leads > 0 && handleCellClick(row.tl_name, 'open_leads')}
                  >
                    <Badge variant="outline" className={`${getStatusBadgeColor('Open Leads', row.open_leads)} text-xs px-1 py-0`}>
                      {row.open_leads}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.tl_name !== 'TOTAL' && row.lost_leads > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.tl_name !== 'TOTAL' && row.lost_leads > 0 && handleCellClick(row.tl_name, 'lost_leads')}
                  >
                    <Badge variant="outline" className={`${getStatusBadgeColor('Lost', row.lost_leads)} text-xs px-1 py-0`}>
                      {row.lost_leads}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.tl_name !== 'TOTAL' && row.approval_pending > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.tl_name !== 'TOTAL' && row.approval_pending > 0 && handleCellClick(row.tl_name, 'approval_pending')}
                  >
                    <Badge variant="outline" className={`${getStatusBadgeColor('Waiting for Approval', row.approval_pending)} text-xs px-1 py-0`}>
                      {row.approval_pending}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.tl_name !== 'TOTAL' && row.booked > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.tl_name !== 'TOTAL' && row.booked > 0 && handleCellClick(row.tl_name, 'booked')}
                  >
                    <Badge variant="outline" className={`${getStatusBadgeColor('Booked', row.booked)} text-xs px-1 py-0`}>
                      {row.booked}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.tl_name !== 'TOTAL' && row.retailed > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.tl_name !== 'TOTAL' && row.retailed > 0 && handleCellClick(row.tl_name, 'retailed')}
                  >
                    <Badge variant="outline" className={`${getStatusBadgeColor('Won', row.retailed)} text-xs px-1 py-0`}>
                      {row.retailed}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No Team Leader Performance data available for this branch.
          </div>
        )}
      </CardContent>
      
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
                        const currentTime = new Date().toLocaleTimeString()
                        
                        const headers = ['Lead UID', 'PS Name', 'Customer Name', 'Mobile', 'Alternate Mobile', 'Source', 'CRE', 'Model Interested', 'Status', 'First Call Date', 'Second Call Date', 'Third Call Date', 'Fourth Call Date', 'Fifth Call Date', 'Sixth Call Date', 'Seventh Call Date']
                        
                        const csvRows = [
                          drillDownTitle,
                          `Generated: ${currentDate} at ${currentTime}`,
                          `Total Records: ${drillDownLeads.length}`,
                          '',
                          headers.join(','),
                          ...drillDownLeads.map(lead => [
                            `"${lead.lead_uid || ''}"`,
                            `"${lead.ps_name || ''}"`,
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
                        
                        const csvContent = csvRows.join('\n')
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                        const link = document.createElement('a')
                        const url = URL.createObjectURL(blob)
                        
                        link.setAttribute('href', url)
                        link.setAttribute('download', `${drillDownTitle.replace(/[^a-z0-9]/gi, '_')}-${currentDate}.csv`)
                        link.style.visibility = 'hidden'
                        
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        
                        console.log(`✅ Drill-down leads exported successfully`)
                      } catch (error) {
                        console.error('❌ Error exporting drill-down data:', error)
                        setError('Failed to export data')
                      }
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
            <div className="text-center py-8 text-gray-500">
              No leads found for this selection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>PS Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>CRE</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownLeads.map((lead) => (
                    <TableRow 
                      key={lead.lead_uid}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedLead(lead)
                        setLeadDetailOpen(true)
                      }}
                    >
                      <TableCell className="font-medium">{lead.customer_name || 'N/A'}</TableCell>
                      <TableCell>{lead.ps_name || 'N/A'}</TableCell>
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
                      <label className="text-sm font-semibold text-gray-500">PS Name</label>
                      <div className="text-sm">{selectedLead.ps_name || 'N/A'}</div>
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
    </Card>
  )
}

export default TlPerformanceTable
