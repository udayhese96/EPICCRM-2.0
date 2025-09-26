"use client"

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { RoleGuard } from '@/components/auth/role-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  TrendingUp, 
  Users, 
  Phone, 
  DollarSign, 
  Target,
  Calendar,
  BarChart3,
  Activity,
  UserCheck,
  Clock
} from 'lucide-react'
import { LeadSourceChart } from '@/components/reports/lead-source-chart'
import { LeadStatusChart } from '@/components/reports/lead-status-chart'
import { PerformanceMetrics } from '@/components/reports/performance-metrics'
import { TeamLeaderAnalytics } from '@/components/reports/team-leader-analytics'

interface PSUser {
  id: string
  username: string
  full_name: string
  email: string
  branch: string
}

interface TeamLeaderAssignment {
  id: string
  ps_user_id: string
  ps_user: PSUser
}

interface TeamPerformanceData {
  total_leads: number
  new_leads: number
  qualified_leads: number
  closed_won: number
  closed_lost: number
  conversion_rate: number
  call_volume: number
  revenue: number
  avg_response_time: number
}

interface PSIndividualPerformance {
  ps_user: PSUser
  metrics: TeamPerformanceData
  recent_activities: Array<{
    id: string
    type: string
    description: string
    created_at: string
  }>
}

