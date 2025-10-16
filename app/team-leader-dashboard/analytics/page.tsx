"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BarChart, PieChart, LineChart, Bar, Pie, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { RefreshCw, Users, CheckCircle, XCircle, Clock, TrendingUp, DollarSign, Car, Phone, Calendar, Target, Award, Activity, Zap } from "lucide-react"
import { toast } from "sonner"

interface FollowUpData {
  id: number
  lead_uid: string
  ps_name: string
  ps_id: string
  ps_branch: string
  customer_name: string
  customer_mobile_number: string
  source: string
  cre_name: string
  lead_category: string
  model_interested: string
  follow_up_date: string | null
  lead_status: string
  final_status: string
  first_call_date: string | null
  first_call_remark: string | null
  second_call_date: string | null
  second_call_remark: string | null
  third_call_date: string | null
  third_call_remark: string | null
  fourth_call_date: string | null
  fourth_call_remark: string | null
  fifth_call_date: string | null
  fifth_call_remark: string | null
  sixth_call_date: string | null
  sixth_call_remark: string | null
  seventh_call_date: string | null
  seventh_call_remark: string | null
  eighth_call_date: string | null
  eighth_call_remark: string | null
  ninth_call_date: string | null
  ninth_call_remark: string | null
  tenth_call_date: string | null
  tenth_call_remark: string | null
  test_drive_done: boolean | null
  created_at: string
  updated_at: string
  ps_assigned_at: string
  won_timestamp: string | null
  lost_timestamp: string | null
  variant: string | null
  buying_plan: string | null
  finance_option: string | null
  icrop_id: string | null
  booking_id: string | null
  retailed_id: string | null
}

interface UserData {
  id: string
  username: string
  full_name: string
  role: string
  branch: string
  team_leader_id: string | null
}

