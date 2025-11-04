'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import PsPerformanceTable from '@/components/analytics/PsPerformanceTable'
import PsFollowupsTable from '@/components/analytics/PsFollowupsTable'
import TlPerformanceTable from '@/components/analytics/TlPerformanceTable'
import SourceAnalyticsTable from '@/components/analytics/SourceAnalyticsTable'
import KpiCards from '@/components/analytics/KpiCards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Users, Zap, RefreshCw, Download, TrendingUp, Activity, Award, Sparkles } from 'lucide-react'

interface KpiCardData {
  value: number
  percentage?: number
  label: string
}

interface KpiCardsData {
  total_leads: KpiCardData
  untouched: KpiCardData
  open_leads: KpiCardData
  lost_leads: KpiCardData
  won_leads: KpiCardData
}

const SalesManagerAnalytics = () => {
  const [activeTab, setActiveTab] = useState<'ps' | 'source'>('ps')
  const [kpiCards, setKpiCards] = useState<KpiCardsData | null>(null)
  const [kpiLoading, setKpiLoading] = useState(true)
  const [userBranch, setUserBranch] = useState<string | null>(null)

  // Get user's branch from localStorage on mount
  useEffect(() => {
    const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
    const parsed = session ? JSON.parse(session) : null
    const branchFromSession = parsed?.branch || null
    setUserBranch(branchFromSession)
  }, [])

  // Fetch KPI data
  const fetchKpiData = async () => {
    try {
      setKpiLoading(true)
      
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      const currentBranch = userBranch

      if (!currentBranch) {
        setKpiLoading(false)
        return
      }

      if (!token) {
        setKpiLoading(false)
        return
      }

      const response = await fetch(`/api/analytics/sales-manager/ps-performance?branch=${encodeURIComponent(currentBranch)}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setKpiCards(result.kpi_cards || null)
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error)
    } finally {
      setKpiLoading(false)
    }
  }

  useEffect(() => {
    if (userBranch) {
      fetchKpiData()
    }
  }, [userBranch])

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-orange-200/10 to-orange-300/10 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-to-br from-orange-100/15 to-orange-200/15 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-gradient-to-br from-blue-200/10 to-blue-300/10 rounded-full blur-lg"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-8">
          {/* Header */}
          <Card className="bg-white shadow-xl rounded-xl sm:rounded-2xl overflow-hidden border-0 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 opacity-90"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
            <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-8 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-white drop-shadow-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg sm:text-3xl font-bold text-white truncate drop-shadow-sm">Sales Manager Analytics</h1>
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 animate-pulse" />
                    </div>
                    <p className="text-xs sm:text-base text-orange-100 mt-0.5 sm:mt-1 hidden sm:block drop-shadow-sm">Performance metrics and analytics for your branch</p>
                    <p className="text-xs text-orange-100 mt-0.5 sm:hidden drop-shadow-sm">Branch performance</p>
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <Button 
                    onClick={fetchKpiData}
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-2 sm:px-4 backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              onClick={() => setActiveTab('ps')}
              size="sm"
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 shadow-md hover:shadow-lg ${
                activeTab === 'ps'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:border-orange-300'
              }`}
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">PS Analytics</span>
              <span className="sm:hidden ml-1">PS</span>
            </Button>
            <Button
              onClick={() => setActiveTab('source')}
              size="sm"
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 shadow-md hover:shadow-lg ${
                activeTab === 'source'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:border-orange-300'
              }`}
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Source Analytics</span>
              <span className="sm:hidden ml-1">Source</span>
            </Button>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'ps' && (
            <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              {/* KPI Cards - Mobile Optimized */}
              {kpiLoading ? (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-max">
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {[...Array(5)].map((_, index) => (
                        <Card key={index} className="bg-gray-100 animate-pulse p-2 border-0 shadow-md">
                          <div className="space-y-1">
                            <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ) : kpiCards ? (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-max">
                    <div className="transform transition-all duration-300 hover:scale-105">
                      <KpiCards kpiCards={kpiCards} />
                    </div>
                  </div>
                </div>
              ) : null}
              
              {/* Team Leader Analytics */}
              <div className="transform transition-all duration-300 hover:shadow-xl">
                <TlPerformanceTable />
              </div>
              
              {/* PS Performance Table */}
              <div className="transform transition-all duration-300 hover:shadow-xl">
                <PsPerformanceTable showKpiCards={false} />
              </div>

              {/* PS Followups Table */}
              <div className="transform transition-all duration-300 hover:shadow-xl">
                <PsFollowupsTable />
              </div>
            </div>
          )}
          {activeTab === 'source' && (
            <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="transform transition-all duration-300 hover:shadow-xl">
                <SourceAnalyticsTable />
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default SalesManagerAnalytics