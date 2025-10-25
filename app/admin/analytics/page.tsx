'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

// Import analytics components
import { KPICard } from '@/components/analytics/KPICard'
import { FunnelChart } from '@/components/analytics/FunnelChart'
import { LeaderboardTable } from '@/components/analytics/LeaderboardTable'
import { TrendChart } from '@/components/analytics/TrendChart'
import { AlertCard } from '@/components/analytics/AlertCard'

interface AdminAnalyticsData {
  realTimeMetrics: {
    todayLeads: number
    monthlyLeads: number
    monthlyConversionRate: number
    activeCREs: number
    retailedLeads: number
    projectedRevenue: number
  }
  dailyTrend: Array<{
    date: string
    total: number
    qualified: number
    booked: number
    retailed: number
  }>
  sourcePerformance: Array<{
    source: string
    total: number
    qualified: number
    booked: number
    retailed: number
    conversionRate: number
    bookingRate: number
    retailRate: number
    cres: Array<{
      creName: string
      branch: string
      total: number
      qualified: number
      booked: number
      retailed: number
      conversionRate: number
    }>
  }>
  creLeaderboard: Array<{
    creName: string
    branch: string
    total: number
    qualified: number
    booked: number
    retailed: number
    conversionRate: number
    performanceScore: number
  }>
  alerts: Array<{
    type: string
    count: number
    priority: 'high' | 'medium' | 'low'
  }>
  // MTD Reports
  mtdMetrics?: {
    totalLeads: number
    qualifiedLeads: number
    bookedLeads: number
    retailedLeads: number
    conversionRate: number
  }
  mtdSourcePerformance?: Array<{
    source: string
    total: number
    qualified: number
    booked: number
    retailed: number
    conversionRate: number
  }>
  mtdCrePerformance?: Array<{
    creName: string
    branch: string
    total: number
    qualified: number
    booked: number
    retailed: number
    conversionRate: number
    performanceScore: number
  }>
  totalRecords?: number
}

