'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, TrendingUp, TrendingDown, Users, Phone, Calendar, MapPin, Car, BarChart3, PieChart, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface PSFollowupData {
  id: string
  lead_uid: string
  ps_name: string
  ps_id: string
  ps_branch: string
  customer_name: string
  customer_mobile_number: string
  source: string
  cre_name: string
  model_interested: string
  lead_category: string
  follow_up_date: string
  lead_status: string
  final_status: string
  first_call_date: string
  first_call_remark: string
  second_call_date: string
  second_call_remark: string
  third_call_date: string
  third_call_remark: string
  fourth_call_date: string
  fourth_call_remark: string
  fifth_call_date: string
  fifth_call_remark: string
  sixth_call_date: string
  sixth_call_remark: string
  seventh_call_date: string
  seventh_call_remark: string
  eighth_call_date: string
  eighth_call_remark: string
  ninth_call_date: string
  ninth_call_remark: string
  tenth_call_date: string
  tenth_call_remark: string
  test_drive_done: boolean
  created_at: string
  updated_at: string
  ps_assigned_at: string
  won_timestamp: string
  lost_timestamp: string
  variant: string
  buying_plan: string
  finance_option: string
  icrop_id: string
  booking_id: string
  retailed_id: string
}

export default function PSAnalyticsDashboard() {
  const [followupData, setFollowupData] = useState<PSFollowupData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  
  const [user, setUser] = useState({
    username: 'ps',
    first_name: 'PS',
    last_name: 'User',
    name: 'PS User'
  })

  // Get user data from localStorage after component mounts
  useEffect(() => {
    try {
      const supabaseUser = localStorage.getItem('supabase_user')
      if (supabaseUser) {
        const userData = JSON.parse(supabaseUser)
        setUser({
          username: userData.username,
          first_name: userData.name?.split(' ')[0] || userData.username,
          last_name: userData.name?.split(' ')[1] || 'User',
          name: userData.name || userData.username
        })
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
    }
  }, [])

  const fetchPSFollowupData = async () => {
    try {
      setIsLoading(true)
      console.log('📊 [PS Analytics] Fetching PS follow-up data...')
      
      const response = await fetch('/api/ps-followup', {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include' // Include cookies for authentication
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(`Failed to fetch PS follow-up data: ${errorData.error || response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📊 [PS Analytics] Fetched PS follow-up data:', data.length)
      setFollowupData(data)
    } catch (error) {
      console.error('Error fetching PS follow-up data:', error)
      toast.error('Failed to fetch PS follow-up data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPSFollowupData()
  }, [])

  // Filter data based on selected period
  const filteredData = useMemo(() => {
    if (selectedPeriod === 'all') return followupData
    
    const now = new Date()
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    
    return followupData.filter(item => new Date(item.created_at) >= cutoffDate)
  }, [followupData, selectedPeriod])

  // Calculate analytics
  const analytics = useMemo(() => {
    const total = filteredData.length
    const pending = filteredData.filter(item => item.final_status === 'Pending').length
    const won = filteredData.filter(item => item.final_status === 'Won').length
    const lost = filteredData.filter(item => item.final_status === 'Lost').length
    const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0'
    
    // Calculate average follow-ups per lead
    const totalFollowups = filteredData.reduce((acc, item) => {
      let count = 0
      if (item.first_call_remark) count++
      if (item.second_call_remark) count++
      if (item.third_call_remark) count++
      if (item.fourth_call_remark) count++
      if (item.fifth_call_remark) count++
      if (item.sixth_call_remark) count++
      if (item.seventh_call_remark) count++
      if (item.eighth_call_remark) count++
      if (item.ninth_call_remark) count++
      if (item.tenth_call_remark) count++
      return acc + count
    }, 0)
    const avgFollowups = total > 0 ? (totalFollowups / total).toFixed(1) : '0.0'
    
    // Test drive conversion
    const testDriveDone = filteredData.filter(item => item.test_drive_done).length
    const testDriveConversion = testDriveDone > 0 ? ((won / testDriveDone) * 100).toFixed(1) : '0.0'
    
    return {
      total,
      pending,
      won,
      lost,
      conversionRate,
      avgFollowups,
      testDriveDone,
      testDriveConversion
    }
  }, [filteredData])

  // Get lead status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const statuses = filteredData.reduce((acc, item) => {
      const status = item.final_status || 'Pending'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(statuses).map(([status, count]) => ({
      status,
      count,
      percentage: filteredData.length > 0 ? ((count / filteredData.length) * 100).toFixed(1) : '0.0'
    }))
  }, [filteredData])

  // Get source distribution
  const sourceDistribution = useMemo(() => {
    const sources = filteredData.reduce((acc, item) => {
      const source = item.source || 'Unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(sources)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Top 5 sources
  }, [filteredData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchPSFollowupData()
    setIsRefreshing(false)
  }

  const handleSignOut = () => {
    localStorage.removeItem('supabase_user')
    window.location.href = '/auth/login'
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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  PS Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Performance analytics and lead conversion insights
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">System Online</span>
                </div>
                <Button 
                  onClick={handleRefresh} 
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Period Selector */}
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Period:</span>
              <div className="flex space-x-1">
                {[
                  { key: '7d', label: '7 Days' },
                  { key: '30d', label: '30 Days' },
                  { key: '90d', label: '90 Days' },
                  { key: 'all', label: 'All Time' }
                ].map((period) => (
                  <Button
                    key={period.key}
                    variant={selectedPeriod === period.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(period.key as any)}
                    className="text-xs"
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                      Total Leads
                    </p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
                      {analytics.total}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                      Won Leads
                    </p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
                      {analytics.won}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                      Lost Leads
                    </p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
                      {analytics.lost}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                      Conversion Rate
                    </p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
                      {analytics.conversionRate}%
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span>Pending Leads</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{analytics.pending}</div>
                <p className="text-sm text-gray-600">Leads awaiting follow-up</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-green-600" />
                  <span>Avg Follow-ups</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{analytics.avgFollowups}</div>
                <p className="text-sm text-gray-600">Average calls per lead</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Car className="h-5 w-5 text-purple-600" />
                  <span>Test Drive Conversion</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{analytics.testDriveConversion}%</div>
                <p className="text-sm text-gray-600">From {analytics.testDriveDone} test drives</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Lead Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  <span>Lead Status Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statusDistribution.map((item, index) => {
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500']
                    const color = colors[index % colors.length]
                    return (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${color}`}></div>
                          <span className="text-sm font-medium">{item.status}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{item.count}</div>
                          <div className="text-xs text-gray-500">{item.percentage}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <span>Top Lead Sources</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sourceDistribution.map((item, index) => {
                    const maxCount = Math.max(...sourceDistribution.map(s => s.count))
                    const percentage = (item.count / maxCount) * 100
                    return (
                      <div key={item.source} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.source}</span>
                          <span className="text-sm text-gray-500">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Lead Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{item.customer_name}</div>
                        <div className="text-sm text-gray-500">{item.customer_mobile_number}</div>
                        <div className="text-xs text-gray-400">{item.model_interested}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={item.final_status === 'Won' ? 'default' : 
                                item.final_status === 'Lost' ? 'destructive' : 'secondary'}
                      >
                        {item.final_status}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