interface TeamMember {
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
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']

export default function TeamLeaderAnalyticsDashboard() {
  const [followupData, setFollowupData] = useState<FollowupData[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('7')
  const [selectedPS, setSelectedPS] = useState('all')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [userData, setUserData] = useState<UserData | null>(null)

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

  // Fetch PS follow-up data (filtered for Team Leader's assigned PS users)
  const fetchPSFollowupData = async () => {
    try {
      setIsLoading(true)
      console.log('📊 [TL Analytics] Fetching Team Leader analytics data...')
      
      const response = await fetch('/api/team-leader/analytics', {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(`Failed to fetch Team Leader analytics data: ${errorData.error || response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📊 [TL Analytics] Fetched Team Leader analytics data:', data.length, 'records for assigned PS users')
      setFollowupData(data)
    } catch (error) {
      console.error('Error fetching Team Leader analytics data:', error)
      toast.error('Failed to fetch Team Leader analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch team members data (PS users assigned to this Team Leader)
  const fetchTeamMembers = async () => {
    try {
      if (!userData?.id) return
      
      const response = await fetch('/api/users', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        const psUsers = data.filter((user: UserData) => 
          user.role === 'ps' && 
          user.team_leader_id === userData.id &&
          user.is_active
        )
        console.log('👥 [TL Analytics] Found assigned PS users:', psUsers.length)
        setTeamMembers(psUsers)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  useEffect(() => {
    if (userData) {
      fetchPSFollowupData()
      fetchTeamMembers()
    }
  }, [userData])

  // Filter data based on selected criteria
  const filteredData = useMemo(() => {
    let filtered = followupData

    // Filter by PS
    if (selectedPS !== 'all') {
      filtered = filtered.filter(item => item.ps_id === selectedPS)
    }

    // Filter by branch
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(item => item.ps_branch === selectedBranch)
    }

    // Filter by period
    const days = parseInt(selectedPeriod)
    if (days > 0) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      filtered = filtered.filter(item => 
        new Date(item.created_at) >= cutoffDate
      )
    }

    return filtered
  }, [followupData, selectedPS, selectedBranch, selectedPeriod])

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = filteredData.length
    const fresh = filteredData.filter(item => 
      !item.follow_up_date && 
      item.final_status === 'Pending' &&
      !item.first_call_date
    ).length
    const pending = filteredData.filter(item => 
      item.final_status === 'Pending'
    ).length
    const won = filteredData.filter(item => 
      item.final_status === 'Won'
    ).length
    const lost = filteredData.filter(item => 
      item.final_status === 'Lost'
    ).length
    const followup = filteredData.filter(item => 
      item.follow_up_date && 
      item.final_status === 'Pending' &&
      new Date(item.follow_up_date) <= new Date()
    ).length
    const waitingApproval = filteredData.filter(item => 
      item.final_status === 'Waiting for Approval'
    ).length

    const winRate = total > 0 ? (won / total) * 100 : 0
    const conversionRate = total > 0 ? ((won + waitingApproval) / total) * 100 : 0

    return {
      total,
      fresh,
      pending,
      won,
      lost,
      followup,
      waitingApproval,
      winRate,
      conversionRate
    }
  }, [filteredData])

  // Calculate team member performance
  const teamPerformance = useMemo(() => {
    const performance: TeamMember[] = teamMembers.map(member => {
      const memberData = followupData.filter(item => item.ps_id === member.id)
      const total = memberData.length
      const fresh = memberData.filter(item => 
        !item.follow_up_date && 
        item.final_status === 'Pending' &&
        !item.first_call_date
      ).length
      const pending = memberData.filter(item => 
        item.final_status === 'Pending'
      ).length
      const won = memberData.filter(item => 
        item.final_status === 'Won'
      ).length
      const lost = memberData.filter(item => 
        item.final_status === 'Lost'
      ).length
      const followup = memberData.filter(item => 
        item.follow_up_date && 
        item.final_status === 'Pending' &&
        new Date(item.follow_up_date) <= new Date()
      ).length

      return {
        id: member.id,
        name: member.full_name,
        branch: member.branch,
        stats: {
          total_leads: total,
          fresh_leads: fresh,
          pending_leads: pending,
          won_leads: won,
          lost_leads: lost,
          followup_leads: followup,
          win_rate: total > 0 ? (won / total) * 100 : 0,
          conversion_rate: total > 0 ? (won / total) * 100 : 0
        }
      }
    })

    return performance.sort((a, b) => b.stats.win_rate - a.stats.win_rate)
  }, [followupData, teamMembers])

  // Source distribution data
  const sourceData = useMemo(() => {
    if (!Array.isArray(filteredData) || filteredData.length === 0) return []
    const sourceCounts = filteredData.reduce((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
      percentage: (count / filteredData.length) * 100
    }))
  }, [filteredData])

  // Lead category distribution
  const categoryData = useMemo(() => {
    if (!Array.isArray(filteredData) || filteredData.length === 0) return []
    const categoryCounts = filteredData.reduce((acc, item) => {
      const category = item.lead_category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: (count / filteredData.length) * 100
    }))
  }, [filteredData])

  // Daily performance data
  const dailyPerformance = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last7Days.map(date => {
      const dayData = filteredData.filter(item => 
        item.created_at.startsWith(date)
      )
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        leads: dayData.length,
        won: dayData.filter(item => item.final_status === 'Won').length,
        lost: dayData.filter(item => item.final_status === 'Lost').length
      }
    })
  }, [filteredData])

  const refreshData = () => {
    fetchPSFollowupData()
    fetchTeamMembers()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Analytics</h1>
            <p className="text-gray-600">
              Performance insights for your assigned PS team
              {userData?.branch && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {userData.branch}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Period:</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="0">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">PS:</label>
                <Select value={selectedPS} onValueChange={setSelectedPS}>
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PS</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Branch:</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-32 h-8">
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
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Leads</p>
                  <p className="text-2xl font-bold text-blue-900">{kpis.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Fresh Leads</p>
                  <p className="text-2xl font-bold text-orange-900">{kpis.fresh}</p>
                </div>
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{kpis.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Won</p>
                  <p className="text-2xl font-bold text-green-900">{kpis.won}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Lost</p>
                  <p className="text-2xl font-bold text-red-900">{kpis.lost}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Win Rate</p>
                  <p className="text-2xl font-bold text-purple-900">{kpis.winRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Lead Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, 'Leads']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Lead Categories */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Lead Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">Daily Performance (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} name="Total Leads" />
                  <Line type="monotone" dataKey="won" stroke="#10B981" strokeWidth={2} name="Won" />
                  <Line type="monotone" dataKey="lost" stroke="#EF4444" strokeWidth={2} name="Lost" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Assigned PS Performance
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({teamPerformance.length} PS users assigned to you)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamPerformance.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No PS users assigned to you yet.</p>
                <p className="text-sm">Contact your administrator to assign PS users to your team.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-700">PS Name</th>
                      <th className="text-left py-2 font-medium text-gray-700">Branch</th>
                      <th className="text-center py-2 font-medium text-gray-700">Total</th>
                      <th className="text-center py-2 font-medium text-gray-700">Fresh</th>
                      <th className="text-center py-2 font-medium text-gray-700">Pending</th>
                      <th className="text-center py-2 font-medium text-gray-700">Won</th>
                      <th className="text-center py-2 font-medium text-gray-700">Lost</th>
                      <th className="text-center py-2 font-medium text-gray-700">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerformance.map((member) => (
                      <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 font-medium text-gray-900">{member.name}</td>
                        <td className="py-2 text-gray-600">{member.branch}</td>
                        <td className="py-2 text-center">
                          <Badge variant="outline" className="bg-gray-100 text-gray-700">
                            {member.stats.total_leads}
                          </Badge>
                        </td>
                        <td className="py-2 text-center">
                          <Badge variant="outline" className="bg-orange-100 text-orange-700">
                            {member.stats.fresh_leads}
                          </Badge>
                        </td>
                        <td className="py-2 text-center">
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                            {member.stats.pending_leads}
                          </Badge>
                        </td>
                        <td className="py-2 text-center">
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            {member.stats.won_leads}
                          </Badge>
                        </td>
                        <td className="py-2 text-center">
                          <Badge variant="outline" className="bg-red-100 text-red-700">
                            {member.stats.lost_leads}
                          </Badge>
                        </td>
                        <td className="py-2 text-center">
                          <Badge 
                            variant="outline" 
                            className={`${
                              member.stats.win_rate >= 20 
                                ? 'bg-green-100 text-green-700' 
                                : member.stats.win_rate >= 10 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {member.stats.win_rate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
