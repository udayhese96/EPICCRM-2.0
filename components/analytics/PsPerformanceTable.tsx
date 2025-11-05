'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { RefreshCw, ChevronDown, Download, Phone, Calendar, FileText, User, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import KpiCards from './KpiCards'
import PsRankings from './PsRankings'

interface PsPerformanceData {
  ps_name: string
  lead_count: number
  unattended: number
  open_leads: number
  lost_leads: number
  approval_pending: number
  booked: number
  retailed: number
}

interface KpiCardData {
  value: number
  percentage?: number
  label: string
}

interface KpiCardsData {
  total_leads: KpiCardData
  untouched: KpiCardData
  open_leads: KpiCardData
  lost_leads: KpiCardData
  won_leads: KpiCardData
}

interface PsRankingData {
  rank: number
  ps_name: string
  won_leads: number
  booked_leads: number
}

interface LeadDetail {
  lead_uid: string
  customer_name: string
  customer_mobile_number: string
  alternate_mobile_number: string
  source: string
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

interface PsPerformanceTableProps {
  branch?: string
  showKpiCards?: boolean
  dateFilterType?: 'today' | 'mtd' | 'from_to' | 'all_time'
  startDate?: string
  endDate?: string
}

const PsPerformanceTable: React.FC<PsPerformanceTableProps> = ({ branch, showKpiCards = true, dateFilterType = 'all_time', startDate = '', endDate = '' }) => {
  const [data, setData] = useState<PsPerformanceData[]>([])
  const [kpiCards, setKpiCards] = useState<KpiCardsData | null>(null)
  const [psRankings, setPsRankings] = useState<PsRankingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userBranch, setUserBranch] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [teamLeaders, setTeamLeaders] = useState<string[]>([])
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('all')
  
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

  const fetchPsPerformanceData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      const currentBranch = branch || userBranch

      if (!currentBranch) {
        setError('Branch information not available')
        setLoading(false)
        return
      }

      if (!token) {
        setError('Authentication token not found. Please log in again.')
        setLoading(false)
        return
      }

      // Validate date filter for 'from_to' type
      if (dateFilterType === 'from_to') {
        // Normalize dates by trimming whitespace
        const normalizedStartDate = startDate?.trim() || ''
        const normalizedEndDate = endDate?.trim() || ''
        
        console.log('📅 Date filter validation:', {
          dateFilterType,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
          startDateLength: normalizedStartDate.length,
          endDateLength: normalizedEndDate.length
        })
        
        if (!normalizedStartDate || !normalizedEndDate) {
          const missingDates = []
          if (!normalizedStartDate) missingDates.push('start date')
          if (!normalizedEndDate) missingDates.push('end date')
          setError(`Please select both start date and end date for the date range filter. Missing: ${missingDates.join(' and ')}`)
          setLoading(false)
          return
        }
        
        // Validate date format and ensure end date is after start date
        const start = new Date(normalizedStartDate)
        const end = new Date(normalizedEndDate)
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.error('❌ Invalid date format:', { normalizedStartDate, normalizedEndDate, start: start.getTime(), end: end.getTime() })
          setError('Invalid date format. Please select valid dates.')
          setLoading(false)
          return
        }
        