export default function TeamLeaderDashboard() {
  const [assignedPS, setAssignedPS] = useState<PSUser[]>([])
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceData | null>(null)
  const [individualPerformance, setIndividualPerformance] = useState<PSIndividualPerformance[]>([])
  const [selectedPS, setSelectedPS] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const mockTeamPerformance: TeamPerformanceData = {
    total_leads: 0,
    new_leads: 0,
    qualified_leads: 0,
    closed_won: 0,
    closed_lost: 0,
    conversion_rate: 0,
    call_volume: 0,
    revenue: 0,
    avg_response_time: 0
  }

  // Fallback when no data is available
  const mockAssignedPS: PSUser[] = []

  const mockIndividualPerformance: PSIndividualPerformance[] = []

  // Read current user id (sales TL) from localStorage once on mount
  useEffect(() => {
    try {
      const supabaseUserRaw = typeof window !== 'undefined' ? localStorage.getItem('supabase_user') : null
      if (supabaseUserRaw) {
        const u = JSON.parse(supabaseUserRaw)
        if (u?.id) {
          console.log('[TL-Dashboard] Loaded supabase user:', u)
          setCurrentUserId(u.id as string)
        } else {
          console.warn('[TL-Dashboard] supabase_user found but no id field:', u)
        }
      } else {
        const legacyUserRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (legacyUserRaw) {
          const u = JSON.parse(legacyUserRaw)
          if (u?.id) {
            console.log('[TL-Dashboard] Loaded legacy user:', u)
            setCurrentUserId(u.id as string)
          } else {
            console.warn('[TL-Dashboard] legacy user found but no id field:', u)
          }
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        // Fetch PS users and filter by team_leader_id === current TL id
        console.log('[TL-Dashboard] Fetching PS users for TL:', currentUserId)
        const resp = await fetch(`/api/users?role=ps&_=${Date.now()}`, { cache: 'no-store' as any })
        if (!resp.ok) {
          console.error('[TL-Dashboard] /api/users?role=ps failed', resp.status)
        }
        const data = await resp.json().catch((e) => ({ error: String(e) }))
        const allPs: any[] = (data?.users || [])
        console.log('[TL-Dashboard] PS fetched:', allPs.length, allPs)
        const users: PSUser[] = allPs.filter((u: any) => u.team_leader_id === currentUserId)
        console.log('[TL-Dashboard] PS assigned to current TL:', users.length, users)
        setAssignedPS(users)

        // Fetch per-PS performance from API if available
        try {
          const perfResp = await fetch(`/api/team-leader/individual-performance?team_leader_id=${currentUserId}&days=${dateRange}`)
          if (perfResp.ok) {
            const perfData = await perfResp.json()
            console.log('[TL-Dashboard] Performance API payload:', perfData)
            const raw = Array.isArray(perfData?.individual) ? perfData.individual : (Array.isArray(perfData?.individual_performance) ? perfData.individual_performance : [])
            const byId = new Set(users.map(u => u.id))
            const filtered = raw.filter((p: any) => byId.has(p?.ps_user?.id))
            console.log('[TL-Dashboard] Filtered PS perf count:', filtered.length, filtered)
            filtered.forEach((p: any) => {
              console.log('[TL-Dashboard] PS metrics:', p?.ps_user?.username, p?.metrics, p?.debug || {})
            })
            setIndividualPerformance(filtered.length ? filtered : users.map(u => ({ ps_user: u, metrics: { total_leads: 0, new_leads: 0, qualified_leads: 0, closed_won: 0, closed_lost: 0, conversion_rate: 0, call_volume: 0, revenue: 0, avg_response_time: 0 }, recent_activities: [] })))

            // Aggregate KPIs from PS metrics
            const agg = (filtered.length ? filtered : []).reduce((acc: TeamPerformanceData, cur: any) => {
              const m = cur.metrics || {}
              acc.total_leads += m.total_leads || 0
              acc.new_leads += m.new_leads || 0
              acc.qualified_leads += m.qualified_leads || 0
              acc.closed_won += m.closed_won || 0
              acc.closed_lost += m.closed_lost || 0
              acc.call_volume += m.call_volume || 0
              acc.revenue += m.revenue || 0
              acc.avg_response_time += m.avg_response_time || 0
              return acc
            }, { ...mockTeamPerformance })
            const denom = filtered.length || 1
            agg.conversion_rate = agg.total_leads > 0 ? Math.round((agg.closed_won / agg.total_leads) * 1000) / 10 : 0
            agg.avg_response_time = Math.round((agg.avg_response_time / denom) * 10) / 10
            console.log('[TL-Dashboard] Aggregated KPIs from ps_follow_up_master:', agg)
            setTeamPerformance(agg)
          } else {
            console.warn('[TL-Dashboard] Performance API not ok:', perfResp.status)
            setTeamPerformance(mockTeamPerformance)
          }
        } catch {
          console.error('[TL-Dashboard] Performance fetch threw, using zeroed metrics')
          setIndividualPerformance(users.map(u => ({
            ps_user: u,
            metrics: { total_leads: 0, new_leads: 0, qualified_leads: 0, closed_won: 0, closed_lost: 0, conversion_rate: 0, call_volume: 0, revenue: 0, avg_response_time: 0 },
            recent_activities: []
          })))
        }

        // Team aggregate is derived above; nothing to do here
      } catch (e) {
        console.error('[TL-Dashboard] Unexpected error loading dashboard:', e)
        setAssignedPS(mockAssignedPS)
        setTeamPerformance(mockTeamPerformance)
        setIndividualPerformance(mockIndividualPerformance)
      } finally {
        setIsLoading(false)
      }
    }
    if (currentUserId) {
      load()
    }
  }, [currentUserId, dateRange])

  const filteredPerformance = selectedPS === 'all' 
    ? individualPerformance 
    : individualPerformance.filter(p => p.ps_user.id === selectedPS)

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <RoleGuard requiredRole="team_leader">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Leader Dashboard</h1>
              <p className="text-gray-600">Analytical oversight of assigned PS team members</p>
            </div>
            <div className="flex space-x-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
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
                <SelectTrigger className="w-48">
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

          {/* Simplified KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamPerformance?.total_leads}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Call Volume</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamPerformance?.call_volume}</div>
              </CardContent>
            </Card>
          </div>

          {/* Team Analytics Section */}
          <TeamLeaderAnalytics 
            teamPerformance={teamPerformance || mockTeamPerformance}
            individualPerformance={filteredPerformance}
          />

          {/* Per-PS Lead Counts */}
          <Card>
            <CardHeader>
              <CardTitle>Leads by PS Member</CardTitle>
              <CardDescription>Segregation of leads per assigned PS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {individualPerformance.map((perf) => (
                  <div key={perf.ps_user.id} className="p-3 border rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-medium">{perf.ps_user.full_name}</div>
                      <div className="text-xs text-gray-500">{perf.ps_user.username} • {perf.ps_user.branch}</div>
                    </div>
                    <Badge className="text-xs">{perf.metrics.total_leads} leads</Badge>
                  </div>
                ))}
                {individualPerformance.length === 0 && (
                  <div className="text-sm text-gray-500">No PS members assigned.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Source Distribution</CardTitle>
              <CardDescription>Distribution of leads by source for your team</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadSourceChart data={[]} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Status Overview</CardTitle>
              <CardDescription>Current status of all leads in your team</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadStatusChart data={[]} />
            </CardContent>
          </Card>
          </div>

          {/* Leads by PS with drilldown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Leads by PS Member
              </CardTitle>
              <CardDescription>Click a PS to view their leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPerformance.map((perf) => (
                  <div key={perf.ps_user.id} className="border rounded-md">
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <div className="font-medium">{perf.ps_user.full_name}</div>
                        <div className="text-xs text-muted-foreground">{perf.ps_user.username}</div>
                      </div>
                      <Badge>{perf.metrics.total_leads} leads</Badge>
                    </div>
                    {/* Leads list */}
                    <div className="divide-y">
                      {(perf as any).leads?.map((lead: any) => (
                        <div key={lead.id || lead.lead_uid} className="flex items-center justify-between p-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{lead.customer_name} • {lead.customer_mobile_number}</div>
                            <div className="text-xs text-muted-foreground truncate">{lead.lead_uid} • {lead.source} • {lead.final_status || lead.lead_status}</div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => alert(JSON.stringify(lead, null, 2))}>Eye</Button>
                        </div>
                      ))}
                      {!(perf as any).leads?.length && (
                        <div className="p-3 text-sm text-muted-foreground">No leads found.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Team Activities
              </CardTitle>
              <CardDescription>
                Latest activities from your assigned PS team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {individualPerformance.flatMap(perf => 
                  perf.recent_activities.map(activity => (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{activity.description}</div>
                        <div className="text-sm text-gray-500">
                          {perf.ps_user.full_name} • {new Date(activity.created_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {activity.type}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
    </DashboardLayout>
  )
}