export default function AdminAnalyticsDashboard() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')

  const fetchData = async () => {
    try {
      setIsRefreshing(true)
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(selectedBranch !== 'all' && { branch: selectedBranch }),
        ...(selectedMonth !== 'all' && { month: selectedMonth })
      })

            const response = await fetch(`/api/analytics/dynamic-status?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch analytics data')
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Error fetching admin analytics:', error)
      toast.error('Failed to fetch analytics data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedPeriod, selectedBranch, selectedMonth])

  // Conversion funnel data
  const funnelData = useMemo(() => {
    if (!data) return []
    
    // Show full dataset when "All Months" is selected
    const total = selectedMonth === 'all' ? (data.totalRecords ?? data.realTimeMetrics.monthlyLeads) : data.realTimeMetrics.monthlyLeads
    const qualified = Math.round(total * (data.realTimeMetrics.monthlyConversionRate / 100))
    const booked = Math.round(qualified * 0.5) // Assume 50% booking rate
    const retailed = data.realTimeMetrics.retailedLeads

    return [
      {
        name: 'Total Leads',
        count: total,
        percentage: 100,
        color: '#3B82F6'
      },
      {
        name: 'Qualified',
        count: qualified,
        percentage: Math.round((qualified / total) * 100),
        color: '#10B981'
      },
      {
        name: 'Booked',
        count: booked,
        percentage: Math.round((booked / total) * 100),
        color: '#F59E0B'
      },
      {
        name: 'Retailed',
        count: retailed,
        percentage: Math.round((retailed / total) * 100),
        color: '#8B5CF6'
      }
    ]
  }, [data])

  const handleAlertAction = (alert: any) => {
    toast.info(`Action triggered for: ${alert.type}`)
    // Implement specific alert actions here
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-gray-600">Failed to load analytics data</p>
            <Button onClick={fetchData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Executive Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive performance insights and real-time metrics
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Period:</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  <SelectItem value="2024-10">October 2024</SelectItem>
                  <SelectItem value="2024-09">September 2024</SelectItem>
                  <SelectItem value="2024-08">August 2024</SelectItem>
                  <SelectItem value="2024-07">July 2024</SelectItem>
                  <SelectItem value="2024-06">June 2024</SelectItem>
                  <SelectItem value="2024-05">May 2024</SelectItem>
                  <SelectItem value="2024-04">April 2024</SelectItem>
                  <SelectItem value="2024-03">March 2024</SelectItem>
                  <SelectItem value="2024-02">February 2024</SelectItem>
                  <SelectItem value="2024-01">January 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Branch:</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="Mount Road">Mount Road</SelectItem>
                  <SelectItem value="Vyasarpadi">Vyasarpadi</SelectItem>
                  <SelectItem value="Cuddalore">Cuddalore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={fetchData} 
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Real-time KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Today's Leads"
            value={data.realTimeMetrics.todayLeads}
            icon={Users}
            color="blue"
            subtitle="New leads generated today"
          />
          
          <KPICard
            title="Monthly Conversion Rate"
            value={`${data.realTimeMetrics.monthlyConversionRate.toFixed(1)}%`}
            icon={TrendingUp}
            color="green"
            subtitle="Qualification rate this month"
          />
          
          <KPICard
            title="Monthly Retails"
            value={data.realTimeMetrics.retailedLeads}
            icon={Award}
            color="purple"
            subtitle="Vehicles sold this month"
          />
          
          <KPICard
            title="Projected Revenue"
            value={`₹${(data.realTimeMetrics.projectedRevenue / 100000).toFixed(1)}L`}
            icon={DollarSign}
            color="green"
            subtitle="Revenue potential"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <FunnelChart
            title="Lead Conversion Funnel"
            stages={funnelData}
          />

          {/* Daily Trend */}
          <TrendChart
            title="Daily Lead Trends"
            data={data.dailyTrend}
            lines={[
              { dataKey: 'total', name: 'Total Leads', color: '#3B82F6' },
              { dataKey: 'qualified', name: 'Qualified', color: '#10B981' },
              { dataKey: 'booked', name: 'Booked', color: '#F59E0B' },
              { dataKey: 'retailed', name: 'Retailed', color: '#8B5CF6' }
            ]}
            height={400}
          />
        </div>

        {/* MTD Reports Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <KPICard
            title="MTD Total Leads"
            value={data.mtdMetrics?.totalLeads || 0}
            icon={Users}
            color="blue"
            subtitle="Month-to-date leads"
          />
          <KPICard
            title="MTD Qualified"
            value={data.mtdMetrics?.qualifiedLeads || 0}
            icon={TrendingUp}
            color="green"
            subtitle="MTD qualified leads"
          />
          <KPICard
            title="MTD Booked"
            value={data.mtdMetrics?.bookedLeads || 0}
            icon={Award}
            color="orange"
            subtitle="MTD booked leads"
          />
          <KPICard
            title="MTD Conversion"
            value={`${(data.mtdMetrics?.conversionRate || 0).toFixed(1)}%`}
            icon={DollarSign}
            color="purple"
            subtitle="MTD conversion rate"
          />
        </div>

        {/* Source Performance and CRE Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Performance with CRE Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Source Performance Ranking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.sourcePerformance.slice(0, 3).map((source, index) => (
                  <div key={source.source} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{source.source}</div>
                          <div className="text-sm text-gray-500">{source.total} leads</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {source.conversionRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          {source.qualified} qualified, {source.booked} booked, {source.retailed} retailed
                        </div>
                      </div>
                    </div>
                    
                    {/* CRE Breakdown for this source */}
                    {source.cres && source.cres.length > 0 && (
                      <div className="ml-11 space-y-2">
                        <div className="text-sm font-medium text-gray-700">Top CREs:</div>
                        {source.cres.slice(0, 2).map((cre: any, creIndex: number) => (
                          <div key={cre.creName} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                            <span className="font-medium">{cre.creName}</span>
                            <span className="text-gray-600">
                              {cre.total} leads, {cre.conversionRate.toFixed(1)}% conv.
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CRE Leaderboard */}
          <LeaderboardTable
            title="Top CRE Performers"
            entries={data.creLeaderboard.map(cre => ({
              name: cre.creName,
              branch: cre.branch,
              metrics: {
                leads: cre.total,
                qualified: cre.qualified,
                retailed: cre.retailed
              },
              score: cre.performanceScore
            }))}
            metricLabels={{
              leads: 'Total',
              qualified: 'Qualified',
              retailed: 'Retailed'
            }}
            maxEntries={5}
          />
        </div>

        {/* MTD Source and CRE Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MTD Source Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                MTD Source Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.mtdSourcePerformance?.slice(0, 5).map((source, index) => (
                  <div key={source.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{source.source}</div>
                        <div className="text-sm text-gray-500">{source.total} MTD leads</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {source.conversionRate.toFixed(1)}%
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          source.conversionRate > 20 
                            ? 'bg-green-100 text-green-700' 
                            : source.conversionRate > 10 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {source.qualified} qualified
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* MTD CRE Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                MTD CRE Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.mtdCrePerformance?.slice(0, 5).map((cre, index) => (
                  <div key={cre.creName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-600">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{cre.creName}</div>
                        <div className="text-sm text-gray-500">{cre.branch} • {cre.total} MTD leads</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {cre.conversionRate.toFixed(1)}%
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          cre.conversionRate > 20 
                            ? 'bg-green-100 text-green-700' 
                            : cre.conversionRate > 10 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {cre.qualified} qualified
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <AlertCard
          title="Critical Alerts & Action Items"
          alerts={data.alerts.map(alert => ({
            ...alert,
            action: alert.count > 0 ? 'View Details' : undefined
          }))}
          onAction={handleAlertAction}
        />
      </div>
    </DashboardLayout>
  )
}