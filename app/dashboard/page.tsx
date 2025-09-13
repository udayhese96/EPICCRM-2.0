"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Contact, Building2, TrendingUp } from "lucide-react"

interface User {
  username: string
  role: string
  first_name: string
  last_name: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("authToken")

      if (!token) {
        router.push("/auth/login")
        return
      }

      try {
        const response = await fetch("/api/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          localStorage.removeItem("authToken")
          router.push("/auth/login")
          return
        }

        const userData = await response.json()
        setUser(userData.user)
      } catch (error) {
        console.error("Auth verification failed:", error)
        localStorage.removeItem("authToken")
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const mockStats = {
    leads: user.role === "admin" ? 150 : user.role === "branch_head" ? 75 : 25,
    users: user.role === "admin" ? 45 : user.role === "branch_head" ? 12 : 0,
    branches: user.role === "admin" ? 8 : 0,
    conversionRate: "12.5%",
  }

  const mockRecentLeads = [
    {
      id: 1,
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      company: "Tech Corp",
      status: "new",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      first_name: "Jane",
      last_name: "Smith",
      email: "jane.smith@example.com",
      company: "Business Inc",
      status: "contacted",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "contacted":
        return "bg-yellow-100 text-yellow-800"
      case "qualified":
        return "bg-green-100 text-green-800"
      case "closed_won":
        return "bg-emerald-100 text-emerald-800"
      case "closed_lost":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {user.first_name} {user.last_name} ({user.role})
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Contact className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.leads}</div>
              <p className="text-xs text-muted-foreground">{user.role === "admin" ? "All leads" : "Your leads"}</p>
            </CardContent>
          </Card>

          {(user.role === "admin" || user.role === "branch_head") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.users}</div>
                <p className="text-xs text-muted-foreground">{user.role === "admin" ? "All users" : "Branch users"}</p>
              </CardContent>
            </Card>
          )}

          {user.role === "admin" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Branches</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.branches}</div>
                <p className="text-xs text-muted-foreground">Active branches</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.conversionRate}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Latest leads in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {lead.first_name} {lead.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">{lead.email}</p>
                    <p className="text-sm text-gray-500">{lead.company}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={getStatusColor(lead.status)}>{lead.status.replace("_", " ").toUpperCase()}</Badge>
                    <div className="text-sm text-gray-500">{new Date(lead.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
