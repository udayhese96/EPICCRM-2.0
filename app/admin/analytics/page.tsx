'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  RefreshCw, 
  Download,
  Search,
  Maximize2,
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

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<CREPerformanceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  

  const fetchData = async () => {
    try {
      setIsRefreshing(true)
      const params = new URLSearchParams({
        period: selectedPeriod
      })

      const response = await fetch(`/api/analytics/cre-performance?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch CRE performance data')
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Error fetching CRE performance:', error)
      toast.error('Failed to fetch CRE performance data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }


  useEffect(() => {
    fetchData()
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-orange-800">CRE Performance</h1>
              <Button
                onClick={fetchData}
                disabled={isRefreshing}
                variant="outline"
                className="bg-orange-600 border-orange-500 text-white hover:bg-orange-500"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32 bg-orange-600 border-orange-500 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Date Range Inputs */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-orange-800">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1 border border-orange-300 rounded-md text-sm bg-white"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-orange-800">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1 border border-orange-300 rounded-md text-sm bg-white"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="bg-orange-600 border-orange-500 text-white hover:bg-orange-500">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="bg-orange-600 border-orange-500 text-white hover:bg-orange-500">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="bg-orange-600 border-orange-500 text-white hover:bg-orange-500">
                  <Maximize2 className="h-4 w-4" />
                </Button>
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
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Assigned</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Qualified Leads</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Untouched</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Open leads</th>
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
                            {cre.assigned.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {cre.qualifiedLeads.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {cre.untouched.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {cre.openLeads.toLocaleString()}
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
                          {data.total.assigned.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {data.total.qualifiedLeads.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {data.total.untouched.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                          {data.total.openLeads.toLocaleString()}
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
              <SourceCREDistribution 
                period={selectedPeriod}
                startDate={startDate}
                endDate={endDate}
              />
            </div>

            {/* Latest Call Lead Status Distribution */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-orange-700 mb-4">
                📊 Latest Call Lead Status Distribution (Source-wise Analytics)
              </h3>
              <LatestCallStatusDistribution 
                period={selectedPeriod}
              />
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