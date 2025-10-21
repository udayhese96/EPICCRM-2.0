'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Users, TrendingUp, DollarSign, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

// Import analytics components
import { KPICard } from '@/components/analytics/KPICard'
import { TrendChart } from '@/components/analytics/TrendChart'
import { LeaderboardTable } from '@/components/analytics/LeaderboardTable'
import { AlertCard } from '@/components/analytics/AlertCard'

interface SalesManagerAnalyticsData {
  approvalMetrics: {
    totalRequests: number
    pendingRequests: number
    approvedRequests: number
    rejectedRequests: number
    approvalRate: number
    avgApprovalTime: number
  }
  bookingStats: {
    pending: number
    approved: number
    rejected: number
    total: number
  }
  retailStats: {
    pending: number
    approved: number
    rejected: number
    total: number
  }
  salesMetrics: {
    totalLeads: number
    qualifiedLeads: number
    bookedLeads: number
    retailedLeads: number
    qualificationRate: number
    bookingRate: number
    retailRate: number
    projectedRevenue: number
  }
  crePerformance: Array<{
    creName: string
    total: number
    qualified: number
    booked: number
    retailed: number
    qualificationRate: number
    bookingRate: number
    retailRate: number
  }>
  dailyTrends: Array<{
    date: string
    requests: number
    approved: number
    rejected: number
  }>
}

export default function SalesManagerAnalyticsDashboard() {
  const [data, setData] = useState<SalesManagerAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [userBranch, setUserBranch] = useState<string | null>(null)

  // Get user's branch from localStorage on mount
  useEffect(() => {
    const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
    const parsed = session ? JSON.parse(session) : null
    const branch = parsed?.branch || null
    setUserBranch(branch)
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(userBranch && { branch: userBranch })
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
        throw new Error(errorData.error || 'Failed to fetch sales manager analytics')
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Error fetching sales manager analytics:', error)
      toast.error('Failed to fetch sales manager analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userBranch) {
      fetchData()
    }
  }, [userBranch, selectedPeriod])

  const refreshData = () => {
    fetchData()
  }

  const handleAlertAction = (alert: any) => {
    toast.info(`Action triggered for: ${alert.type}`)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading sales manager analytics...</p>
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
            <p className="text-gray-600">Failed to load sales manager analytics</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Sales Manager Analytics</h1>
            <p className="text-gray-600 mt-2">
              Sales oversight and approval management
              {userBranch && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {userBranch}
                </span>
              )}
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

            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Approval Metrics KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Pending Requests"
            value={data.approvalMetrics.pendingRequests}
            icon={Clock}
            color="yellow"
            subtitle="Awaiting your approval"
          />
          
          <KPICard
            title="Approved Requests"
            value={data.approvalMetrics.approvedRequests}
            icon={CheckCircle}
            color="green"
            subtitle="Successfully approved"
          />
          
          <KPICard
            title="Approval Rate"
            value={`${data.approvalMetrics.approvalRate.toFixed(1)}%`}
            icon={TrendingUp}
            color="blue"
            subtitle="Overall approval rate"
          />
          
          <KPICard
            title="Avg Approval Time"
            value={`${data.approvalMetrics.avgApprovalTime.toFixed(1)}h`}
            icon={Clock}
            color="purple"
            subtitle="Average processing time"
          />
        </div>

        {/* Sales Performance KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Leads"
            value={data.salesMetrics.totalLeads}
            icon={Users}
            color="blue"
            subtitle="All leads in branch"
          />
          
          <KPICard
            title="Qualified Leads"
            value={data.salesMetrics.qualifiedLeads}
            icon={CheckCircle}
            color="green"
            subtitle={`${data.salesMetrics.qualificationRate.toFixed(1)}% qualification rate`}
          />
          
          <KPICard
            title="Retailed Units"
            value={data.salesMetrics.retailedLeads}
            icon={Award}
            color="purple"
            subtitle={`${data.salesMetrics.retailRate.toFixed(1)}% retail rate`}
          />
          
          <KPICard
            title="Projected Revenue"
            value={`₹${(data.salesMetrics.projectedRevenue / 100000).toFixed(1)}L`}
            icon={DollarSign}
            color="green"
            subtitle="Revenue potential"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Approval Trends */}
          <TrendChart
            title="Daily Approval Trends"
            data={data.dailyTrends}
            lines={[
              { dataKey: 'requests', name: 'Total Requests', color: '#3B82F6' },
              { dataKey: 'approved', name: 'Approved', color: '#10B981' },
              { dataKey: 'rejected', name: 'Rejected', color: '#EF4444' }
            ]}
            height={300}
          />

          {/* Booking vs Retail Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Booking vs Retail Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Booking Stats */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-600">📋 Booking Requests</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pending:</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {data.bookingStats.pending}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Approved:</span>
                      <Badge className="bg-green-100 text-green-800">
                        {data.bookingStats.approved}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rejected:</span>
                      <Badge className="bg-red-100 text-red-800">
                        {data.bookingStats.rejected}
                      </Badge>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Total:</span>
                      <span>{data.bookingStats.total}</span>
                    </div>
                  </div>
                </div>

                {/* Retail Stats */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-purple-600">🚗 Retail Requests</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pending:</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {data.retailStats.pending}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Approved:</span>
                      <Badge className="bg-green-100 text-green-800">
                        {data.retailStats.approved}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rejected:</span>
                      <Badge className="bg-red-100 text-red-800">
                        {data.retailStats.rejected}
                      </Badge>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Total:</span>
                      <span>{data.retailStats.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CRE Performance */}
        <LeaderboardTable
          title="CRE Performance in Branch"
          entries={data.crePerformance.map(cre => ({
            name: cre.creName,
            metrics: {
              total: cre.total,
              qualified: cre.qualified,
              booked: cre.booked,
              retailed: cre.retailed
            },
            score: cre.retailRate
          }))}
          metricLabels={{
            total: 'Total',
            qualified: 'Qualified',
            booked: 'Booked',
            retailed: 'Retailed'
          }}
          maxEntries={10}
        />

        {/* Critical Alerts */}
        <AlertCard
          title="Critical Alerts & Action Items"
          alerts={[
            {
              type: 'Pending Approvals',
              count: data.approvalMetrics.pendingRequests,
              priority: data.approvalMetrics.pendingRequests > 10 ? 'high' : 'medium',
              description: 'Requests awaiting your approval',
              action: 'Review Now'
            },
            {
              type: 'Low Approval Rate',
              count: data.approvalMetrics.approvalRate < 80 ? 1 : 0,
              priority: data.approvalMetrics.approvalRate < 80 ? 'high' : 'low',
              description: 'Approval rate below 80%',
              action: data.approvalMetrics.approvalRate < 80 ? 'Investigate' : undefined
            },
            {
              type: 'Slow Processing',
              count: data.approvalMetrics.avgApprovalTime > 24 ? 1 : 0,
              priority: data.approvalMetrics.avgApprovalTime > 24 ? 'medium' : 'low',
              description: 'Average approval time over 24 hours',
              action: data.approvalMetrics.avgApprovalTime > 24 ? 'Optimize' : undefined
            }
          ]}
          onAction={handleAlertAction}
        />
      </div>
    </DashboardLayout>
  )
}
