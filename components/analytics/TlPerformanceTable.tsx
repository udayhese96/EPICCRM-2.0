'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'

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

interface TlPerformanceTableProps {
  branch?: string
}

const TlPerformanceTable: React.FC<TlPerformanceTableProps> = ({ branch }) => {
  const [data, setData] = useState<TlPerformanceData[]>([])
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
                  <TableCell className="text-center">{row.lead_count}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${getStatusBadgeColor('Unattended', row.unattended)} text-xs px-1 py-0`}>
                      {row.unattended}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${getStatusBadgeColor('Open Leads', row.open_leads)} text-xs px-1 py-0`}>
                      {row.open_leads}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${getStatusBadgeColor('Lost', row.lost_leads)} text-xs px-1 py-0`}>
                      {row.lost_leads}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${getStatusBadgeColor('Waiting for Approval', row.approval_pending)} text-xs px-1 py-0`}>
                      {row.approval_pending}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${getStatusBadgeColor('Booked', row.booked)} text-xs px-1 py-0`}>
                      {row.booked}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
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
    </Card>
  )
}

export default TlPerformanceTable
