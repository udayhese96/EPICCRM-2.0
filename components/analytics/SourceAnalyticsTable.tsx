'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'

interface SourceAnalyticsData {
  source: string
  count: number
  won: number
  conversion_percentage: number
  is_main_source: boolean
  parent_source?: string
}

interface SourceAnalyticsTableProps {
  branch?: string
}

const SourceAnalyticsTable: React.FC<SourceAnalyticsTableProps> = ({ branch }) => {
  const [data, setData] = useState<SourceAnalyticsData[]>([])
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

  const fetchSourceAnalyticsData = async () => {
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

      const response = await fetch(`/api/analytics/sales-manager/source-analytics?branch=${encodeURIComponent(currentBranch)}&_t=${Date.now()}`, {
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
        console.log(`✅ Source Analytics data loaded for branch: ${currentBranch}`, result.data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load Source Analytics data')
        console.error('❌ Failed to load Source Analytics data:', errorData)
      }
    } catch (error) {
      console.error('❌ Error loading Source Analytics data:', error)
      setError('Error loading Source Analytics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userBranch) {
      fetchSourceAnalyticsData()
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
        'Source',
        'Total Leads',
        'Won Leads',
        'Conversion Rate (%)',
        'Type'
      ]

      // Create CSV content with metadata
      const csvRows = [
        // Metadata rows
        `Source Analytics Report`,
        `Branch: ${branchName}`,
        `Generated: ${currentDate} at ${currentTime}`,
        `Total Records: ${data.length}`,
        '', // Empty row for spacing
        // Headers
        headers.join(','),
        // Data rows
        ...data.map(row => [
          `"${row.source}"`,
          row.count,
          row.won,
          row.conversion_percentage,
          row.is_main_source ? 'Main Source' : 'Sub Source'
        ].join(','))
      ]

      // Create CSV content
      const csvContent = csvRows.join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `source-analytics-${branchName}-${currentDate}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log(`✅ Source Analytics data exported successfully for branch: ${branchName}`)
    } catch (error) {
      console.error('❌ Error exporting data:', error)
      setError('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const getConversionBadgeColor = (percentage: number) => {
    if (percentage >= 20) return 'bg-green-100 text-green-800'
    if (percentage >= 10) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getSourceTypeBadgeColor = (isMainSource: boolean) => {
    return isMainSource ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Source Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
            <p className="text-gray-500 mt-4">Loading Source Analytics data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Source Analytics</CardTitle>
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
              onClick={fetchSourceAnalyticsData} 
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
            <p className="text-red-600 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Source Analytics</CardTitle>
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
            onClick={fetchSourceAnalyticsData} 
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
                <TableHead className="font-semibold text-left w-32">Source</TableHead>
                <TableHead className="text-center font-semibold w-12">Total</TableHead>
                <TableHead className="text-center font-semibold w-12">Won</TableHead>
                <TableHead className="text-center font-semibold w-16">Conv%</TableHead>
                <TableHead className="text-center font-semibold w-12">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow 
                  key={`${row.source}-${index}`} 
                  className={row.is_main_source ? 'font-semibold bg-blue-50' : 'pl-2'}
                >
                  <TableCell className="text-left">
                    <div className="truncate max-w-28" title={row.is_main_source ? row.source : `└─ ${row.source}`}>
                      {row.is_main_source ? row.source : `└─ ${row.source}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{row.count}</TableCell>
                  <TableCell className="text-center">{row.won}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-xs px-1 py-0 ${getConversionBadgeColor(row.conversion_percentage)}`}>
                      {row.conversion_percentage}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-xs px-1 py-0 ${getSourceTypeBadgeColor(row.is_main_source)}`}>
                      {row.is_main_source ? 'Main' : 'Sub'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

          {data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No Source Analytics data available for this branch.
            </div>
          )}
        </CardContent>
      </Card>
  )
}

export default SourceAnalyticsTable
