'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'
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

interface PsPerformanceTableProps {
  branch?: string
}

const PsPerformanceTable: React.FC<PsPerformanceTableProps> = ({ branch }) => {
  const [data, setData] = useState<PsPerformanceData[]>([])
  const [kpiCards, setKpiCards] = useState<KpiCardsData | null>(null)
  const [psRankings, setPsRankings] = useState<PsRankingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userBranch, setUserBranch] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

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
        return
      }

      if (!token) {
        setError('Authentication token not found. Please log in again.')
        return
      }

      const response = await fetch(`/api/analytics/sales-manager/ps-performance?branch=${encodeURIComponent(currentBranch)}&_t=${Date.now()}`, {
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
        setKpiCards(result.kpi_cards || null)
        setPsRankings(result.ps_rankings || [])
        console.log(`✅ PS Performance data loaded for branch: ${currentBranch}`, result.data)
        console.log(`✅ KPI Cards data loaded:`, result.kpi_cards)
        console.log(`✅ PS Rankings data loaded:`, result.ps_rankings)
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
      fetchPsPerformanceData()
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
        {kpiCards && <KpiCards kpiCards={kpiCards} />}
        
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
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export CSV'}
                  </Button>
                  <Button onClick={fetchPsPerformanceData} variant="outline" size="sm">
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
      {kpiCards && <KpiCards kpiCards={kpiCards} />}
      
      {/* PS Performance Table and Rankings */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main PS Performance Table */}
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
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </Button>
                <Button onClick={fetchPsPerformanceData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
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
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {row.lead_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusBadgeColor('unattended', row.unattended)}>
                      {row.unattended}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusBadgeColor('open_leads', row.open_leads)}>
                      {row.open_leads}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusBadgeColor('lost_leads', row.lost_leads)}>
                      {row.lost_leads}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusBadgeColor('approval_pending', row.approval_pending)}>
                      {row.approval_pending}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusBadgeColor('booked', row.booked)}>
                      {row.booked}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
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
    </div>
  )
}

export default PsPerformanceTable
