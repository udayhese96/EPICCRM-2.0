'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react'

interface AnalyticsData {
  id: string
  metric: string
  value: number
  change: number
  period: string
  category: string
}

const SalesManagerAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [userBranch, setUserBranch] = useState<string | null>(null)

  // Get user's branch from localStorage on mount
  React.useEffect(() => {
    const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
    const parsed = session ? JSON.parse(session) : null
    const branch = parsed?.branch || null
    setUserBranch(branch)
    console.log('🏢 [Sales Manager Analytics] User branch:', branch)
  }, [])

  // Load analytics data
  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      const branch = parsed?.branch || ''

      if (!branch) {
        console.warn('⚠️ Sales Manager has no branch assigned!')
        setLoading(false)
        return
      }

      // For now, we'll use mock data. Later this will be replaced with actual API call
      const mockData: AnalyticsData[] = [
        {
          id: '1',
          metric: 'Total Leads Generated',
          value: 1250,
          change: 12.5,
          period: 'This Month',
          category: 'Leads'
        },
        {
          id: '2',
          metric: 'Conversion Rate',
          value: 18.5,
          change: 2.3,
          period: 'This Month',
          category: 'Performance'
        },
        {
          id: '3',
          metric: 'Team Performance Score',
          value: 87.2,
          change: -1.2,
          period: 'This Month',
          category: 'Performance'
        },
        {
          id: '4',
          metric: 'Approved Bookings',
          value: 156,
          change: 8.7,
          period: 'This Month',
          category: 'Bookings'
        },
        {
          id: '5',
          metric: 'Retail Sales',
          value: 89,
          change: 15.3,
          period: 'This Month',
          category: 'Sales'
        },
        {
          id: '6',
          metric: 'Pending Approvals',
          value: 23,
          change: -5.2,
          period: 'Current',
          category: 'Approvals'
        }
      ]

      setAnalyticsData(mockData)
      console.log(`✅ [Sales Manager Analytics] Loaded ${mockData.length} analytics metrics for branch: ${branch}`)
    } catch (error) {
      console.error('❌ Error loading analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const formatValue = (value: number, metric: string) => {
    if (metric.includes('Rate') || metric.includes('Score')) {
      return `${value}%`
    }
    return value.toLocaleString()
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />
    if (change < 0) return <TrendingUp className="w-4 h-4 rotate-180" />
    return null
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Leads':
        return 'bg-blue-100 text-blue-800'
      case 'Performance':
        return 'bg-green-100 text-green-800'
      case 'Bookings':
        return 'bg-purple-100 text-purple-800'
      case 'Sales':
        return 'bg-orange-100 text-orange-800'
      case 'Approvals':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-800">Sales Manager Analytics</h1>
                {userBranch && (
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-sm font-semibold">
                    📍 {userBranch}
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 text-lg">
                Comprehensive analytics and performance metrics for {userBranch ? `${userBranch} branch` : 'your branch'}
              </p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button 
                onClick={loadAnalyticsData}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </Button>
              <Button 
                variant="outline"
                className="px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Analytics Table */}
          <Card className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Performance Analytics
              </CardTitle>
              <CardDescription className="text-blue-100">
                Key performance indicators and metrics for sales team management
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading analytics data...</p>
                </div>
              ) : analyticsData.length === 0 ? (
                <div className="p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No Analytics Data
                  </h3>
                  <p className="text-gray-600">
                    No analytics data available at the moment.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left p-4 font-semibold text-gray-700">Metric</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Value</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Change</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Period</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Category</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-gray-800">{item.metric}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatValue(item.value, item.metric)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={`flex items-center gap-1 ${getChangeColor(item.change)}`}>
                              {getChangeIcon(item.change)}
                              <span className="font-semibold">
                                {item.change > 0 ? '+' : ''}{item.change}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-gray-600">{item.period}</div>
                          </td>
                          <td className="p-4">
                            <Badge className={getCategoryColor(item.category)}>
                              {item.category}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <BarChart3 className="w-3 h-3 mr-1" />
                                Details
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700">12</div>
                <p className="text-sm text-blue-600">Active team members</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Growth Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700">+15.3%</div>
                <p className="text-sm text-green-600">This month vs last month</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-700">45</div>
                <p className="text-sm text-purple-600">New leads generated</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default SalesManagerAnalytics
