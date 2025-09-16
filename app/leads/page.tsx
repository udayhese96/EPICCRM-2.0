"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, Edit, Phone, Mail } from "lucide-react"
import Link from "next/link"

interface User {
  username: string
  role: string
  first_name: string
  last_name: string
}

interface Lead {
  uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  lead_status: string
  final_status: string
  cre_name?: string
  ps_name?: string
  created_at: string
  assigned: string
}

export default function LeadsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      // Check for new session format first
      const supabaseUser = localStorage.getItem("supabase_user")
      const legacyToken = localStorage.getItem("access_token")
      const legacyUser = localStorage.getItem("user")

      if (supabaseUser) {
        try {
          const userData = JSON.parse(supabaseUser)
          console.log("✅ Leads page loaded for user (supabase):", userData)
          setUser(userData)
        } catch (error) {
          console.error("Error parsing supabase user:", error)
          localStorage.removeItem("supabase_user")
          router.push("/auth/login")
        }
      } else if (legacyToken && legacyUser) {
        try {
          const userData = JSON.parse(legacyUser)
          console.log("✅ Leads page loaded for user (legacy):", userData)
          setUser(userData)
        } catch (error) {
          console.error("Error parsing legacy user:", error)
          localStorage.removeItem("access_token")
          localStorage.removeItem("user")
          router.push("/auth/login")
        }
      } else {
        console.log("❌ No auth data found, redirecting to login")
        router.push("/auth/login")
        return
      }
      
      setLoading(false)
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (user) {
      fetchLeads()
    }
  }, [user])

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token')
      const response = await fetch('/api/leads', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const leadsData = await response.json()
        // For admin dashboard, hide already-assigned leads
        const filtered = (user?.role === 'admin')
          ? (leadsData || []).filter((l: any) => String(l.assigned).toLowerCase() !== 'yes')
          : leadsData
        setLeads(filtered)
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLeadsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'qualified':
        return 'bg-green-100 text-green-800'
      case 'lost':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-600">Welcome {user.first_name} ({user.role.toUpperCase()})</p>
          </div>
          <Button asChild>
            <Link href="/leads/add">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Leads</CardDescription>
              <CardTitle className="text-2xl">{leads.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>New</CardDescription>
              <CardTitle className="text-2xl">
                {leads.filter(l => l.lead_status === 'New').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Assigned</CardDescription>
              <CardTitle className="text-2xl">
                {leads.filter(l => l.assigned === 'Yes').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unassigned</CardDescription>
              <CardTitle className="text-2xl">
                {leads.filter(l => l.assigned === 'No').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>Manage your leads and track their progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Loading leads...
                    </TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.uid}>
                      <TableCell className="font-medium">{lead.customer_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {lead.customer_mobile_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(lead.lead_status || 'New')}>
                          {lead.lead_status || 'New'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.assigned === 'Yes' ? (
                          <div className="text-sm">
                            <div className="text-green-600 font-medium">
                              ✓ {lead.cre_name || lead.ps_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {lead.cre_name ? 'CRE' : 'PS'}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{lead.source}</TableCell>
                      <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/leads/${lead.uid}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}