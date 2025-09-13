"use client"

import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Upload, 
  UserPlus, 
  Edit, 
  Download, 
  Users, 
  Copy, 
  ArrowRightLeft,
  BarChart3,
  Shield,
  Rocket,
  Building2
} from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your CRM system and user access</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Welcome, admin</span>
            <Button variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>

        {/* Lead Management Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">LEAD MANAGEMENT</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Upload className="h-5 w-5 text-red-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Upload Data</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Import leads and customer data
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <UserPlus className="h-5 w-5 text-orange-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Assign Leads</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Distribute leads to team members
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Edit className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Manage Leads</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  View and edit lead information
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Download className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Export Leads</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Download lead data and reports
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Export Walk-in</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Download walk-in data by branch/date
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Copy className="h-5 w-5 text-pink-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Duplicate Leads</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Identify and manage duplicate entries
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Lead Transfer</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Transfer leads between team members
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* User Management Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">USER MANAGEMENT</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/manage-cre')}>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Manage CREs</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Configure Customer Relationship Executives
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/manage-ps')}>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserPlus className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Manage PS</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Configure Product Specialists
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Manage Branch Heads</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Configure branch leadership
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Manage Reception Users</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Configure reception staff
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analytics & Reports Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">ANALYTICS & REPORTS</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">View Analytics</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Comprehensive system analytics
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Rocket className="h-5 w-5 text-red-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Analytics 2.0</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Open Streamlit dashboard in a new tab
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Shield className="h-5 w-5 text-red-600" />
                  </div>
                  <CardTitle className="text-sm font-medium">Security Audit</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  System security and access logs
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
