import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, TrendingUp, Target, Award } from "lucide-react"

export default async function TeamsPage() {
  const supabase = await createClient()

  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser?.user) redirect("/auth/login")

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, branch_id")
    .eq("id", currentUser.user.id)
    .single()

  if (!currentProfile) redirect("/auth/login")

  // Get team data based on user role
  let teamsQuery = supabase
    .from("branches")
    .select(`
      *,
      manager:profiles!branches_manager_id_fkey (
        first_name,
        last_name,
        email
      ),
      profiles (
        id,
        first_name,
        last_name,
        role,
        status
      )
    `)
    .eq("status", "active")
    .order("name")

  // Branch heads can only see their own branch
  if (currentProfile.role === "branch_head" && currentProfile.branch_id) {
    teamsQuery = teamsQuery.eq("id", currentProfile.branch_id)
  }

  const { data: teams } = await teamsQuery

  // Get performance metrics for each team
  const teamStats = await Promise.all(
    (teams || []).map(async (team) => {
      const [{ count: totalLeads }, { count: closedWonLeads }, { count: activeLeads }] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("branch_id", team.id),
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", team.id)
          .eq("status", "closed_won"),
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", team.id)
          .not("status", "in", "(closed_won,closed_lost)"),
      ])

      return {
        ...team,
        totalLeads: totalLeads || 0,
        closedWonLeads: closedWonLeads || 0,
        activeLeads: activeLeads || 0,
        conversionRate: totalLeads ? Math.round(((closedWonLeads || 0) / totalLeads) * 100) : 0,
      }
    }),
  )

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "branch_head":
        return "bg-purple-100 text-purple-800"
      case "cre":
        return "bg-blue-100 text-blue-800"
      case "ps":
        return "bg-green-100 text-green-800"
      case "receptionist":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <DashboardLayout>
      <RoleGuard requiredPermission={{ resource: "users", action: "read" }}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600">Overview of all teams and their performance</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {teamStats.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>
                        <Badge variant="outline">{team.code}</Badge>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{team.profiles?.length || 0}</div>
                      <div className="text-xs text-gray-500">Members</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Team Manager */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Team Manager</p>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {team.manager ? getInitials(team.manager.first_name, team.manager.last_name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {team.manager
                            ? `${team.manager.first_name} ${team.manager.last_name}`
                            : "No manager assigned"}
                        </p>
                        <p className="text-xs text-gray-500">{team.manager?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Target className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-blue-600">{team.totalLeads}</div>
                      <div className="text-xs text-gray-600">Total Leads</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <Award className="h-5 w-5 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-green-600">{team.conversionRate}%</div>
                      <div className="text-xs text-gray-600">Conversion</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-yellow-600">{team.activeLeads}</div>
                      <div className="text-xs text-gray-600">Active</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <Users className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-emerald-600">{team.closedWonLeads}</div>
                      <div className="text-xs text-gray-600">Won</div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Team Members</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {team.profiles?.map((member) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(member.first_name, member.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {member.first_name} {member.last_name}
                            </span>
                          </div>
                          <Badge className={getRoleColor(member.role)} variant="secondary">
                            {member.role.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">
                      {team.city}, {team.state}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!teams || teams.length === 0) && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Found</h3>
                <p className="text-gray-500">There are no teams to display at the moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </RoleGuard>
    </DashboardLayout>
  )
}
