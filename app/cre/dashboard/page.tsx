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
  Phone,
  User
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

export default function CREDashboard() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      setUser(JSON.parse(supabaseUser))
    }
  }, [])

  const userName = user?.first_name || user?.name || user?.username || "Kumari"

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <User className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CRE Dashboard</h1>
                <p className="text-gray-600">Welcome back, {userName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="bg-blue-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Fresh Leads</p>
                    <p className="text-3xl font-bold">633</p>
                    <div className="flex items-center space-x-1 mt-2">
                      <Badge variant="secondary" className="bg-blue-600 text-white text-xs">16</Badge>
                      <Badge variant="secondary" className="bg-blue-400 text-white text-xs">613</Badge>
                      <Badge variant="secondary" className="bg-blue-600 text-white text-xs">4</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-amber-100 text-sm">Today's Follow-ups</p>
                  <p className="text-3xl font-bold">308</p>
                  <Calendar className="h-6 w-6 mx-auto mt-2 text-amber-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-teal-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-teal-100 text-sm">Pending Leads</p>
                  <p className="text-3xl font-bold">328</p>
                  <AlertCircle className="h-6 w-6 mx-auto mt-2 text-teal-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-600 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-emerald-100 text-sm">Assigned to PS</p>
                  <p className="text-3xl font-bold">267</p>
                  <Users className="h-6 w-6 mx-auto mt-2 text-emerald-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-600 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-green-100 text-sm">Won Leads</p>
                  <p className="text-3xl font-bold">53</p>
                  <Trophy className="h-6 w-6 mx-auto mt-2 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-red-100 text-sm">Lost Leads</p>
                  <p className="text-3xl font-bold">665</p>
                  <X className="h-6 w-6 mx-auto mt-2 text-red-200" />
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
              <Users className="h-4 w-4 mr-2" />
              PS Assigned
            </Button>
            <Button variant="outline">
              <Trophy className="h-4 w-4 mr-2" />
              Won/Lost Leads
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Event Leads
            </Button>
          </div>

          {/* Fresh Leads Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Fresh Leads (633)</CardTitle>
                </div>
                <div className="flex items-center space-x-3">
                  <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                    <option>All Time</option>
                    <option>Today</option>
                    <option>This Week</option>
                  </select>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input 
                      placeholder="Search by UID, name..." 
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button size="sm" variant="outline">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Status Tabs */}
              <div className="flex space-x-2 mb-4">
                <Badge variant="secondary" className="bg-gray-100">
                  Untouched <span className="ml-1 bg-gray-300 px-1 rounded">16</span>
                </Badge>
                <Badge variant="secondary" className="bg-gray-100">
                  Called <span className="ml-1 bg-gray-300 px-1 rounded">613</span>
                </Badge>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  Follow Up <span className="ml-1 bg-amber-300 px-1 rounded">4</span>
                </Badge>
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-700">ACTION</th>
                      <th className="text-left p-3 font-medium text-gray-700">LEAD STATUS</th>
                      <th className="text-left p-3 font-medium text-gray-700">CALL STATS</th>
                      <th className="text-left p-3 font-medium text-gray-700">CUSTOMER NAME</th>
                      <th className="text-left p-3 font-medium text-gray-700">MOBILE</th>
                      <th className="text-left p-3 font-medium text-gray-700">SOURCE</th>
                      <th className="text-left p-3 font-medium text-gray-700">CAMPAIGN</th>
                      <th className="text-left p-3 font-medium text-gray-700">DATE</th>
                      <th className="text-left p-3 font-medium text-gray-700">UID</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white">
                          Update
                        </Button>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">Pending</Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600">No calls</td>
                      <td className="p-3 font-medium">Mohd kaleemuddin</td>
                      <td className="p-3">9133716742</td>
                      <td className="p-3">META</td>
                      <td className="p-3">Scratch And Win</td>
                      <td className="p-3 text-sm">2025-09-12</td>
                      <td className="p-3 text-sm font-mono">MK-6742-3632</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white">
                          Update
                        </Button>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">Pending</Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600">No calls</td>
                      <td className="p-3 font-medium">Nani Nani</td>
                      <td className="p-3">9618140460</td>
                      <td className="p-3">META</td>
                      <td className="p-3">New 450x Video</td>
                      <td className="p-3 text-sm">2025-09-12</td>
                      <td className="p-3 text-sm font-mono">MU-0460-3649</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
