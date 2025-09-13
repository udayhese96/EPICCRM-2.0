"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  BarChart3, 
  Star,
  Calendar,
  Users,
  Trophy,
  AlertCircle,
  Search,
  X,
  CheckCircle,
  UserCheck,
  Building
} from "lucide-react"
import { useState, useEffect } from "react"

interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  name?: string
  role: string
}

export default function PSDashboard() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      setUser(JSON.parse(supabaseUser))
    }
  }, [])

  const userName = user?.first_name || user?.name || user?.username || "Mohan"

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Welcome Banner */}
        <div className="bg-teal-50 border-l-4 border-teal-400 p-4 mx-6 mt-6 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-teal-400 mr-2" />
              <p className="text-teal-700 font-medium">Welcome! Logged in as PS</p>
            </div>
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Product Specialist Dashboard</h1>
                <p className="text-gray-600">Welcome, {userName} | Branch: VANASTHALIPURAM</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Walk-in Lead
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-red-500 text-white">
              <CardContent className="p-4">
                <div>
                  <p className="text-red-100 text-sm">Fresh Leads</p>
                  <p className="text-4xl font-bold">2</p>
                  <div className="flex items-center space-x-1 mt-3">
                    <Badge variant="secondary" className="bg-red-600 text-white text-xs">0</Badge>
                    <Badge variant="secondary" className="bg-red-400 text-white text-xs">2</Badge>
                    <Badge variant="secondary" className="bg-red-600 text-white text-xs">0</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-amber-100 text-sm font-medium">17</p>
                  <p className="text-2xl font-bold">TODAY'S</p>
                  <p className="text-lg font-semibold">FOLLOW-UPS</p>
                  <CheckCircle className="h-6 w-6 mx-auto mt-2 text-amber-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-teal-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">43</p>
                  <p className="text-lg font-semibold">PENDING</p>
                  <p className="text-lg font-semibold">LEADS</p>
                  <CheckCircle className="h-6 w-6 mx-auto mt-2 text-teal-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-cyan-600 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">12</p>
                  <p className="text-lg font-semibold">WON LEADS</p>
                  <Trophy className="h-8 w-8 mx-auto mt-2 text-cyan-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">37</p>
                  <p className="text-lg font-semibold">LOST LEADS</p>
                  <X className="h-8 w-8 mx-auto mt-2 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <Button variant="default" className="bg-gray-900 text-white">
              <Star className="h-4 w-4 mr-2" />
              Fresh Leads
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Today's Follow-ups
            </Button>
            <Button variant="outline">
              <AlertCircle className="h-4 w-4 mr-2" />
              Pending Leads
            </Button>
            <Button variant="outline">
              <Trophy className="h-4 w-4 mr-2" />
              Won/Lost
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Event Leads
            </Button>
            <Button variant="outline">
              <Building className="h-4 w-4 mr-2" />
              Walkin Leads
            </Button>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center space-x-3">
            <Button className="bg-red-500 hover:bg-red-600 text-white">
              All Time
            </Button>
            <Button variant="outline" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Fresh Leads Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Fresh Leads (2)</CardTitle>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input 
                    placeholder="Search by UID, name..." 
                    className="pl-10 w-64"
                  />
                  <Button size="sm" variant="outline" className="ml-2">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Status Tabs */}
              <div className="flex space-x-2 mb-6">
                <Badge variant="secondary" className="bg-gray-100">
                  Untouched <span className="ml-1 bg-gray-300 px-1 rounded">0</span>
                </Badge>
                <Badge variant="secondary" className="bg-gray-100">
                  Called <span className="ml-1 bg-gray-300 px-1 rounded">2</span>
                </Badge>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  Follow Up <span className="ml-1 bg-amber-300 px-1 rounded">0</span>
                </Badge>
              </div>

              {/* No Leads Message */}
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No untouched leads</h3>
                <p className="text-gray-500">All your fresh leads have been processed.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
