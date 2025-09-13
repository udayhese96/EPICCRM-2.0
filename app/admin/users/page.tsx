import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { UserPlus, Edit, Trash2 } from "lucide-react"

export default async function UsersPage() {
  const supabase = await createClient()

  // Check if user is admin or branch_head
  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser?.user) redirect("/auth/login")

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, branch_id")
    .eq("id", currentUser.user.id)
    .single()

  if (!currentProfile || !["admin", "branch_head"].includes(currentProfile.role)) {
    redirect("/dashboard")
  }

  // Get users based on role
  let usersQuery = supabase
    .from("profiles")
    .select(`
      *,
      branches (
        name,
        code
      )
    `)
    .order("created_at", { ascending: false })

  // Branch heads can only see users in their branch
  if (currentProfile.role === "branch_head") {
    usersQuery = usersQuery.eq("branch_id", currentProfile.branch_id)
  }

  const { data: users } = await usersQuery

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

  return (
    <DashboardLayout>
      <RoleGuard requiredPermission={{ resource: "users", action: "read" }} route="/admin/users">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600">Manage system users and their permissions</p>
            </div>
            <RoleGuard requiredPermission={{ resource: "users", action: "create" }} fallback={null}>
              <Button asChild>
                <Link href="/admin/users/add">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Link>
              </Button>
            </RoleGuard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{users?.length || 0} users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>{user.role.replace("_", " ").toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.branches ? `${user.branches.name} (${user.branches.code})` : "No Branch"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>{user.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <RoleGuard requiredPermission={{ resource: "users", action: "update" }} fallback={null}>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/admin/users/${user.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </RoleGuard>
                          <RoleGuard requiredRole="admin" fallback={null}>
                            {user.role !== "admin" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 bg-transparent"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </RoleGuard>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
    </DashboardLayout>
  )
}
