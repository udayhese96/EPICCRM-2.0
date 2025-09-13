"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TopPerformersTableProps {
  users: Array<{
    id: string
    first_name: string
    last_name: string
    role: string
  }>
  leads: Array<{
    id: string
    assigned_to: string | null
    status: string
    value: number | null
  }>
}

export function TopPerformersTable({ users, leads }: TopPerformersTableProps) {
  // Calculate performance metrics for each user
  const userPerformance = users
    .filter((user) => ["cre", "ps", "branch_head"].includes(user.role))
    .map((user) => {
      const userLeads = leads.filter((lead) => lead.assigned_to === user.id)
      const wonLeads = userLeads.filter((lead) => lead.status === "closed_won")
      const totalValue = wonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0)
      const conversionRate = userLeads.length > 0 ? Math.round((wonLeads.length / userLeads.length) * 100) : 0

      return {
        ...user,
        totalLeads: userLeads.length,
        wonLeads: wonLeads.length,
        totalValue,
        conversionRate,
      }
    })
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10)

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "branch_head":
        return "bg-purple-100 text-purple-800"
      case "cre":
        return "bg-blue-100 text-blue-800"
      case "ps":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
        <CardDescription>Highest performing team members by revenue</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Won</TableHead>
              <TableHead>Conversion</TableHead>
              <TableHead>Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userPerformance.map((user, index) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      {index < 3 && (
                        <Badge variant="secondary" className="text-xs">
                          #{index + 1}
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getRoleColor(user.role)}>{user.role.replace("_", " ").toUpperCase()}</Badge>
                </TableCell>
                <TableCell>{user.totalLeads}</TableCell>
                <TableCell className="text-green-600 font-medium">{user.wonLeads}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.conversionRate >= 20 ? "default" : user.conversionRate >= 10 ? "secondary" : "outline"
                    }
                  >
                    {user.conversionRate}%
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">${user.totalValue.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {userPerformance.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No performance data available yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
