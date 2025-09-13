"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Building, 
  TrendingUp, 
  Users,
  Calendar,
  Target,
  BarChart3,
  Filter,
  Download,
  Eye,
  Zap
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

export default function BranchHeadDashboard() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      setUser(JSON.parse(supabaseUser))
    }
  }, [])

  const userName = user?.first_name || user?.name || user?.username || "Branch Head"

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Branch Head Dashboard</h1>
                <p className="text-gray-600">Welcome back, {userName} | Branch: VANASTHALIPURAM</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sep 13, 2025, 10:03 PM</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">185</p>
                    <p className="text-lg font-semibold">Total Leads Generated</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm">129</p>
                    <p className="text-lg font-semibold">Pending Leads</p>
                  </div>
                  <Calendar className="h-8 w-8 text-amber-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-sm">40</p>
                    <p className="text-lg font-semibold">Won Leads</p>
                  </div>
                  <Target className="h-8 w-8 text-teal-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">16</p>
                    <p className="text-lg font-semibold">Lost Leads</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Eye className="h-4 w-4 mr-2" />
              Analytics Dashboard
            </Button>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              CRE Delivery Analytics
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Today's Follow-ups
            </Button>
            <Button variant="outline">
              <Target className="h-4 w-4 mr-2" />
              All Leads
            </Button>
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Fresh Leads
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Leads
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Manage PS
            </Button>
          </div>

          {/* Analytics Filter */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <CardTitle>Analytics Filter</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <Input type="date" defaultValue="2025-01-31" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <Input type="date" defaultValue="2025-09-13" />
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Filter className="h-4 w-4 mr-2" />
                  Apply Filter
                </Button>
                <Button variant="outline">Reset</Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Specialist Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Product Specialist Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-700">PRODUCT SPECIALIST</th>
                      <th className="text-left p-3 font-medium text-gray-700">LEADS ASSIGNED (PS_ASSIGNED_AT)</th>
                      <th className="text-left p-3 font-medium text-gray-700">LEADS CONTACTED (LEAD_STATUS NOT NULL)</th>
                      <th className="text-left p-3 font-medium text-gray-700">PSP_ASSIGNED - CONTACTED</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">H Kalyani</td>
                      <td className="p-3">21</td>
                      <td className="p-3">21</td>
                      <td className="p-3">0</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">Mohammed Huzefa</td>
                      <td className="p-3">30</td>
                      <td className="p-3">30</td>
                      <td className="p-3">0</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">Mohd Abdul Rehman</td>
                      <td className="p-3">19</td>
                      <td className="p-3">19</td>
                      <td className="p-3">0</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">Majjeeha Tazvella</td>
                      <td className="p-3">27</td>
                      <td className="p-3">24</td>
                      <td className="p-3">3</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">Mohammad Ali Khan</td>
                      <td className="p-3">20</td>
                      <td className="p-3">19</td>
                      <td className="p-3">1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Source-wise Leads Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span>Source-wise Leads Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-700">PRODUCT SPECIALIST</th>
                      <th className="text-left p-3 font-medium text-gray-700">TOTAL LEADS</th>
                      <th className="text-left p-3 font-medium text-gray-700">WON LEADS</th>
                      <th className="text-left p-3 font-medium text-gray-700">WIN RATE (%)</th>
                      <th className="text-left p-3 font-medium text-gray-700">RTL</th>
                      <th className="text-left p-3 font-medium text-gray-700">GOOGLE</th>
                      <th className="text-left p-3 font-medium text-gray-700">META</th>
                      <th className="text-left p-3 font-medium text-gray-700">GEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">H Kalyani</td>
                      <td className="p-3">21</td>
                      <td className="p-3">5</td>
                      <td className="p-3">23.8%</td>
                      <td className="p-3">
                        <span className="text-xs bg-blue-100 px-2 py-1 rounded">2 (4 won, 0.0%)</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-green-100 px-2 py-1 rounded">0 (0 won, 0.0%)</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-purple-100 px-2 py-1 rounded">19 (4 won, 21.1%)</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-orange-100 px-2 py-1 rounded">18 (7 won, 38.9%)</span>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">Mohammed Huzefa</td>
                      <td className="p-3">30</td>
                      <td className="p-3">1</td>
                      <td className="p-3">3.3%</td>
                      <td className="p-3">
                        <span className="text-xs bg-blue-100 px-2 py-1 rounded">2 (4 won, 200%)</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-green-100 px-2 py-1 rounded">0 (0 won, 0.0%)</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-purple-100 px-2 py-1 rounded">12 (2 won, 16.7%)</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-orange-100 px-2 py-1 rounded">16 (7 won, 43.8%)</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Walk-in Leads Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-indigo-600" />
                <span>Walk-in Leads Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-700">PRODUCT SPECIALIST</th>
                      <th className="text-left p-3 font-medium text-gray-700">TOTAL WALK-IN LEADS</th>
                      <th className="text-left p-3 font-medium text-gray-700">PENDING LEADS</th>
                      <th className="text-left p-3 font-medium text-gray-700">LOST LEADS</th>
                      <th className="text-left p-3 font-medium text-gray-700">WON LEADS</th>
                      <th className="text-left p-3 font-medium text-gray-700">TODAY'S FOLLOW-UPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">Majjeeha Tazvella</td>
                      <td className="p-3">15</td>
                      <td className="p-3">15</td>
                      <td className="p-3">0</td>
                      <td className="p-3">0</td>
                      <td className="p-3">0</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">Mohd Abdul Rehman</td>
                      <td className="p-3">23</td>
                      <td className="p-3">18</td>
                      <td className="p-3">0</td>
                      <td className="p-3">5</td>
                      <td className="p-3">0</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">H Kalyani</td>
                      <td className="p-3">11</td>
                      <td className="p-3">0</td>
                      <td className="p-3">1</td>
                      <td className="p-3">10</td>
                      <td className="p-3">0</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">Mohammad Ali Khan</td>
                      <td className="p-3">20</td>
                      <td className="p-3">9</td>
                      <td className="p-3">0</td>
                      <td className="p-3">0</td>
                      <td className="p-3">0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Product Specialist Follow-up Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span>Product Specialist Follow-up Summary</span>
                </CardTitle>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">From Date:</label>
                    <Input type="date" className="w-40" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">To Date:</label>
                    <Input type="date" className="w-40" />
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Apply Filter
                  </Button>
                  <Button variant="outline">Reset</Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
