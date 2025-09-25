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

  // Mock data for demonstration - replace with actual API calls
  const mockTeamPerformance: TeamPerformanceData = {
    total_leads: 156,
    new_leads: 45,
    qualified_leads: 67,
    closed_won: 23,
    closed_lost: 21,
    conversion_rate: 14.7,
    call_volume: 342,
    revenue: 1250000,
    avg_response_time: 2.3
  }

  const mockAssignedPS: PSUser[] = [
    { id: '1', username: 'john_ps', full_name: 'John Smith', email: 'john@example.com', branch: 'Main' },
    { id: '2', username: 'sarah_ps', full_name: 'Sarah Johnson', email: 'sarah@example.com', branch: 'Main' },
    { id: '3', username: 'mike_ps', full_name: 'Mike Wilson', email: 'mike@example.com', branch: 'Branch 1' }
  ]

  const mockIndividualPerformance: PSIndividualPerformance[] = [
    {
      ps_user: mockAssignedPS[0],
      metrics: {
        total_leads: 52,
        new_leads: 15,
        qualified_leads: 22,
        closed_won: 8,
        closed_lost: 7,
        conversion_rate: 15.4,
        call_volume: 118,
        revenue: 420000,
        avg_response_time: 1.8
      },
      recent_activities: [
        { id: '1', type: 'call', description: 'Follow-up call with potential client', created_at: '2024-01-15T10:30:00Z' },
        { id: '2', type: 'meeting', description: 'Product demonstration scheduled', created_at: '2024-01-15T09:15:00Z' }
      ]
    },
    {
      ps_user: mockAssignedPS[1],
      metrics: {
        total_leads: 48,
        new_leads: 18,
        qualified_leads: 20,
        closed_won: 7,
        closed_lost: 3,
        conversion_rate: 14.6,
        call_volume: 95,
        revenue: 380000,
        avg_response_time: 2.1
      },
      recent_activities: [
        { id: '3', type: 'email', description: 'Sent proposal to qualified lead', created_at: '2024-01-15T14:20:00Z' },
        { id: '4', type: 'call', description: 'Initial qualification call', created_at: '2024-01-15T11:45:00Z' }
      ]
    },
    {
      ps_user: mockAssignedPS[2],
      metrics: {
        total_leads: 56,
        new_leads: 12,
        qualified_leads: 25,
        closed_won: 8,
        closed_lost: 11,
        conversion_rate: 14.3,
        call_volume: 129,
        revenue: 450000,
        avg_response_time: 3.1
      },
      recent_activities: [
        { id: '5', type: 'meeting', description: 'Client presentation completed', created_at: '2024-01-15T16:00:00Z' },
        { id: '6', type: 'call', description: 'Negotiation call scheduled', created_at: '2024-01-15T13:30:00Z' }
      ]
    }
  ]

  useEffect(() => {
    // Simulate API call
    const fetchDashboardData = async () => {
      setIsLoading(true)
      
      // In a real implementation, fetch from APIs:
      // - /api/team-leader-assignments to get assigned PS users
      // - /api/team-leader/performance to get team performance
      // - /api/team-leader/individual-performance to get individual PS performance
      
      setTimeout(() => {
        setAssignedPS(mockAssignedPS)
        setTeamPerformance(mockTeamPerformance)
        setIndividualPerformance(mockIndividualPerformance)
        setIsLoading(false)
      }, 1000)
    }

    fetchDashboardData()
  }, [dateRange])

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

          {/* Team Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamPerformance?.total_leads}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamPerformance?.conversion_rate}%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+2.1%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Call Volume</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamPerformance?.call_volume}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+8%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(teamPerformance?.revenue || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+15%</span> from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Team Analytics Section */}
          <TeamLeaderAnalytics 
            teamPerformance={teamPerformance || mockTeamPerformance}
            individualPerformance={filteredPerformance}
          />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Source Distribution</CardTitle>
                <CardDescription>Distribution of leads by source for your team</CardDescription>
              </CardHeader>
              <CardContent>
                <LeadSourceChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Status Overview</CardTitle>
                <CardDescription>Current status of all leads in your team</CardDescription>
              </CardHeader>
              <CardContent>
                <LeadStatusChart />
              </CardContent>
            </Card>
          </div>

          {/* Individual PS Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Individual PS Performance
              </CardTitle>
              <CardDescription>
                Performance metrics for each PS team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PS Member</TableHead>
                    <TableHead>Total Leads</TableHead>
                    <TableHead>Qualified</TableHead>
                    <TableHead>Closed Won</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Avg Response Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPerformance.map((perf) => (
                    <TableRow key={perf.ps_user.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{perf.ps_user.full_name}</div>
                          <div className="text-sm text-gray-500">{perf.ps_user.username}</div>
                        </div>
                      </TableCell>
                      <TableCell>{perf.metrics.total_leads}</TableCell>
                      <TableCell>{perf.metrics.qualified_leads}</TableCell>
                      <TableCell>{perf.metrics.closed_won}</TableCell>
                      <TableCell>
                        <Badge variant={perf.metrics.conversion_rate > 15 ? "default" : "secondary"}>
                          {perf.metrics.conversion_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell>₹{perf.metrics.revenue.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {perf.metrics.avg_response_time}h
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={perf.metrics.conversion_rate > 15 ? "default" : "secondary"}>
                          {perf.metrics.conversion_rate > 15 ? "High Performer" : "Standard"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
