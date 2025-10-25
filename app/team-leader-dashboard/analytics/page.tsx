'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Users, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

// Import analytics components
import { KPICard } from '@/components/analytics/KPICard'
import { TrendChart } from '@/components/analytics/TrendChart'
import { LeaderboardTable } from '@/components/analytics/LeaderboardTable'

interface TeamAnalyticsData {
  teamMembers: Array<{
    id: string
    full_name: string
    username: string
    branch: string
  }>
  teamPerformance: Array<{
    id: string
    name: string
    branch: string
    stats: {
      total_leads: number
      fresh_leads: number
      pending_leads: number
      won_leads: number
      lost_leads: number
      followup_leads: number
      win_rate: number
      conversion_rate: number
    }
  }>
  sourceDistribution: Array<{
    source: string
    count: number
    percentage: number
  }>
  dailyPerformance: Array<{
    date: string
    leads: number
    won: number
    lost: number
  }>
  kpis: {
    total: number
    fresh: number
    pending: number
    won: number
    lost: number
    followup: number
    winRate: number
    conversionRate: number
  }
}

export default function TeamLeaderAnalyticsDashboard() {
  const [data, setData] = useState<TeamAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [userData, setUserData] = useState<any>(null)

  // Get current user data
  useEffect(() => {
    try {
      const supabaseUser = localStorage.getItem('supabase_user')
      if (supabaseUser) {
        const parsed = JSON.parse(supabaseUser)
        setUserData(parsed)
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
    }
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(selectedBranch !== 'all' && { branch: selectedBranch })
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
        throw new Error(errorData.error || 'Failed to fetch team analytics data')
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Error fetching team analytics:', error)
      toast.error('Failed to fetch team analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userData) {
      fetchData()
    }
  }, [userData, selectedPeriod, selectedBranch])

  const refreshData = () => {
    fetchData()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading team analytics...</p>
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
            <p className="text-gray-600">Failed to load team analytics</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Team Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Performance insights for your assigned PS team
              {userData?.branch && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {userData.branch}
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

            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KPICard
            title="Total Leads"
            value={data.kpis.total}
            icon={Users}
            color="blue"
            subtitle="All leads generated"
          />

          <KPICard
            title="Fresh Leads"
            value={data.kpis.fresh}
            icon={Users}
            color="orange"
            subtitle="New leads to contact"
          />

          <KPICard
            title="Pending"
            value={data.kpis.pending}
            icon={Users}
            color="yellow"
            subtitle="Leads in progress"
          />

          <KPICard
            title="Won"
            value={data.kpis.won}
            icon={Award}
            color="green"
            subtitle="Successfully converted"
          />

          <KPICard
            title="Lost"
            value={data.kpis.lost}
            icon={Users}
            color="red"
            subtitle="Leads lost"
          />

          <KPICard
            title="Win Rate"
            value={`${data.kpis.winRate.toFixed(1)}%`}
            icon={TrendingUp}
            color="purple"
            subtitle="Conversion success rate"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Lead Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.sourceDistribution.map((source, index) => (
                  <div key={source.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{source.source}</div>
                        <div className="text-sm text-gray-500">{source.count} leads</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {source.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Performance */}
          <TrendChart
            title="Daily Performance (Last 7 Days)"
            data={data.dailyPerformance}
            lines={[
              { dataKey: 'leads', name: 'Total Leads', color: '#3B82F6' },
              { dataKey: 'won', name: 'Won', color: '#10B981' },
              { dataKey: 'lost', name: 'Lost', color: '#EF4444' }
            ]}
            height={300}
          />
        </div>

        {/* Team Performance Table */}
        <LeaderboardTable
          title={`Assigned PS Performance (${data.teamMembers.length} team members)`}
          entries={data.teamPerformance.map(member => ({
            name: member.name,
            branch: member.branch,
            metrics: {
              total: member.stats.total_leads,
              fresh: member.stats.fresh_leads,
              pending: member.stats.pending_leads,
              won: member.stats.won_leads,
              lost: member.stats.lost_leads
            },
            score: member.stats.win_rate
          }))}
          metricLabels={{
            total: 'Total',
            fresh: 'Fresh',
            pending: 'Pending',
            won: 'Won',
            lost: 'Lost'
          }}
          maxEntries={10}
        />
      </div>
    </DashboardLayout>
  )
}