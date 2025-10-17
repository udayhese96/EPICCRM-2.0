"use client"

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { RoleGuard } from '@/components/auth/role-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Phone, 
  Target,
  Activity,
  UserCheck,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PhoneCall,
  Mail,
  MapPin,
  Building,
  Award,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MessageSquare,
  TrendingUpDown,
  PieChart,
  Filter,
  RefreshCw,
  Info
} from 'lucide-react'
import Link from 'next/link'
import { LeadSourceChart } from '@/components/reports/lead-source-chart'
import { LeadStatusChart } from '@/components/reports/lead-status-chart'
import { TeamLeaderAnalytics } from '@/components/reports/team-leader-analytics'

interface PSUser {
  id: string
  username: string
  full_name: string
  email: string
  branch: string
  team_leader_id?: string
}

interface Lead {
  id: string
  lead_uid: string
  customer_name: string
  customer_mobile_number: string
  customer_email?: string
  source: string
  subsource?: string
  lead_status: string
  final_status?: string
  created_at: string
  updated_at?: string
  assigned_cre_id?: string
  city?: string
  state?: string
  budget?: number
  remarks?: string
  model_interested?: string
  follow_up_date?: string
}

interface TeamPerformanceData {
  total_leads: number
  new_leads: number
  qualified_leads: number
  closed_won: number
  closed_lost: number
  conversion_rate: number
  call_volume: number
  avg_response_time: number
}

interface PSIndividualPerformance {
  ps_user: PSUser
  metrics: TeamPerformanceData
  leads?: Lead[]
  recent_activities: Array<{
    id: string
    type: string
    description: string
    created_at: string
  }>
}

interface LeadSourceData {
  source: string
  count: number
  percentage: number
}

interface LeadStatusData {
  status: string
  count: number
  percentage: number
  color: string
}

// Analytics interfaces
interface PSPerformanceData {
  ps_name: string
  leads_assigned: number
  leads_contacted: number
  gap: number
}

interface SourceAnalysisData {
  ps_name: string
  total_leads: number
  won_leads: number
  win_rate: number
  sources: {
    [key: string]: {
      total: number
      won: number
      win_rate: number
    }
  }
}

interface FollowupSummaryData {
  ps_name: string
  F1: { CRE: number; WALK_IN: number }
  F2: { CRE: number; WALK_IN: number }
  F3: { CRE: number; WALK_IN: number }
  F4: { CRE: number; WALK_IN: number }
  F5: { CRE: number; WALK_IN: number }
  F6: { CRE: number; WALK_IN: number }
  F7: { CRE: number; WALK_IN: number }
}