        if (end < start) {
          setError('End date must be after or equal to start date.')
          setLoading(false)
          return
        }
      }

                  // Build query params with date filter and team leader filter
                  const params = new URLSearchParams({
                    branch: currentBranch,
                    _t: Date.now().toString()
                  })
                  
                  if (dateFilterType !== 'all_time') {
                    params.append('date_filter_type', dateFilterType)
                    if (dateFilterType === 'from_to') {
                      // Use normalized dates (already validated above)
                      const normalizedStartDate = startDate?.trim() || ''
                      const normalizedEndDate = endDate?.trim() || ''
                      if (normalizedStartDate && normalizedEndDate) {
                        params.append('start_date', normalizedStartDate)
                        params.append('end_date', normalizedEndDate)
                        console.log('✅ Adding dates to params:', { start_date: normalizedStartDate, end_date: normalizedEndDate })
                      }
                    }
                  }
                  
                  if (selectedTeamLeader && selectedTeamLeader !== 'all') {
                    params.append('team_leader', selectedTeamLeader)
                    console.log('✅ Adding Team Leader filter:', selectedTeamLeader)
                  }
                  
                  console.log('📤 Final API URL params:', params.toString())
      
      const response = await fetch(`/api/analytics/sales-manager/ps-performance?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })

                  if (response.ok) {
                    const result = await response.json()
                    console.log(`📦 Full API response:`, result)
                    console.log(`📦 Team Leaders in result:`, result.team_leaders)
                    console.log(`📦 Type of team_leaders:`, typeof result.team_leaders)
                    console.log(`📦 Is array:`, Array.isArray(result.team_leaders))
                    
                    setData(result.data || [])
                    setKpiCards(result.kpi_cards || null)
                    setPsRankings(result.ps_rankings || [])
                    
                    // Ensure team_leaders is an array
                    const teamLeadersArray = Array.isArray(result.team_leaders) 
                      ? result.team_leaders 
                      : (result.team_leaders ? [result.team_leaders] : [])
                    
                    setTeamLeaders(teamLeadersArray)
                    console.log(`✅ PS Performance data loaded for branch: ${currentBranch}`, result.data)
                    console.log(`✅ KPI Cards data loaded:`, result.kpi_cards)
                    console.log(`✅ PS Rankings data loaded:`, result.ps_rankings)
                    console.log(`✅ Team Leaders loaded:`, teamLeadersArray)
                    console.log(`✅ Team Leaders count:`, teamLeadersArray.length)
                    if (teamLeadersArray.length > 0) {
                      console.log(`✅ Team Leaders list:`, teamLeadersArray)
                    } else {
                      console.warn(`⚠️ No Team Leaders found in response. Full result keys:`, Object.keys(result))
                    }
                  } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load PS performance data')
        console.error('❌ Failed to load PS performance data:', errorData)
      }
    } catch (error) {
      console.error('❌ Error loading PS performance data:', error)
      setError('Error loading PS performance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userBranch) {
      // Don't auto-fetch if 'from_to' filter is selected but dates are missing
      const normalizedStartDate = startDate?.trim() || ''
      const normalizedEndDate = endDate?.trim() || ''
      
      if (dateFilterType === 'from_to' && (!normalizedStartDate || !normalizedEndDate)) {
        console.log('⏸️ Skipping fetch - dates missing:', { dateFilterType, startDate: normalizedStartDate, endDate: normalizedEndDate })
        setError('Please select both start date and end date for the date range filter.')
        setLoading(false)
        return
      }
      
      console.log('🔄 Triggering fetch with:', { dateFilterType, startDate: normalizedStartDate, endDate: normalizedEndDate })
      fetchPsPerformanceData()
    }
              }, [userBranch, branch, dateFilterType, startDate, endDate, selectedTeamLeader])

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
        'PS Name',
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
        `PS Performance Analytics Report`,
        `Branch: ${branchName}`,
        `Generated: ${currentDate} at ${currentTime}`,
        `Total Records: ${data.length}`,
        '', // Empty row for spacing
        // Headers
        headers.join(','),
        // Data rows
        ...data.map(row => [
          `"${row.ps_name}"`,
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
      link.setAttribute('download', `ps-performance-${branchName}-${currentDate}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log(`✅ PS Performance data exported successfully for branch: ${branchName}`)
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
      case 'unattended':
        return 'bg-yellow-100 text-yellow-800'
      case 'open_leads':
        return 'bg-blue-100 text-blue-800'
      case 'lost_leads':
        return 'bg-red-100 text-red-800'
      case 'approval_pending':
        return 'bg-orange-100 text-orange-800'
      case 'booked':
        return 'bg-green-100 text-green-800'
      case 'retailed':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'unattended':
        return 'Unattended'
      case 'open_leads':
        return 'Open Leads'
      case 'lost_leads':
        return 'Lost Leads'
      case 'approval_pending':
        return 'Approval Pending'
      case 'booked':
        return 'Booked'
      case 'retailed':
        return 'Retailed'
      default:
        return status
    }
  }

  const handleCellClick = async (psName: string, statusType: string) => {
    // Don't allow clicking on TOTAL row
    if (psName === 'TOTAL') return
    
    // Don't allow clicking on cells with 0 count
    const row = data.find(r => r.ps_name === psName)
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
      setDrillDownTitle(`${psName} - ${getStatusLabel(statusType)} (${countMap[statusType]})`)
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
      
      // Build query params with date filter
      const params = new URLSearchParams({
        branch: currentBranch,
        ps_name: psName,
        status_type: statusType
      })
      
      // Always include date filter parameters to match the table data
      if (dateFilterType !== 'all_time') {
        params.append('date_filter_type', dateFilterType)
        if (dateFilterType === 'from_to') {
          const normalizedStartDate = startDate?.trim() || ''
          const normalizedEndDate = endDate?.trim() || ''
          if (normalizedStartDate && normalizedEndDate) {
            params.append('start_date', normalizedStartDate)
            params.append('end_date', normalizedEndDate)
            console.log('✅ PS Drill-down - Adding dates to params:', { start_date: normalizedStartDate, end_date: normalizedEndDate })
          }
        }
      } else {
        // Explicitly set all_time if no filter is selected
        params.append('date_filter_type', 'all_time')
      }
      
      console.log('📤 PS Drill-down API URL params:', params.toString())
      
      const response = await fetch(
        `/api/analytics/sales-manager/ps-leads?${params.toString()}`,
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
          <CardTitle>PS Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading PS performance data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {/* KPI Cards - show even in error state if available */}
        {showKpiCards && kpiCards && <KpiCards kpiCards={kpiCards} />}
        
        {/* Error Card and Rankings */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>PS Performance Analytics</CardTitle>
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
                    onClick={fetchPsPerformanceData} 
                    variant="outline" 
                    size="sm"
                    className="px-2 sm:px-3"
                  >
                    <RefreshCw className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Retry</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                      <X className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="text-red-600 font-medium">{error}</p>
                    {error.includes('start_date and end_date') || error.includes('Please select both start date') ? (
                      <p className="text-sm text-gray-500 mt-2">Please use the date filter above to select a date range.</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* PS Rankings Table - show even in error state if available */}
          <div className="lg:w-80">
            <PsRankings psRankings={psRankings} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {showKpiCards && kpiCards && <KpiCards kpiCards={kpiCards} />}
      
      {/* PS Performance Table and Rankings */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main PS Performance Table */}
        <div className="flex-1">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>PS Performance Analytics</CardTitle>
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
                    onClick={fetchPsPerformanceData} 
                    variant="outline" 
                    size="sm"
                    className="px-2 sm:px-3"
                  >
                    <RefreshCw className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">PS Name</TableHead>
                <TableHead className="text-center">Total Leads</TableHead>
                <TableHead className="text-center">Unattended</TableHead>
                <TableHead className="text-center">Open Leads</TableHead>
                <TableHead className="text-center">Lost Leads</TableHead>
                <TableHead className="text-center">Approval Pending</TableHead>
                <TableHead className="text-center">Booked</TableHead>
                <TableHead className="text-center">Retailed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow 
                  key={row.ps_name} 
                  className={row.ps_name === 'TOTAL' ? 'bg-gray-50 font-semibold' : ''}
                >
                  <TableCell className={row.ps_name === 'TOTAL' ? 'font-bold' : ''}>
                    {row.ps_name}
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.ps_name !== 'TOTAL' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.ps_name !== 'TOTAL' && handleCellClick(row.ps_name, 'total')}
                  >
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {row.lead_count}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.ps_name !== 'TOTAL' && row.unattended > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.ps_name !== 'TOTAL' && row.unattended > 0 && handleCellClick(row.ps_name, 'unattended')}
                  >
                    <Badge className={getStatusBadgeColor('unattended', row.unattended)}>
                      {row.unattended}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.ps_name !== 'TOTAL' && row.open_leads > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.ps_name !== 'TOTAL' && row.open_leads > 0 && handleCellClick(row.ps_name, 'open_leads')}
                  >
                    <Badge className={getStatusBadgeColor('open_leads', row.open_leads)}>
                      {row.open_leads}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.ps_name !== 'TOTAL' && row.lost_leads > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.ps_name !== 'TOTAL' && row.lost_leads > 0 && handleCellClick(row.ps_name, 'lost_leads')}
                  >
                    <Badge className={getStatusBadgeColor('lost_leads', row.lost_leads)}>
                      {row.lost_leads}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.ps_name !== 'TOTAL' && row.approval_pending > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.ps_name !== 'TOTAL' && row.approval_pending > 0 && handleCellClick(row.ps_name, 'approval_pending')}
                  >
                    <Badge className={getStatusBadgeColor('approval_pending', row.approval_pending)}>
                      {row.approval_pending}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.ps_name !== 'TOTAL' && row.booked > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.ps_name !== 'TOTAL' && row.booked > 0 && handleCellClick(row.ps_name, 'booked')}
                  >
                    <Badge className={getStatusBadgeColor('booked', row.booked)}>
                      {row.booked}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`text-center ${row.ps_name !== 'TOTAL' && row.retailed > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => row.ps_name !== 'TOTAL' && row.retailed > 0 && handleCellClick(row.ps_name, 'retailed')}
                  >
                    <Badge className={getStatusBadgeColor('retailed', row.retailed)}>
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
            No PS performance data available for this branch.
          </div>
        )}
            </CardContent>
          </Card>
        </div>
        
        {/* PS Rankings Table */}
        <div className="lg:w-80">
          <PsRankings psRankings={psRankings} />
        </div>
      </div>
      
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
                        
                        const headers = ['Lead UID', 'Customer Name', 'Mobile', 'Alternate Mobile', 'Source', 'Created At', 'Model Interested', 'Status', 'First Call Date', 'Second Call Date', 'Third Call Date', 'Fourth Call Date', 'Fifth Call Date', 'Sixth Call Date', 'Seventh Call Date']
                        
                        const csvRows = [
                          drillDownTitle,
                          `Generated: ${currentDate} at ${currentTime}`,
                          `Total Records: ${drillDownLeads.length}`,
                          '',
                          headers.join(','),
                          ...drillDownLeads.map(lead => [
                            `"${lead.lead_uid || ''}"`,
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
                      key={lead.lead_uid}
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

export default PsPerformanceTable
