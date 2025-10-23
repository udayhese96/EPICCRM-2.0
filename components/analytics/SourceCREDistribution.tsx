'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SourceCrePieChart } from '@/components/analytics/SourceCrePieChart'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface CREPerformanceData {
  creName: string
  branch: string
  count: number
  qualified: number
  booked: number
  retailed: number
  conversionRate: number
  sourceCount: number
  sources: string[]
}

interface SourceCREData {
  source: string
  subsource: string
  sourceWithSubsource: string
  totalLeads: number
  totalQualified: number
  totalBooked: number
  totalRetailed: number
  conversionRate: number
  creDistribution: CREPerformanceData[]
}

interface SourceCREDistributionProps {
  period?: string
  branch?: string
  month?: string
  startDate?: string
  endDate?: string
}

export function SourceCREDistribution({ 
  period = 'all', 
  branch = null, 
  month = null,
  startDate = null,
  endDate = null
}: SourceCREDistributionProps) {
  const [data, setData] = useState<{
    sourceCreDistribution: SourceCREData[]
    overallCrePerformance: CREPerformanceData[]
    uniqueSources: string[]
    totalLeads: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'leads' | 'conversion' | 'qualified'>('leads')

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        period: period || 'all',
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(branch && { branch }),
        ...(month && { month }),
        ...(selectedSource !== 'all' && { source: selectedSource })
      })

      const response = await fetch(`/api/analytics/source-cre-distribution?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch source-CRE distribution data')
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Error fetching source-CRE distribution:', error)
      toast.error('Failed to fetch source-CRE distribution data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period, branch, month, selectedSource])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white border-orange-300 shadow-lg">
          <CardHeader>
            <CardTitle className="text-orange-800">Source-wise CRE Distribution</CardTitle>
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
            <CardTitle className="text-orange-800">Source-wise CRE Distribution</CardTitle>
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

  // Sort data based on selected criteria
  const sortedSourceData = [...(data.sourceCreDistribution || [])].sort((a, b) => {
    switch (sortBy) {
      case 'conversion':
        return b.conversionRate - a.conversionRate
      case 'qualified':
        return b.totalQualified - a.totalQualified
      case 'leads':
      default:
        return b.totalLeads - a.totalLeads
    }
  })

  // Create pie chart data
  const sourcePieData = sortedSourceData.slice(0, 8).map((source, index) => ({
    name: source.source,
    value: source.totalLeads,
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'][index % 8]
  }))

  const crePieData = (data.overallCrePerformance || []).slice(0, 8).map((cre, index) => ({
    name: cre.creName,
    value: cre.count,
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'][index % 8]
  }))

  return (
    <div className="space-y-6">
      {/* Filter and Sort Controls */}
      <div className="flex items-center gap-4 flex-wrap">
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
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <Select value={sortBy} onValueChange={(value: 'leads' | 'conversion' | 'qualified') => setSortBy(value)}>
            <SelectTrigger className="w-32 bg-orange-50 border-orange-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leads">Total Leads</SelectItem>
              <SelectItem value="conversion">Conversion Rate</SelectItem>
              <SelectItem value="qualified">Qualified Leads</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-600">
          Total Leads: <span className="font-semibold">{data.totalLeads?.toLocaleString() || '0'}</span>
        </div>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SourceCrePieChart
          title="Lead Distribution by Source"
          data={sourcePieData}
          height={300}
        />
        <SourceCrePieChart
          title="Top CRE Performance"
          data={crePieData}
          height={300}
        />
      </div>

      {/* Source-wise CRE Distribution Table */}
      <Card className="bg-white border-orange-300 shadow-lg">
        <CardHeader>
          <CardTitle className="text-orange-800">
            Source-wise CRE Distribution
            {selectedSource !== 'all' && ` - ${selectedSource}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="bg-orange-600 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Source</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Subsource</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Total Leads</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Qualified</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Booked</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Retailed</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Conversion %</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Top CRE</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">CRE Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-200">
                {(sortedSourceData || []).map((source, index) => {
                  const topCre = source.creDistribution?.[0]
                  return (
                    <tr key={source.sourceWithSubsource} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: sourcePieData[index]?.color || '#6B7280' }}
                          />
                          {source.source}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {source.subsource || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {source.totalLeads.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {source.totalQualified.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {source.totalBooked.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {source.totalRetailed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          source.conversionRate >= 20 ? 'bg-green-100 text-green-800' :
                          source.conversionRate >= 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {source.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {topCre?.creName || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {topCre?.count?.toLocaleString() || '0'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
