'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SourceCrePieChart } from '@/components/analytics/SourceCrePieChart'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface LatestCallStatusData {
  status: string
  count: number
  percentage: string
  sourceCount: number
  creCount: number
  sources: string[]
  cres: string[]
}

interface SourceWiseStatusData {
  source: string
  totalLeads: number
  statusDistribution: Array<{
    status: string
    count: number
    percentage: string
  }>
}

interface LatestCallStatusDistributionProps {
  period?: string
  branch?: string
  month?: string
  startDate?: string
  endDate?: string
}

export function LatestCallStatusDistribution({ 
  period = '30', 
  branch = null, 
  month = null,
  startDate = null,
  endDate = null
}: LatestCallStatusDistributionProps) {
  const [data, setData] = useState<{
    latestCallStatusDistribution: LatestCallStatusData[]
    sourceWiseStatusDistribution: SourceWiseStatusData[]
    uniqueSources: string[]
    totalLeads: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState<string>('all')

  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Map period to filter mode
      let filterMode = 'all';
      let actualStartDate = '';
      let actualEndDate = '';

      if (period === 'all') {
        filterMode = 'all';
      } else if (startDate && endDate) {
        // Date range mode
        filterMode = 'range';
        actualStartDate = startDate;
        actualEndDate = endDate;
      } else if (startDate) {
        // Today mode
        filterMode = 'today';
        actualStartDate = startDate;
      }

      const params = new URLSearchParams({
        section: 'latestCall',
        filter: filterMode,
        ...(actualStartDate && { startDate: actualStartDate }),
        ...(actualEndDate && { endDate: actualEndDate })
      })

      console.log('[LatestCallStatusDistribution] Fetching with params:', params.toString())

      const response = await fetch(`/api/analytics/unified?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[LatestCallStatusDistribution] API error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch latest call status data')
      }

      const analyticsData = await response.json()
      console.log('[LatestCallStatusDistribution] Received data:', analyticsData)

      // Transform unified API response to component's expected format
      const statusData = (analyticsData.distribution || []).map((item: any) => ({
        status: item.latestCallStatus,
        count: item.count,
        percentage: analyticsData.totalLeads > 0 ? ((item.count / analyticsData.totalLeads) * 100).toFixed(2) : '0.00',
        sourceCount: item.sourceCount || 0,
        creCount: item.creCount || 0,
        sources: item.sources || [],
        cres: item.cres || []
      }));

      const transformedData = {
        latestCallStatusDistribution: statusData,
        sourceWiseStatusDistribution: analyticsData.sourceWiseDistribution || [],
        uniqueSources: ['all', ...(analyticsData.uniqueSources || [])],
        totalLeads: analyticsData.totalLeads || 0
      }

      console.log('[LatestCallStatusDistribution] Transformed data:', transformedData)
      setData(transformedData)
    } catch (error) {
      console.error('[LatestCallStatusDistribution] Error fetching data:', error)
      toast.error('Failed to fetch latest call status data')
      // Set empty data on error
      setData({
        latestCallStatusDistribution: [],
        sourceWiseStatusDistribution: [],
        uniqueSources: ['all'],
        totalLeads: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, branch, month, startDate, endDate])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white border-orange-300 shadow-lg">
          <CardHeader>
            <CardTitle className="text-orange-800">Latest Call Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-orange-600">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card className="bg-white border-orange-300 shadow-lg">
          <CardHeader>
            <CardTitle className="text-orange-800">Latest Call Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-orange-600">No data available</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter data based on selected source
  const filteredStatusData = selectedSource === 'all' 
    ? data.latestCallStatusDistribution 
    : data.latestCallStatusDistribution?.map(status => ({
        ...status,
        count: status.sources.includes(selectedSource) 
          ? data.sourceWiseStatusDistribution
              ?.find(s => s.source === selectedSource)
              ?.statusDistribution
              ?.find(sd => sd.status === status.status)
              ?.count || 0
          : 0
      })).filter(status => status.count > 0) || [];

  // Create pie chart data for top statuses
  const statusPieData = filteredStatusData?.slice(0, 8).map((status, index) => ({
    name: status.status,
    value: status.count,
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'][index % 8]
  })) || []

  // Calculate filtered total
  const filteredTotal = filteredStatusData?.reduce((sum, status) => sum + status.count, 0) || 0

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter by Source:</label>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-48 bg-orange-50 border-orange-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.uniqueSources?.map(source => (
                <SelectItem key={source} value={source}>
                  {source === 'all' ? 'All Sources' : source}
                </SelectItem>
              )) || []}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-600">
          Total Leads: <span className="font-semibold">{(selectedSource === 'all' ? data.totalLeads : filteredTotal)?.toLocaleString() || '0'}</span>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SourceCrePieChart
          title="Latest Call Lead Status Distribution"
          data={statusPieData}
          height={300}
        />
        <Card className="bg-white border-orange-300 shadow-lg">
          <CardHeader>
            <CardTitle className="text-orange-800">Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Statuses:</span>
                <span className="font-semibold">{filteredStatusData?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sources:</span>
                <span className="font-semibold">{selectedSource === 'all' ? (data.uniqueSources?.length || 1) - 1 : 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Top Status:</span>
                <span className="font-semibold">{filteredStatusData?.[0]?.status || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Top Status Count:</span>
                <span className="font-semibold">{filteredStatusData?.[0]?.count?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Call Status Table */}
      <Card className="bg-white border-orange-300 shadow-lg">
        <CardHeader>
          <CardTitle className="text-orange-800">
            Latest Call Lead Status Distribution
            {selectedSource !== 'all' && ` - ${selectedSource}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="bg-orange-600 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Latest Call Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Count</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Percentage</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Sources</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">CREs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-200">
                {filteredStatusData?.map((status, index) => (
                  <tr key={status.status} className="hover:bg-orange-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: statusPieData[index]?.color || '#6B7280' }}
                        />
                        {status.status}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {status.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {status.percentage}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {selectedSource === 'all' ? status.sourceCount : 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {status.creCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Source-wise Status Breakdown */}
      {selectedSource !== 'all' && (
        <Card className="bg-white border-orange-300 shadow-lg">
          <CardHeader>
            <CardTitle className="text-orange-800">
              Detailed Status Breakdown for {selectedSource}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-orange-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Latest Call Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-white">Count</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-white">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-200">
                  {data.sourceWiseStatusDistribution
                    ?.find(source => source.source === selectedSource)
                    ?.statusDistribution?.map((status, index) => (
                      <tr key={status.status} className="hover:bg-orange-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {status.status}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                          {status.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                          {status.percentage}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