export default function TeamLeaderDashboard() {
  const [assignedPS, setAssignedPS] = useState<PSUser[]>([])
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceData | null>(null)
  const [individualPerformance, setIndividualPerformance] = useState<PSIndividualPerformance[]>([])
  const [selectedPS, setSelectedPS] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Modal states
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false)
  const [selectedPSDetail, setSelectedPSDetail] = useState<PSIndividualPerformance | null>(null)
  const [isPSDetailOpen, setIsPSDetailOpen] = useState(false)
  
  // Chart data
  const [leadSourceData, setLeadSourceData] = useState<LeadSourceData[]>([])
  const [leadStatusData, setLeadStatusData] = useState<LeadStatusData[]>([])
  
  // Analytics data
  const [psPerformanceData, setPsPerformanceData] = useState<PSPerformanceData[]>([])
  const [sourceAnalysisData, setSourceAnalysisData] = useState<SourceAnalysisData[]>([])
  const [followupSummaryData, setFollowupSummaryData] = useState<FollowupSummaryData[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsFromDate, setAnalyticsFromDate] = useState('')
  const [analyticsToDate, setAnalyticsToDate] = useState('')
  const [analyticsMode, setAnalyticsMode] = useState('all')

  // Read current user id (sales TL) from localStorage once on mount
  useEffect(() => {
    try {
      console.log('[TL-Dashboard] Checking localStorage for user...')
      const supabaseUserRaw = typeof window !== 'undefined' ? localStorage.getItem('supabase_user') : null
      console.log('[TL-Dashboard] supabase_user raw:', supabaseUserRaw)
      
      if (supabaseUserRaw) {
        const u = JSON.parse(supabaseUserRaw)
        console.log('[TL-Dashboard] Parsed supabase user:', u)
        if (u?.id) {
          console.log('[TL-Dashboard] Loaded supabase user:', u)
          setCurrentUserId(u.id as string)
        } else {
          console.warn('[TL-Dashboard] supabase_user found but no id field:', u)
          setIsLoading(false) // Stop loading if no valid user found
        }
      } else {
        const legacyUserRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        console.log('[TL-Dashboard] legacy user raw:', legacyUserRaw)
        if (legacyUserRaw) {
          const u = JSON.parse(legacyUserRaw)
          console.log('[TL-Dashboard] Parsed legacy user:', u)
          if (u?.id) {
            console.log('[TL-Dashboard] Loaded legacy user:', u)
            setCurrentUserId(u.id as string)
          } else {
            console.warn('[TL-Dashboard] legacy user found but no id field:', u)
            setIsLoading(false) // Stop loading if no valid user found
          }
        } else {
          console.warn('[TL-Dashboard] No user found in localStorage')
          setIsLoading(false) // Stop loading if no user found
        }
      }
    } catch (err) {
      console.error('[TL-Dashboard] Error loading user from localStorage:', err)
      setIsLoading(false) // Stop loading on error
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!currentUserId) {
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        // Fetch PS users filtered by team_leader_id
        console.log('[TL-Dashboard] Fetching PS users for TL:', currentUserId)
        const resp = await fetch(`/api/users?role=ps&_=${Date.now()}`, { 
          cache: 'no-store' as any 
        })
        
        if (!resp.ok) {
          console.error('[TL-Dashboard] /api/users?role=ps failed', resp.status)
          throw new Error('Failed to fetch PS users')
        }
        
        const data = await resp.json()
        const users: PSUser[] = data?.users || []
        console.log('[TL-Dashboard] PS assigned to current TL:', users.length, users)
        console.log('[TL-Dashboard] Full API response:', data)
        setAssignedPS(users)

        if (users.length === 0) {
          console.warn('[TL-Dashboard] No PS users assigned to this TL')
          setTeamPerformance({
            total_leads: 0, new_leads: 0, qualified_leads: 0, closed_won: 0,
            closed_lost: 0, conversion_rate: 0, call_volume: 0,  avg_response_time: 0
          })
          setIsLoading(false)
          return
        }

        // Fetch analytics via new endpoints and stop loading
        await fetchAnalyticsData()
        setIsLoading(false)
        return

      } catch (e) {
        console.error('[TL-Dashboard] Error loading dashboard:', e)
        setTeamPerformance({
          total_leads: 0, new_leads: 0, qualified_leads: 0, closed_won: 0,
          closed_lost: 0, conversion_rate: 0, call_volume: 0,  avg_response_time: 0
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    if (currentUserId) {
      load()
    }
  }, [currentUserId, dateRange])

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[TL-Dashboard] Loading timeout reached, stopping loading')
        setIsLoading(false)
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading])

  const filteredPerformance = selectedPS === 'all' 
    ? individualPerformance 
    : individualPerformance.filter(p => p.ps_user.id === selectedPS)

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setIsLeadDetailOpen(true)
  }

  const handleViewPSDetail = (psPerf: PSIndividualPerformance) => {
    setSelectedPSDetail(psPerf)
    setIsPSDetailOpen(true)
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('won') || statusLower.includes('closed won')) return 'bg-green-100 text-green-800 border-green-200'
    if (statusLower.includes('lost') || statusLower.includes('closed lost')) return 'bg-red-100 text-red-800 border-red-200'
    if (statusLower.includes('qualified') || statusLower.includes('interested')) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (statusLower.includes('new') || statusLower.includes('fresh')) return 'bg-purple-100 text-purple-800 border-purple-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusColorForChart = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('won') || statusLower.includes('closed won')) return '#10b981' // green-500
    if (statusLower.includes('lost') || statusLower.includes('closed lost')) return '#ef4444' // red-500
    if (statusLower.includes('qualified') || statusLower.includes('interested')) return '#3b82f6' // blue-500
    if (statusLower.includes('new') || statusLower.includes('fresh')) return '#8b5cf6' // purple-500
    return '#6b7280' // gray-500
  }

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('won')) return <CheckCircle2 className="h-4 w-4" />
    if (statusLower.includes('lost')) return <XCircle className="h-4 w-4" />
    if (statusLower.includes('qualified')) return <Target className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  // Analytics fetch functions
  const fetchAnalyticsData = async () => {
    if (!currentUserId) return
    
    setAnalyticsLoading(true)
    try {
      const params = new URLSearchParams()
      if (analyticsFromDate) params.append('from_date', analyticsFromDate)
      if (analyticsToDate) params.append('to_date', analyticsToDate)
      
      // Fetch PS Performance
      const psPerfResponse = await fetch(`/api/team-leader/ps-performance?${params.toString()}`)
      if (psPerfResponse.ok) {
        const psPerfData = await psPerfResponse.json()
        setPsPerformanceData(psPerfData)
      }
      
      // Fetch Source Analysis
      const sourceResponse = await fetch(`/api/team-leader/source-analysis?${params.toString()}`)
      if (sourceResponse.ok) {
        const sourceData = await sourceResponse.json()
        setSourceAnalysisData(sourceData)
      }
      
      // Fetch Follow-up Summary
      const followupParams = new URLSearchParams(params)
      followupParams.append('mode', analyticsMode)
      const followupResponse = await fetch(`/api/team-leader/followup-summary?${followupParams.toString()}`)
      if (followupResponse.ok) {
        const followupData = await followupResponse.json()
        setFollowupSummaryData(followupData)
      }
      
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const resetAnalyticsFilters = () => {
    setAnalyticsFromDate('')
    setAnalyticsToDate('')
    setAnalyticsMode('all')
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-gray-600">Loading your team analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Show error message if no user found
  if (!currentUserId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access the Team Leader Dashboard.</p>
            <Button asChild>
              <Link href="/auth/login">
                Go to Login
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <RoleGuard requiredRole="team_leader">
        <div className="space-y-6 pb-8">
          {/* Header with Gradient */}
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-8 shadow-sm border border-orange-100">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Team Leader Dashboard</h1>
                <p className="text-gray-700">
                  Comprehensive analytics and performance insights for your team
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <Badge variant="outline" className="bg-white/80 border-orange-200 text-orange-800">
                    <Users className="h-3 w-3 mr-1" />
                    {assignedPS.length} PS Members
                  </Badge>
                  <Badge variant="outline" className="bg-white/80 border-orange-200 text-orange-800">
                    <Calendar className="h-3 w-3 mr-1" />
                    Last {dateRange} days
                  </Badge>
                </div>
              </div>
              <div className="flex space-x-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40 bg-white shadow-sm border-orange-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedPS} onValueChange={setSelectedPS}>
                  <SelectTrigger className="w-52 bg-white shadow-sm border-orange-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PS Members</SelectItem>
                    {assignedPS.map((ps) => (
                      <SelectItem key={ps.id} value={ps.id}>
                        {ps.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Total Leads</CardTitle>
                <Target className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{teamPerformance?.total_leads || 0}</div>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="text-orange-600 font-medium">{teamPerformance?.new_leads || 0}</span> new this period
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Conversion Rate</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {teamPerformance?.conversion_rate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="text-green-600 font-medium">{teamPerformance?.closed_won || 0}</span> closed won
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Call Volume</CardTitle>
                <Phone className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{teamPerformance?.call_volume || 0}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Avg <span className="font-medium">{teamPerformance?.avg_response_time?.toFixed(1) || 0}</span> min response
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Team Performance Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Qualified Leads</p>
                    <p className="text-2xl font-bold text-gray-900">{teamPerformance?.qualified_leads || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Closed Won</p>
                    <p className="text-2xl font-bold text-green-600">{teamPerformance?.closed_won || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Closed Lost</p>
                    <p className="text-2xl font-bold text-red-600">{teamPerformance?.closed_lost || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PS Team Performance Cards */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    <Users className="h-5 w-5 mr-2 text-orange-600" />
                    PS Team Performance Overview
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Individual performance metrics for each team member
                  </CardDescription>
                </div>
                <Badge className="bg-orange-500 text-white">
                  {filteredPerformance.length} Members
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPerformance.map((perf) => (
                  <Card 
                    key={perf.ps_user.id} 
                    className="border-2 hover:border-orange-300 transition-all hover:shadow-lg cursor-pointer"
                    onClick={() => handleViewPSDetail(perf)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold">{perf.ps_user.full_name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            @{perf.ps_user.username} • {perf.ps_user.branch}
                          </CardDescription>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewPSDetail(perf)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                        <span className="text-sm text-gray-600">Total Leads</span>
                        <Badge className="bg-orange-500 text-white">{perf.metrics.total_leads}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-green-50 rounded text-center">
                          <p className="text-xs text-gray-600">Won</p>
                          <p className="text-lg font-bold text-green-600">{perf.metrics.closed_won}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded text-center">
                          <p className="text-xs text-gray-600">Qualified</p>
                          <p className="text-lg font-bold text-blue-600">{perf.metrics.qualified_leads}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
                        <span className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {perf.metrics.call_volume} calls
                        </span>
                        <span className="flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {perf.metrics.conversion_rate?.toFixed(1)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredPerformance.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No PS members assigned to your team yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
                  Lead Source Distribution
                </CardTitle>
                <CardDescription>Where your team's leads are coming from</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <LeadSourceChart data={leadSourceData} />
                <div className="mt-4 space-y-2">
                  {leadSourceData.slice(0, 5).map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{source.source}</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{source.count}</span>
                        <span className="text-gray-400">({source.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-orange-600" />
                  Lead Status Overview
                </CardTitle>
                <CardDescription>Current status distribution of all leads</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <LeadStatusChart data={leadStatusData} />
                <div className="mt-4 space-y-2">
                  {leadStatusData.slice(0, 5).map((status, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        {getStatusIcon(status.status)}
                        <span className="text-gray-600 ml-2">{status.status}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{status.count}</span>
                        <span className="text-gray-400">({status.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Leads by PS Member */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-orange-600" />
                Detailed Lead Breakdown by PS Member
              </CardTitle>
              <CardDescription>Click on any lead to view complete details</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {filteredPerformance.map((perf) => (
                    <div key={perf.ps_user.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{perf.ps_user.full_name}</h3>
                            <p className="text-sm text-gray-600">
                              @{perf.ps_user.username} • {perf.ps_user.email}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-orange-500 text-white text-lg px-3 py-1">
                              {perf.leads?.length || 0} Leads
                            </Badge>
                            <p className="text-xs text-gray-600 mt-1">{perf.ps_user.branch}</p>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y">
                        {perf.leads && perf.leads.length > 0 ? (
                          perf.leads.map((lead) => (
                            <div 
                              key={lead.id || lead.lead_uid} 
                              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => handleViewLead(lead)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="font-medium text-gray-900">{lead.customer_name}</h4>
                                    <Badge variant="outline" className="text-xs">
                                      {lead.lead_uid}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="flex items-center text-gray-600">
                                      <PhoneCall className="h-4 w-4 mr-1.5 text-orange-500" />
                                      {lead.customer_mobile_number}
                                    </div>
                                    {lead.customer_email && (
                                      <div className="flex items-center text-gray-600">
                                        <Mail className="h-4 w-4 mr-1.5 text-orange-500" />
                                        {lead.customer_email}
                                      </div>
                                    )}
                                    <div className="flex items-center text-gray-600">
                                      <Building className="h-4 w-4 mr-1.5 text-orange-500" />
                                      {lead.source}
                                      {lead.subsource && ` • ${lead.subsource}`}
                                    </div>
                                    {(lead.city || lead.state) && (
                                      <div className="flex items-center text-gray-600">
                                        <MapPin className="h-4 w-4 mr-1.5 text-orange-500" />
                                        {lead.city}{lead.city && lead.state && ', '}{lead.state}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-3">
                                    <Badge className={getStatusColor(lead.final_status || lead.lead_status)}>
                                      {getStatusIcon(lead.final_status || lead.lead_status)}
                                      <span className="ml-1">{lead.final_status || lead.lead_status}</span>
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      Created: {new Date(lead.created_at).toLocaleDateString('en-IN')}
                                    </span>
                                    {lead.follow_up_date && (
                                      <span className="text-xs text-orange-600 flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Follow-up: {new Date(lead.follow_up_date).toLocaleDateString('en-IN')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="ml-4 border-orange-300 hover:bg-orange-50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewLead(lead)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-gray-500">
                            <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>No leads assigned yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recent Team Activities */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-orange-600" />
                Recent Team Activities
              </CardTitle>
              <CardDescription>Latest activities across your PS team</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {individualPerformance.flatMap(perf => 
                    perf.recent_activities.map(activity => ({
                      ...activity,
                      ps_user: perf.ps_user
                    }))
                  ).sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  ).slice(0, 20).map((activity, idx) => (
                    <div key={`${activity.id}-${idx}`} className="flex items-start space-x-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center border-2 border-orange-200">
                          <UserCheck className="h-5 w-5 text-orange-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-gray-900">{activity.ps_user.full_name}</p>
                          <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(activity.created_at).toLocaleString('en-IN')}
                          </span>
                          <span>•</span>
                          <span>@{activity.ps_user.username}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {individualPerformance.flatMap(p => p.recent_activities).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No recent activities to display</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    Analytics Dashboard
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Comprehensive analytics and performance insights
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Analytics Filter */}
              <div className="mb-6">
                <div className="flex items-center space-x-4 mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    Analytics Filter
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">From Date:</label>
                    <input
                      type="date"
                      value={analyticsFromDate}
                      onChange={(e) => setAnalyticsFromDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">To Date:</label>
                    <input
                      type="date"
                      value={analyticsToDate}
                      onChange={(e) => setAnalyticsToDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end space-x-2">
                    <Button 
                      onClick={fetchAnalyticsData} 
                      disabled={analyticsLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {analyticsLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Filter className="h-4 w-4 mr-2" />
                      )}
                      Apply Filter
                    </Button>
                    <Button 
                      onClick={resetAnalyticsFilters} 
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>

              {/* Analytics Tabs */}
              <Tabs defaultValue="ps-performance" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ps-performance" className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    PS Performance
                  </TabsTrigger>
                  <TabsTrigger value="source-analysis" className="flex items-center">
                    <PieChart className="h-4 w-4 mr-2" />
                    Source Analysis
                  </TabsTrigger>
                  <TabsTrigger value="followup-summary" className="flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Follow-up Summary
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ps-performance" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Product Specialist Performance
                        </CardTitle>
                        <CardDescription>
                          Click on any PS card to view detailed performance metrics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {psPerformanceData.length === 0 ? (
                          <div className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">No PS Performance Data</h3>
                            <p className="text-gray-500">No PS users found or no data available for the selected date range.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {psPerformanceData.map((ps) => (
                              <Card 
                                key={ps.ps_name} 
                                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500 hover:border-l-blue-600"
                                onClick={() => {
                                  setSelectedPSDetail({
                                    ps_user: { id: ps.ps_name, full_name: ps.ps_name, username: ps.ps_name, email: '', branch: '' },
                                    metrics: {
                                      total_leads: ps.leads_assigned,
                                      new_leads: ps.leads_assigned,
                                      qualified_leads: ps.leads_contacted,
                                      closed_won: 0,
                                      closed_lost: 0,
                                      call_volume: 0,
                                      avg_response_time: 0,
                                      conversion_rate: ps.leads_assigned > 0 ? (ps.leads_contacted / ps.leads_assigned) * 100 : 0
                                    },
                                    leads: [],
                                    recent_activities: []
                                  })
                                  setIsPSDetailOpen(true)
                                }}
                              >
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Users className="h-5 w-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-900">{ps.ps_name}</h3>
                                        <p className="text-sm text-gray-500">Product Specialist</p>
                                      </div>
                                    </div>
                                    <Badge 
                                      variant={ps.gap > 0 ? "destructive" : "secondary"}
                                      className="text-xs"
                                    >
                                      {ps.gap > 0 ? `${ps.gap} Gap` : 'On Track'}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-blue-600">{ps.leads_assigned}</div>
                                      <div className="text-xs text-gray-500">Assigned</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-green-600">{ps.leads_contacted}</div>
                                      <div className="text-xs text-gray-500">Contacted</div>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                      <span>Contact Rate</span>
                                      <span>{ps.leads_assigned > 0 ? Math.round((ps.leads_contacted / ps.leads_assigned) * 100) : 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                        style={{ 
                                          width: `${ps.leads_assigned > 0 ? (ps.leads_contacted / ps.leads_assigned) * 100 : 0}%` 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="source-analysis" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <PieChart className="h-5 w-5 mr-2" />
                          Source-wise Leads Analysis
                        </CardTitle>
                        <CardDescription>
                          Click on any PS card to view detailed source breakdown
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {sourceAnalysisData.length === 0 ? (
                          <div className="text-center py-12">
                            <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Source Analysis Data</h3>
                            <p className="text-gray-500">No PS users found or no data available for the selected date range.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sourceAnalysisData.map((ps) => (
                              <Card 
                                key={ps.ps_name} 
                                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-purple-500 hover:border-l-purple-600"
                                onClick={() => {
                                  // Create a modal or detailed view for source analysis
                                  const sourceDetails = Object.entries(ps.sources).map(([source, data]) => ({
                                    source,
                                    ...data
                                  })).filter(source => source.total > 0)
                                  
                                  alert(`Source Analysis for ${ps.ps_name}:\n\n${sourceDetails.map(s => 
                                    `${s.source}: ${s.total} leads, ${s.won} won (${s.win_rate}% win rate)`
                                  ).join('\n')}`)
                                }}
                              >
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <PieChart className="h-5 w-5 text-purple-600" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-900">{ps.ps_name}</h3>
                                        <p className="text-sm text-gray-500">Source Performance</p>
                                      </div>
                                    </div>
                                    <Badge 
                                      variant={ps.win_rate > 10 ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {ps.win_rate}% Win Rate
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-purple-600">{ps.total_leads}</div>
                                      <div className="text-xs text-gray-500">Total Leads</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-green-600">{ps.won_leads}</div>
                                      <div className="text-xs text-gray-500">Won Leads</div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="text-xs font-medium text-gray-700 mb-2">Top Sources:</div>
                                    {Object.entries(ps.sources)
                                      .filter(([_, data]) => data.total > 0)
                                      .sort(([_, a], [__, b]) => b.total - a.total)
                                      .slice(0, 3)
                                      .map(([source, data]) => (
                                        <div key={source} className="flex justify-between items-center">
                                          <span className="text-xs text-gray-600">{source}</span>
                                          <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-500">{data.total}</span>
                                            <div className="w-12 bg-gray-200 rounded-full h-1">
                                              <div 
                                                className="bg-purple-500 h-1 rounded-full" 
                                                style={{ width: `${(data.total / ps.total_leads) * 100}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="followup-summary" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Activity className="h-5 w-5 mr-2" />
                          Product Specialist Follow-up Summary
                        </CardTitle>
                        <div className="flex items-center space-x-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Mode:</label>
                            <Select value={analyticsMode} onValueChange={setAnalyticsMode}>
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Leads</SelectItem>
                                <SelectItem value="pending">All Pending Leads</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Info className="h-4 w-4 mr-1" />
                            Mode 1: All pending leads
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {followupSummaryData.length === 0 ? (
                          <div className="text-center py-12">
                            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Follow-up Data</h3>
                            <p className="text-gray-500">No PS users found or no data available for the selected date range.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {followupSummaryData.map((ps) => (
                              <Card 
                                key={ps.ps_name} 
                                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-orange-500 hover:border-l-orange-600"
                                onClick={() => {
                                  const followupDetails = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'].map(stage => {
                                    const stageData = ps[stage as keyof FollowupSummaryData] as { CRE: number; WALK_IN: number }
                                    const total = stageData.CRE + stageData.WALK_IN
                                    return `${stage}: ${total} leads (${stageData.CRE} CRE, ${stageData.WALK_IN} Walk-in)`
                                  }).filter(detail => detail.includes(': 0 leads') === false)
                                  
                                  alert(`Follow-up Summary for ${ps.ps_name}:\n\n${followupDetails.join('\n')}`)
                                }}
                              >
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                        <Activity className="h-5 w-5 text-orange-600" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-900">{ps.ps_name}</h3>
                                        <p className="text-sm text-gray-500">Follow-up Stages</p>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      Click to View
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'].map(stage => {
                                      const stageData = ps[stage as keyof FollowupSummaryData] as { CRE: number; WALK_IN: number }
                                      const total = stageData.CRE + stageData.WALK_IN
                                      
                                      if (total === 0) return null
                                      
                                      return (
                                        <div key={stage} className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <Badge variant="outline" className="text-xs font-mono">
                                              {stage}
                                            </Badge>
                                            <span className="text-sm text-gray-600">{total} leads</span>
                                          </div>
                                          <div className="flex space-x-1">
                                            {stageData.CRE > 0 && (
                                              <Badge variant="destructive" className="text-xs px-1 py-0">
                                                {stageData.CRE}
                                              </Badge>
                                            )}
                                            {stageData.WALK_IN > 0 && (
                                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                                {stageData.WALK_IN}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    }).filter(Boolean)}
                                    
                                    {['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'].every(stage => {
                                      const stageData = ps[stage as keyof FollowupSummaryData] as { CRE: number; WALK_IN: number }
                                      return stageData.CRE + stageData.WALK_IN === 0
                                    }) && (
                                      <div className="text-center py-4 text-gray-500">
                                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No follow-up data</p>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Lead Detail Modal */}
        <Dialog open={isLeadDetailOpen} onOpenChange={setIsLeadDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center">
                <Target className="h-6 w-6 mr-2 text-orange-600" />
                Lead Details
              </DialogTitle>
              <DialogDescription>
                Complete information for lead {selectedLead?.lead_uid}
              </DialogDescription>
            </DialogHeader>

            {selectedLead && (
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <Badge className={`${getStatusColor(selectedLead.final_status || selectedLead.lead_status)} text-base px-4 py-2`}>
                    {getStatusIcon(selectedLead.final_status || selectedLead.lead_status)}
                    <span className="ml-2">{selectedLead.final_status || selectedLead.lead_status}</span>
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {selectedLead.lead_uid}
                  </Badge>
                </div>

                <Separator />

                {/* Customer Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <UserCheck className="h-5 w-5 mr-2 text-orange-600" />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm text-gray-600">Full Name</label>
                      <p className="font-medium">{selectedLead.customer_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Mobile Number</label>
                      <p className="font-medium flex items-center">
                        <PhoneCall className="h-4 w-4 mr-1 text-orange-500" />
                        {selectedLead.customer_mobile_number}
                      </p>
                    </div>
                    {selectedLead.customer_email && (
                      <div>
                        <label className="text-sm text-gray-600">Email</label>
                        <p className="font-medium flex items-center">
                          <Mail className="h-4 w-4 mr-1 text-orange-500" />
                          {selectedLead.customer_email}
                        </p>
                      </div>
                    )}
                    {(selectedLead.city || selectedLead.state) && (
                      <div>
                        <label className="text-sm text-gray-600">Location</label>
                        <p className="font-medium flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-orange-500" />
                          {selectedLead.city}{selectedLead.city && selectedLead.state && ', '}{selectedLead.state}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Lead Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Building className="h-5 w-5 mr-2 text-orange-600" />
                    Lead Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm text-gray-600">Source</label>
                      <p className="font-medium">{selectedLead.source}</p>
                    </div>
                    {selectedLead.subsource && (
                      <div>
                        <label className="text-sm text-gray-600">Sub-source</label>
                        <p className="font-medium">{selectedLead.subsource}</p>
                      </div>
                    )}
                    {selectedLead.model_interested && (
                      <div>
                        <label className="text-sm text-gray-600">Model Interested</label>
                        <p className="font-medium">{selectedLead.model_interested}</p>
                      </div>
                    )}
                    {selectedLead.budget && (
                      <div>
                        <label className="text-sm text-gray-600">Budget</label>
                        <p className="font-medium">₹{selectedLead.budget.toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-gray-600">Created On</label>
                      <p className="font-medium">
                        {new Date(selectedLead.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {selectedLead.updated_at && (
                      <div>
                        <label className="text-sm text-gray-600">Last Updated</label>
                        <p className="font-medium">
                          {new Date(selectedLead.updated_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {selectedLead.follow_up_date && (
                      <div className="md:col-span-2">
                        <label className="text-sm text-gray-600">Next Follow-up</label>
                        <p className="font-medium text-orange-600 flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(selectedLead.follow_up_date).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedLead.remarks && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2 text-orange-600" />
                        Remarks
                      </h3>
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                        <p className="text-gray-700">{selectedLead.remarks}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* PS Detail Modal */}
        <Dialog open={isPSDetailOpen} onOpenChange={setIsPSDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center">
                <UserCheck className="h-6 w-6 mr-2 text-orange-600" />
                {selectedPSDetail?.ps_user.full_name} - Performance Details
              </DialogTitle>
              <DialogDescription>
                Comprehensive performance analytics and activity breakdown
              </DialogDescription>
            </DialogHeader>

            {selectedPSDetail && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="leads">Leads ({selectedPSDetail.leads?.length || 0})</TabsTrigger>
                  <TabsTrigger value="activities">Activities</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  {/* PS User Info */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-lg border border-orange-100">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold">{selectedPSDetail.ps_user.full_name}</h3>
                        <p className="text-gray-600">@{selectedPSDetail.ps_user.username}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {selectedPSDetail.ps_user.email}
                          </span>
                          <span className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {selectedPSDetail.ps_user.branch}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-orange-500 text-white text-lg px-4 py-2">
                        PS Member
                      </Badge>
                    </div>
                  </div>

                  {/* Performance Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-2 border-orange-200">
                      <CardContent className="pt-6 text-center">
                        <Target className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                        <p className="text-3xl font-bold">{selectedPSDetail.metrics.total_leads}</p>
                        <p className="text-sm text-gray-600">Total Leads</p>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-200">
                      <CardContent className="pt-6 text-center">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-3xl font-bold text-green-600">{selectedPSDetail.metrics.closed_won}</p>
                        <p className="text-sm text-gray-600">Closed Won</p>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200">
                      <CardContent className="pt-6 text-center">
                        <Phone className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-3xl font-bold text-blue-600">{selectedPSDetail.metrics.call_volume}</p>
                        <p className="text-sm text-gray-600">Call Volume</p>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-purple-200">
                      <CardContent className="pt-6 text-center">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <p className="text-3xl font-bold text-purple-600">
                          {selectedPSDetail.metrics.conversion_rate?.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600">Conversion Rate</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Additional Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">New Leads</p>
                            <p className="text-2xl font-bold">{selectedPSDetail.metrics.new_leads}</p>
                          </div>
                          <ArrowUpRight className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Qualified</p>
                            <p className="text-2xl font-bold">{selectedPSDetail.metrics.qualified_leads}</p>
                          </div>
                          <CheckCircle2 className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="leads" className="mt-6">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {selectedPSDetail.leads && selectedPSDetail.leads.length > 0 ? (
                        selectedPSDetail.leads.map((lead) => (
                          <Card 
                            key={lead.id || lead.lead_uid}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => {
                              setSelectedLead(lead)
                              setIsLeadDetailOpen(true)
                            }}
                          >
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="font-semibold">{lead.customer_name}</h4>
                                    <Badge variant="outline" className="text-xs">{lead.lead_uid}</Badge>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                    <span className="flex items-center">
                                      <PhoneCall className="h-3 w-3 mr-1" />
                                      {lead.customer_mobile_number}
                                    </span>
                                    <span className="flex items-center">
                                      <Building className="h-3 w-3 mr-1" />
                                      {lead.source}
                                    </span>
                                    {lead.city && (
                                      <span className="flex items-center">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {lead.city}
                                      </span>
                                    )}
                                  </div>

                                  <Badge className={getStatusColor(lead.final_status || lead.lead_status)}>
                                    {getStatusIcon(lead.final_status || lead.lead_status)}
                                    <span className="ml-1">{lead.final_status || lead.lead_status}</span>
                                  </Badge>
                                </div>

                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No leads assigned yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="activities" className="mt-6">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {selectedPSDetail.recent_activities.length > 0 ? (
                        selectedPSDetail.recent_activities.map((activity) => (
                          <Card key={activity.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-start space-x-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Activity className="h-5 w-5 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Badge variant="outline">{activity.type}</Badge>
                                    <span className="text-xs text-gray-500">
                                      {new Date(activity.created_at).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{activity.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No recent activities</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </RoleGuard>
    </DashboardLayout>
  )
}
