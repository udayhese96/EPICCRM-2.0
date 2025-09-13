import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { ArrowLeft, Edit, Users, MapPin, Phone, Mail, Building, TrendingUp } from "lucide-react"

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser?.user) redirect("/auth/login")

  // Get branch details
  const { data: branch } = await supabase
    .from("branches")
    .select(`
      *,
      manager:profiles!branches_manager_id_fkey (
        first_name,
        last_name,
        email
      )
    `)
    .eq("id", id)
    .single()

  if (!branch) {
    redirect("/admin/branches")
  }

  // Get branch users
  const { data: branchUsers } = await supabase
    .from("profiles")
    .select("*")
    .eq("branch_id", id)
    .order("created_at", { ascending: false })

  // Get branch leads
  const { data: branchLeads } = await supabase
    .from("leads")
    .select("*")
    .eq("branch_id", id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Get branch statistics
  const [{ count: totalUsers }, { count: totalLeads }, { count: activeLeads }, { count: closedWonLeads }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("branch_id", id),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("branch_id", id),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("branch_id", id)
        .not("status", "in", "(closed_won,closed_lost)"),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("branch_id", id).eq("status", "closed_won"),
    ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-yellow-100 text-yellow-800"
      case "suspended":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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

  return (
    <DashboardLayout>
      <RoleGuard requiredRole="admin">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/branches">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Branches
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{branch.name}</h1>
                <p className="text-gray-600">Branch Code: {branch.code}</p>
              </div>
            </div>
            <Button asChild>
              <Link href={`/admin/branches/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Branch
              </Link>
            </Button>
          </div>

          {/* Branch Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Active team members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground">All time leads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeLeads || 0}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalLeads ? Math.round(((closedWonLeads || 0) / totalLeads) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Closed won rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Branch Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Branch Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{branch.name}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Code</p>
                      <Badge variant="outline">{branch.code}</Badge>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <div className="font-medium">
                        <p>{branch.address}</p>
                        <p>
                          {branch.city}, {branch.state}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{branch.phone || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{branch.email || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-gray-500 mb-2">Status</p>
                    <Badge className={getStatusColor(branch.status)}>{branch.status.toUpperCase()}</Badge>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-2">Manager</p>
                    <p className="font-medium">
                      {branch.manager
                        ? `${branch.manager.first_name} ${branch.manager.last_name}`
                        : "No manager assigned"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Team Members */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>{branchUsers?.length || 0} team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.first_name} {user.last_name}
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(user.role)}>
                              {user.role.replace("_", " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(user.status)}>{user.status.toUpperCase()}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Recent Leads */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Leads</CardTitle>
                  <CardDescription>Latest leads from this branch</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {branchLeads?.map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{lead.company}</p>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={
                              lead.status === "new"
                                ? "bg-blue-100 text-blue-800"
                                : lead.status === "closed_won"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                            }
                          >
                            {lead.status.replace("_", " ").toUpperCase()}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">{new Date(lead.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}

                    {(!branchLeads || branchLeads.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No leads yet for this branch.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </RoleGuard>
    </DashboardLayout>
  )
}
