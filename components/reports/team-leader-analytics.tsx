"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  Clock,
  DollarSign,
  Phone,
  UserCheck
} from 'lucide-react'

interface TeamAnalyticsProps {
  teamPerformance: {
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
  individualPerformance: Array<{
    ps_user: {
      id: string
      username: string
      full_name: string
      email: string
      branch: string
    }
    metrics: {
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
    recent_activities: Array<{
      id: string
      type: string
      description: string
      created_at: string
    }>
  }>
}

export function TeamLeaderAnalytics({ teamPerformance, individualPerformance }: TeamAnalyticsProps) {
  const topPerformer = individualPerformance.reduce((top, current) => 
    current.metrics.conversion_rate > top.metrics.conversion_rate ? current : top
  )

  const avgConversionRate = individualPerformance.length > 0 
    ? individualPerformance.reduce((sum, perf) => sum + perf.metrics.conversion_rate, 0) / individualPerformance.length
    : 0

  return (
    <div className="space-y-6">
      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamPerformance.conversion_rate}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {teamPerformance.conversion_rate > avgConversionRate ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  Above team average
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  Below team average
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{teamPerformance.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {teamPerformance.closed_won} closed deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Call Volume</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamPerformance.call_volume}</div>
            <p className="text-xs text-muted-foreground">
              {individualPerformance.length} active PS members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamPerformance.avg_response_time}h</div>
            <p className="text-xs text-muted-foreground">
              Team average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            PS Team Performance Comparison
          </CardTitle>
          <CardDescription>
            Individual performance metrics for your assigned PS team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {individualPerformance.map((perf) => (
              <div key={perf.ps_user.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{perf.ps_user.full_name}</h4>
                    <p className="text-sm text-gray-500">{perf.ps_user.username} • {perf.ps_user.branch}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{perf.metrics.conversion_rate}%</div>
                    <Badge variant={perf.metrics.conversion_rate > 15 ? "default" : "secondary"}>
                      {perf.metrics.conversion_rate > 15 ? "High Performer" : "Standard"}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Total Leads</div>
                    <div className="font-medium">{perf.metrics.total_leads}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Qualified</div>
                    <div className="font-medium">{perf.metrics.qualified_leads}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Closed Won</div>
                    <div className="font-medium">{perf.metrics.closed_won}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Revenue</div>
                    <div className="font-medium">₹{perf.metrics.revenue.toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Conversion Rate</span>
                    <span>{perf.metrics.conversion_rate}%</span>
                  </div>
                  <Progress 
                    value={perf.metrics.conversion_rate} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performer Highlight */}
      {topPerformer && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <UserCheck className="h-5 w-5 mr-2" />
              Top Performer
            </CardTitle>
            <CardDescription className="text-green-700">
              Highest conversion rate in your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-green-900">{topPerformer.ps_user.full_name}</h3>
                <p className="text-green-700">{topPerformer.ps_user.username} • {topPerformer.ps_user.branch}</p>
                <div className="mt-2 text-sm text-green-700">
                  <div>Conversion Rate: <span className="font-bold">{topPerformer.metrics.conversion_rate}%</span></div>
                  <div>Revenue Generated: <span className="font-bold">₹{topPerformer.metrics.revenue.toLocaleString()}</span></div>
                  <div>Total Leads: <span className="font-bold">{topPerformer.metrics.total_leads}</span></div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-green-600">{topPerformer.metrics.conversion_rate}%</div>
                <Badge className="bg-green-600 text-white">Best Performer</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Recent Team Activities
          </CardTitle>
          <CardDescription>
            Latest activities from your PS team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {individualPerformance.flatMap(perf => 
              perf.recent_activities.slice(0, 2).map(activity => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Phone className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{activity.description}</div>
                    <div className="text-sm text-gray-500">
                      {perf.ps_user.full_name} • {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="outline">{activity.type}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
