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
    noData?: boolean
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'leads' | 'conversion' | 'qualified'>('leads')

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
        section: 'sourceCre',
        filter: filterMode,
        // Don't send source filter to backend - filtering happens on frontend for pie charts only
        ...(actualStartDate && { startDate: actualStartDate }),
        ...(actualEndDate && { endDate: actualEndDate })
      })

      console.log('[SourceCREDistribution] Fetching with params:', params.toString())

      const response = await fetch(`/api/analytics/unified?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[SourceCREDistribution] API error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch source-CRE distribution data')
      }

      const analyticsData = await response.json()
      console.log('[SourceCREDistribution] Received data:', analyticsData)

      // Check for noData flag from API
      if (analyticsData.noData) {
        setData({
          sourceCreDistribution: [],
          overallCrePerformance: [],
          uniqueSources: ['all'],
          totalLeads: 0,
          noData: true
        });
        return;
      }

      // Transform unified API response to component's expected format
      const transformedData = {
        sourceCreDistribution: analyticsData.rows || [],
        overallCrePerformance: analyticsData.overallCrePerformance || [],
        uniqueSources: ['all', ...new Set((analyticsData.rows || []).map((r: any) => r.source))],
        totalLeads: analyticsData.totalLeads || 0,
        noData: false
      }

      console.log('[SourceCREDistribution] Transformed data:', transformedData)
      setData(transformedData)
    } catch (error) {
      console.error('[SourceCREDistribution] Error fetching data:', error)
      toast.error('Failed to fetch source-CRE distribution data')
      // Set empty data on error
      setData({
        sourceCreDistribution: [],
        overallCrePerformance: [],
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
  // selectedSource not included - filtering happens client-side for pie charts only

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

  // ====================
  // PIE CHARTS DATA (Apply Filter by Source + Sort by)
  // ====================
  
  // Filter source data for pie charts based on selected source
  const filteredSourceDataForPieChart = selectedSource === 'all' 
    ? (data.sourceCreDistribution || [])
    : (data.sourceCreDistribution || []).filter(s => s.source === selectedSource);

  // Sort source data for pie charts based on selected criteria
  const sortedSourceDataForPieChart = [...filteredSourceDataForPieChart].sort((a, b) => {
    switch (sortBy) {
      case 'conversion':
        return b.conversionPct - a.conversionPct
      case 'qualified':
        return b.qualified - a.qualified
      case 'leads':
      default:
        return b.totalLeads - a.totalLeads
    }
  })

  // Aggregate by source only (combine all subsources) for pie chart
  const sourceAggregated = sortedSourceDataForPieChart.reduce((acc, item) => {
    const existing = acc.find(a => a.source === item.source);
    if (existing) {
      existing.totalLeads += item.totalLeads;
      existing.qualified += item.qualified;
      existing.booked += item.booked;
      existing.retailed += item.retailed;
    } else {
      acc.push({
        source: item.source,
        totalLeads: item.totalLeads,
        qualified: item.qualified,
        booked: item.booked,
        retailed: item.retailed
      });
    }
    return acc;
  }, [] as any[]);

  // Create pie chart data for sources
  // Use qualified counts when "Qualified Leads" sort is selected
  // Use retailed (won) counts when "Conversion Rate" sort is selected
  // Otherwise use total leads
  const sourcePieData = sourceAggregated
    .sort((a, b) => {
      if (sortBy === 'qualified') {
        return b.qualified - a.qualified;
      }
      if (sortBy === 'conversion') {
        // Sort by retailed (won) count for conversion rate
        return b.retailed - a.retailed;
      }
      return b.totalLeads - a.totalLeads;
    })
    .slice(0, 8)
    .map((source, index) => ({
      name: source.source,
      value: sortBy === 'qualified' ? source.qualified : 
             sortBy === 'conversion' ? source.retailed : 
             source.totalLeads,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'][index % 8]
    }))

  // Build CRE performance data from source distribution for accurate source-specific counts
  const crePerformanceBySource: Record<string, { creName: string; count: number; qualified: number; booked: number; retailed: number }> = {};
  
  filteredSourceDataForPieChart.forEach(sourceRow => {
    sourceRow.creDistribution?.forEach((creData: CREPerformanceData) => {
      const key = creData.creName;
      if (!crePerformanceBySource[key]) {
        crePerformanceBySource[key] = {
          creName: creData.creName,
          count: 0,
          qualified: 0,
          booked: 0,
          retailed: 0
        };
      }
      crePerformanceBySource[key].count += creData.count || 0;
      crePerformanceBySource[key].qualified += creData.qualified || 0;
      crePerformanceBySource[key].booked += creData.booked || 0;
      crePerformanceBySource[key].retailed += creData.retailed || 0;
    });
  });

  // Convert to array and sort
  const sortedCreDataForPieChart = Object.values(crePerformanceBySource).sort((a, b) => {
    switch (sortBy) {
      case 'conversion':
        // Sort by retailed (won) count, not conversion percentage
        return b.retailed - a.retailed;
      case 'qualified':
        return b.qualified - a.qualified
      case 'leads':
      default:
        return b.count - a.count
    }
  });

  // Show ALL CREs when filtered by source (no slice limit), show top 8 when "all"
  const creDataForChart = selectedSource === 'all' 
    ? sortedCreDataForPieChart.slice(0, 8)
    : sortedCreDataForPieChart; // Show all CREs for specific source
  
  const crePieData = creDataForChart.map((cre, index) => ({
    name: cre.creName,
    value: sortBy === 'qualified' ? cre.qualified : 
           sortBy === 'conversion' ? cre.retailed :  // Show won count when "Conversion Rate" is selected
           cre.count,  // Use total leads otherwise
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'][index % 8]
  }))

  // ====================
  // TABLE DATA (Only apply created_at filter - no source or sort filters)
  // ====================
  
  // Table shows ALL sources (only filtered by date in backend)
  const tableData = (data.sourceCreDistribution || []).sort((a, b) => b.totalLeads - a.totalLeads)

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
            Source-wise CRE Distribution (All Sources - Date Filtered Only)
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
                {(tableData || []).map((source, index) => {
                  return (
                    <tr key={source.source + '-' + source.subsource} className="hover:bg-orange-50">
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
                        {source.qualified.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {source.booked.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {source.retailed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          source.conversionPct >= 20 ? 'bg-green-100 text-green-800' :
                          source.conversionPct >= 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {source.conversionPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {source.topCRE || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {source.creLeads?.toLocaleString() || '0'}
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
