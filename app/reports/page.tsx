import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { LeadStatusChart } from "@/components/reports/lead-status-chart"
import { ConversionFunnelChart } from "@/components/reports/conversion-funnel-chart"
import { PerformanceMetrics } from "@/components/reports/performance-metrics"
import { TopPerformersTable } from "@/components/reports/top-performers-table"
import { LeadSourceChart } from "@/components/reports/lead-source-chart"
import { TrendingUp, Target, Award, Download } from "lucide-react"

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser?.user) redirect("/auth/login")

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, branch_id, branches(name, code)")
    .eq("id", currentUser.user.id)
    .single()

  if (!currentProfile) redirect("/auth/login")

  // Get date range (last 30 days by default)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  // Build queries based on user role
  let leadsQuery = supabase
    .from("leads")
    .select("*")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())

  let usersQuery = supabase.from("profiles").select("*")

  // Apply role-based filtering
  if (currentProfile.role === "branch_head" && currentProfile.branch_id) {
    leadsQuery = leadsQuery.eq("branch_id", currentProfile.branch_id)
    usersQuery = usersQuery.eq("branch_id", currentProfile.branch_id)
  } else if (!["admin", "branch_head"].includes(currentProfile.role)) {
    leadsQuery = leadsQuery.eq("assigned_to", currentUser.user.id)
  }

  const [{ data: leads }, { data: users }, { data: branches }] = await Promise.all([
    leadsQuery,
    usersQuery,
    currentProfile.role === "admin" ? supabase.from("branches").select("*") : Promise.resolve({ data: [] }),
  ])

  // Calculate key metrics
  const totalLeads = leads?.length || 0
  const newLeads = leads?.filter((lead) => lead.status === "new").length || 0
  const qualifiedLeads = leads?.filter((lead) => lead.status === "qualified").length || 0
  const closedWonLeads = leads?.filter((lead) => lead.status === "closed_won").length || 0
  const closedLostLeads = leads?.filter((lead) => lead.status === "closed_lost").length || 0
  const conversionRate = totalLeads > 0 ? Math.round((closedWonLeads / totalLeads) * 100) : 0

  // Calculate total value
  const totalValue = leads?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0
  const wonValue =
    leads?.filter((lead) => lead.status === "closed_won").reduce((sum, lead) => sum + (lead.value || 0), 0) || 0

  // Lead status distribution
  const statusDistribution = [
    { status: "New", count: newLeads, color: "#3B82F6" },
    { status: "Contacted", count: leads?.filter((lead) => lead.status === "contacted").length || 0, color: "#F59E0B" },
    { status: "Qualified", count: qualifiedLeads, color: "#10B981" },
    {
      status: "Proposal Sent",
      count: leads?.filter((lead) => lead.status === "proposal_sent").length || 0,
      color: "#8B5CF6",
    },
    {
      status: "Negotiation",
      count: leads?.filter((lead) => lead.status === "negotiation").length || 0,
      color: "#F97316",
    },
    { status: "Closed Won", count: closedWonLeads, color: "#059669" },
    { status: "Closed Lost", count: closedLostLeads, color: "#DC2626" },
    { status: "On Hold", count: leads?.filter((lead) => lead.status === "on_hold").length || 0, color: "#6B7280" },
  ]

  // Lead source distribution
  const sourceDistribution = [
    { source: "Website", count: leads?.filter((lead) => lead.source === "website").length || 0 },
    { source: "Referral", count: leads?.filter((lead) => lead.source === "referral").length || 0 },
    { source: "Social Media", count: leads?.filter((lead) => lead.source === "social_media").length || 0 },
    { source: "Advertisement", count: leads?.filter((lead) => lead.source === "advertisement").length || 0 },
    { source: "Cold Call", count: leads?.filter((lead) => lead.source === "cold_call").length || 0 },
    { source: "Email Campaign", count: leads?.filter((lead) => lead.source === "email_campaign").length || 0 },
    { source: "Trade Show", count: leads?.filter((lead) => lead.source === "trade_show").length || 0 },
    { source: "Other", count: leads?.filter((lead) => lead.source === "other").length || 0 },
  ].filter((item) => item.count > 0)

  return (
    <DashboardLayout>
      <RoleGuard requiredPermission={{ resource: "reports", action: "read" }}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600">
                {currentProfile.role === "admin"
                  ? "System-wide performance insights"
                  : currentProfile.role === "branch_head"
                    ? `${currentProfile.branches?.name} branch performance`
                    : "Your performance insights"}
              </p>
            </div>
            <div className="flex space-x-2">
              <Select defaultValue="30">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLeads}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversionRate}%</div>
                <p className="text-xs text-muted-foreground">Closed won rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Pipeline value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Won Value</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${wonValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Closed won value</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeadStatusChart data={statusDistribution} />
            <LeadSourceChart data={sourceDistribution} />
          </div>

          {/* Conversion Funnel */}
          <ConversionFunnelChart
            data={[
              { stage: "New Leads", count: newLeads, percentage: 100 },
              {
                stage: "Contacted",
                count: leads?.filter((lead) => lead.status === "contacted").length || 0,
                percentage:
                  totalLeads > 0
                    ? Math.round(
                        ((leads?.filter((lead) => lead.status === "contacted").length || 0) / totalLeads) * 100,
                      )
                    : 0,
              },
              {
                stage: "Qualified",
                count: qualifiedLeads,
                percentage: totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0,
              },
              {
                stage: "Proposal Sent",
                count: leads?.filter((lead) => lead.status === "proposal_sent").length || 0,
                percentage:
                  totalLeads > 0
                    ? Math.round(
                        ((leads?.filter((lead) => lead.status === "proposal_sent").length || 0) / totalLeads) * 100,
                      )
                    : 0,
              },
              { stage: "Closed Won", count: closedWonLeads, percentage: conversionRate },
            ]}
          />

          {/* Performance Metrics and Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceMetrics
              metrics={{
                averageDealSize: totalLeads > 0 ? Math.round(totalValue / totalLeads) : 0,
                averageTimeToClose: 0, // Would need to calculate from lead activities
                totalActivities: 0, // Would need to query lead_activities
                responseTime: 0, // Would need to calculate from activities
              }}
            />
            <TopPerformersTable users={users || []} leads={leads || []} />
          </div>

          {/* Branch Performance (Admin only) */}
          {currentProfile.role === "admin" && branches && branches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Branch Performance</CardTitle>
                <CardDescription>Performance comparison across all branches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {branches.map((branch) => {
                    const branchLeads = leads?.filter((lead) => lead.branch_id === branch.id) || []
                    const branchWonLeads = branchLeads.filter((lead) => lead.status === "closed_won")
                    const branchConversion =
                      branchLeads.length > 0 ? Math.round((branchWonLeads.length / branchLeads.length) * 100) : 0

                    return (
                      <div key={branch.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h4 className="font-medium">{branch.name}</h4>
                            <p className="text-sm text-gray-500">{branch.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-lg font-bold">{branchLeads.length}</div>
                            <div className="text-xs text-gray-500">Leads</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{branchWonLeads.length}</div>
                            <div className="text-xs text-gray-500">Won</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{branchConversion}%</div>
                            <div className="text-xs text-gray-500">Conversion</div>
                          </div>
                          <Badge
                            variant={
                              branchConversion >= 20 ? "default" : branchConversion >= 10 ? "secondary" : "destructive"
                            }
                          >
                            {branchConversion >= 20
                              ? "Excellent"
                              : branchConversion >= 10
                                ? "Good"
                                : "Needs Improvement"}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </RoleGuard>
    </DashboardLayout>
  )
}
