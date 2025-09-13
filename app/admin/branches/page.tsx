import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { Building2, Edit, Users } from "lucide-react"

export default async function BranchesPage() {
  const supabase = await createClient()

  // Check if user is admin
  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser?.user) redirect("/auth/login")

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", currentUser.user.id).single()

  if (!currentProfile || currentProfile.role !== "admin") {
    redirect("/dashboard")
  }

  // Get branches with user counts
  const { data: branches } = await supabase
    .from("branches")
    .select(`
      *,
      profiles (count)
    `)
    .order("created_at", { ascending: false })

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
      <RoleGuard requiredRole="admin" route="/admin/branches">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
              <p className="text-gray-600">Manage company branches and locations</p>
            </div>
            <Button asChild>
              <Link href="/admin/branches/add">
                <Building2 className="h-4 w-4 mr-2" />
                Add Branch
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Branches</CardTitle>
              <CardDescription>{branches?.length || 0} branches in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches?.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{branch.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {branch.city}, {branch.state}
                          </div>
                          <div className="text-gray-500">{branch.address}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{branch.phone}</div>
                          <div className="text-gray-500">{branch.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{branch.profiles?.[0]?.count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(branch.status)}>{branch.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/branches/${branch.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
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
