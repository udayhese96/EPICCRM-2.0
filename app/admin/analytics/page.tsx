'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  RefreshCw, 
  Download,
  MoreVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { LatestCallStatusDistribution } from '@/components/analytics/LatestCallStatusDistribution'
import { SourceCREDistribution } from '@/components/analytics/SourceCREDistribution'

interface CREPerformanceData {
  creName: string
  assigned: number
  qualifiedLeads: number
  untouched: number
  openLeads: number
  booked: number
  retailed: number
  lost: number
  tatAvg: number
  tatUnit: 'd' | 'h' | 'm'
}

interface CREPerformanceResponse {
  crePerformance: CREPerformanceData[]
  total: CREPerformanceData
  dateRange: {
    start: string
    end: string
    period: string
  }
}

// Helper function to get first day of current month in YYYY-MM-DD format
const getFirstDayOfMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<CREPerformanceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Initialize with MTD (Month To Date) - first day of current month to today
  const [selectedPeriod, setSelectedPeriod] = useState<'all_time' | 'today' | 'date_range'>('date_range')
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getTodayDate())

  const fetchData = async () => {
    try {
      setIsRefreshing(true)

      // Map selectedPeriod to filter mode
      let filterMode = 'all';
      let actualStartDate = '';
      let actualEndDate = '';

      if (selectedPeriod === 'all_time') {
        filterMode = 'all';
      } else if (selectedPeriod === 'today') {
        filterMode = 'today';
        actualStartDate = new Date().toISOString().split('T')[0];
      } else if (selectedPeriod === 'date_range' && startDate && endDate) {
        filterMode = 'range';
        actualStartDate = startDate;
        actualEndDate = endDate;
      }

      const params = new URLSearchParams({
        filter: filterMode,
        ...(actualStartDate && { startDate: actualStartDate }),
        ...(actualEndDate && { endDate: actualEndDate })
      })

      console.log('[Admin Analytics] Fetching CRE performance with params:', params.toString())

      const response = await fetch(`/api/analytics/admin-cre-performance?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[Admin Analytics] API error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch CRE performance data')
      }

      const analyticsData = await response.json()
      console.log('[Admin Analytics] CRE Performance data received:', analyticsData)
      setData(analyticsData)
    } catch (error) {
      console.error('[Admin Analytics] Error fetching CRE performance:', error)
      toast.error('Failed to fetch CRE performance data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleDownload = async (reportType: 'cre-performance' | 'all-analytics' = 'cre-performance') => {
    try {
      setIsRefreshing(true)
      
      let periodValue = selectedPeriod
      let dateStart = startDate
      let dateEnd = endDate

      // Handle "today" option - set date to today
      if (selectedPeriod === 'today') {
        const today = new Date().toISOString().split('T')[0]
        dateStart = today
        dateEnd = today
        periodValue = '7'
      } else if (selectedPeriod === 'all_time') {
        periodValue = 'all'
      } else if (selectedPeriod === 'date_range') {
        periodValue = '7'
      }

      const params = new URLSearchParams({
        period: periodValue,
        format: 'csv'
      })

      // Add date range parameters if provided or if using date_range/today
      if (dateStart) {
        params.append('startDate', dateStart)
      }
      if (dateEnd) {
        params.append('endDate', dateEnd)
      }

      const endpoint = reportType === 'all-analytics' 
        ? `/api/analytics/export-comprehensive?${params}`
        : `/api/analytics/cre-performance/export?${params}`

      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to download data')
      }

      // Get the filename from the response headers or create a default one
      const contentDisposition = response.headers.get('content-disposition')
      let filename = reportType === 'all-analytics' 
        ? 'comprehensive-analytics-report.csv'
        : 'cre-performance-report.csv'
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Create and download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`${reportType === 'all-analytics' ? 'Comprehensive analytics' : 'CRE Performance'} report downloaded successfully!`)
    } catch (error) {
      console.error('Error downloading report:', error)
      toast.error('Failed to download report')
    } finally {
      setIsRefreshing(false)
    }
  }


  useEffect(() => {
    // Clear date inputs when switching away from date_range
    if (selectedPeriod !== 'date_range') {
      setStartDate('')
      setEndDate('')
    } else {
      // When switching back to date_range, restore MTD if dates are empty
      if (!startDate || !endDate) {
        setStartDate(getFirstDayOfMonth())
        setEndDate(getTodayDate())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, startDate, endDate])

  const formatTAT = (tat: number, unit: 'd' | 'h' | 'm') => {
    return `${tat.toFixed(1)}${unit}`
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-orange-600">Loading CRE Performance...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-800">CRE Performance</h1>
                <Button
                  onClick={fetchData}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="bg-orange-600 border-orange-500 text-white hover:bg-orange-500 whitespace-nowrap"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {/* Filter Bar - Responsive Layout */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-orange-200 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 flex-wrap">
                {/* Period Selector */}
                <div className="flex items-center gap-2 min-w-0">
                  <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'all_time' | 'today' | 'date_range')}>
                    <SelectTrigger className="w-full sm:w-32 bg-orange-600 border-orange-500 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_time">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="date_range">Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Date Range Inputs - Only show when "Date Range" is selected */}
                {selectedPeriod === 'date_range' && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <label className="text-xs sm:text-sm font-medium text-orange-800 whitespace-nowrap">From:</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-1 border border-orange-300 rounded-md text-xs sm:text-sm bg-white"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 min-w-0">
                      <label className="text-xs sm:text-sm font-medium text-orange-800 whitespace-nowrap">To:</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-1 border border-orange-300 rounded-md text-xs sm:text-sm bg-white"
                      />
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-green-600 border-green-500 text-white hover:bg-green-500 flex-shrink-0 whitespace-nowrap"
                    onClick={() => handleDownload('all-analytics')}
                    disabled={isRefreshing}
                    title="Download Complete Analytics Dashboard Report (CRE Performance, Source Distribution, Lead Status)"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Analytics Report</span>
                    <span className="sm:hidden">Report</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* CRE Performance Table */}
          {data && (
            <Card className="bg-white border-orange-300 shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-orange-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          <div className="flex items-center gap-2">
                            CRE
                            <MoreVertical className="h-4 w-4" />
                          </div>
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Untouched</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Assigned</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Qualified Leads</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Open leads</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Booked</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Retailed</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Lost</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">TAT(Avg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-200">
                      {data.crePerformance.map((cre, index) => (
                        <tr key={cre.creName} className="hover:bg-orange-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {cre.creName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {cre.untouched.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {cre.assigned.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {cre.qualifiedLeads.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {cre.openLeads.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {(cre.booked || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {cre.retailed.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {cre.lost.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {formatTAT(cre.tatAvg, cre.tatUnit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-green-600">
                        <td className="px-6 py-4 text-sm font-bold text-white">
                          TOTAL
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {data.total.untouched.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {data.total.assigned.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {data.total.qualifiedLeads.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {data.total.openLeads.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {(data.total.booked || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {data.total.retailed.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {data.total.lost.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {formatTAT(data.total.tatAvg, data.total.tatUnit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Source-wise Distributions */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-orange-800 mb-6">Source-wise Analytics</h2>
            
            {/* High Priority: Source-wise CRE Distribution */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-orange-700 mb-4">
                🚀 High Priority: Source-wise CRE Distribution
              </h3>
              {(() => {
                // Normalize period and dates for analytics APIs
                const todayStr = new Date().toISOString().split('T')[0]
                const apiPeriod = selectedPeriod === 'all_time' ? 'all' : '7'
                const apiStart = selectedPeriod === 'today' ? todayStr : (selectedPeriod === 'date_range' ? startDate : '')
                const apiEnd = selectedPeriod === 'today' ? todayStr : (selectedPeriod === 'date_range' ? endDate : '')
                return (
                  <SourceCREDistribution 
                    key={`source-cre-${apiPeriod}-${apiStart}-${apiEnd}`}
                    period={apiPeriod}
                    startDate={apiStart}
                    endDate={apiEnd}
                  />
                )
              })()}
            </div>

            {/* Latest Call Lead Status Distribution */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-orange-700 mb-4">
                📊 Latest Call Lead Status Distribution (Source-wise Analytics)
              </h3>
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0]
                const apiPeriod = selectedPeriod === 'all_time' ? 'all' : '7'
                const apiStart = selectedPeriod === 'today' ? todayStr : (selectedPeriod === 'date_range' ? startDate : '')
                const apiEnd = selectedPeriod === 'today' ? todayStr : (selectedPeriod === 'date_range' ? endDate : '')
                return (
                  <LatestCallStatusDistribution 
                    key={`latest-call-${apiPeriod}-${apiStart}-${apiEnd}`}
                    period={apiPeriod}
                    startDate={apiStart}
                    endDate={apiEnd}
                  />
                )
              })()}
            </div>
          </div>

          {/* Date Range Info */}
          {data && (
            <div className="mt-4 text-center text-orange-600 text-sm">
              Data from {data.dateRange.start} to {data.dateRange.end} ({data.dateRange.period} days)
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}