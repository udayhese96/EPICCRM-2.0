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
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState({
    leads: 0,
    users: 0,
    branches: 0,
    conversionRate: "0%"
  })

  // Check if user is authenticated and has a role
  useEffect(() => {
    const checkAuth = () => {
      const supabaseUserRaw = localStorage.getItem('supabase_user')
      if (supabaseUserRaw) {
        const user = JSON.parse(supabaseUserRaw)
        if (user.role && user.role !== 'admin') {
          // Redirect role-based users to their specific dashboards
          const roleRoutes: { [key: string]: string } = {
            'receptionist': '/receptionist/dashboard',
            'ps': '/ps/dashboard',
            'cre': '/cre/dashboard',
            'team_leader': '/team-leader-dashboard',
            'cre_team_leader': '/cre-team-leader/dashboard',
            'cre_icrop': '/cre-icrop/dashboard',
            'branch_head': '/branch-head/dashboard',
            'sales_manager': '/sales-manager/dashboard'
          }
          const redirectUrl = roleRoutes[user.role]
          if (redirectUrl) {
            console.log(`🔄 Redirecting ${user.role} to ${redirectUrl}`)
            window.location.href = redirectUrl
            return
          }
        }
        // If user is admin or no role, continue to show main dashboard
        setUser(user)
      }
      setLoading(false)
    }

    checkAuth()
  }, [])
  const router = useRouter()

  const fetchDashboardData = async () => {
    if (!user || user.role !== 'admin') {
      return // Only load data for admin users
    }

    try {
      const supabaseUserRaw = localStorage.getItem('supabase_user')
      const supabaseToken = supabaseUserRaw ? (JSON.parse(supabaseUserRaw)?.access_token || null) : null
      const token = supabaseToken || localStorage.getItem('token') || localStorage.getItem('access_token')
      
      // Fetch leads statistics
      const leadsResponse = await fetch('/api/leads/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json()
        setDashboardStats(prev => ({
          ...prev,
          leads: leadsData.total_leads || 0,
          conversionRate: `${leadsData.conversion_rate || 0}%`
        }))
      }

      // Fetch recent leads (first 5)
      const recentResponse = await fetch('/api/leads?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        setRecentLeads(recentData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  // Authentication check effect
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check for new session format first
        const supabaseUser = localStorage.getItem("supabase_user")
        const legacyToken = localStorage.getItem("access_token")
        const legacyUser = localStorage.getItem("user")

        if (supabaseUser) {
          const u = JSON.parse(supabaseUser)
          console.log("✅ Dashboard loaded for user (supabase):", u)
          // Redirect users to their appropriate dashboards
          if (u?.role === 'admin') {
            router.push('/admin/dashboard')
            return
          }
          if (u?.role === 'team_leader') {
            router.push('/team-leader-dashboard')
            return
          }
          setUser(u)
        } else if (legacyToken && legacyUser) {
          const u = JSON.parse(legacyUser)
          console.log("✅ Dashboard loaded for user (legacy):", u)
          if (u?.role === 'admin') {
            router.push('/admin/dashboard')
            return
          }
          if (u?.role === 'team_leader') {
            router.push('/team-leader-dashboard')
            return
          }
          setUser(u)
        } else {
          console.log("❌ No session found, redirecting to login")
          router.push("/auth/login")
          return
        }
      } catch (error) {
        console.error("Auth verification failed:", error)
        localStorage.removeItem("access_token")
        localStorage.removeItem("user")
        localStorage.removeItem("supabase_user")
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Dashboard data fetching effect
  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

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
              <div className="text-2xl font-bold">{dashboardStats.leads || mockStats.leads}</div>
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
              <div className="text-2xl font-bold">{dashboardStats.conversionRate || mockStats.conversionRate}</div>
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
              {recentLeads.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No recent leads</div>
              ) : (
                recentLeads.map((lead) => (
                  <div key={lead.uid} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {lead.customer_name}
                      </h4>
                      <p className="text-sm text-gray-600">{lead.customer_mobile_number}</p>
                      <p className="text-sm text-gray-500">{lead.source}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(lead.lead_status || 'new')}>
                        {(lead.lead_status || 'New').replace("_", " ").toUpperCase()}
                      </Badge>
                      <div className="text-sm text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

