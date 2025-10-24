'use client'

import React, { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import PsPerformanceTable from '@/components/analytics/PsPerformanceTable'
import TlPerformanceTable from '@/components/analytics/TlPerformanceTable'
import SourceAnalyticsTable from '@/components/analytics/SourceAnalyticsTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Users } from 'lucide-react'

const SalesManagerAnalytics = () => {
  const [activeTab, setActiveTab] = useState<'ps' | 'source'>('ps')

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Sales Manager Analytics</h1>
            <p className="text-gray-600 mt-2">Performance metrics and analytics for your branch</p>
          </div>

          {/* Toggle Bar */}
          <div className="bg-white rounded-lg border p-1 shadow-sm">
            <div className="flex space-x-1">
              <Button
                variant={activeTab === 'ps' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('ps')}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Users className="h-4 w-4" />
                PS Analytics
              </Button>
              <Button
                variant={activeTab === 'source' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('source')}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Source Analytics
              </Button>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'ps' && (
            <div className="space-y-6">
              <PsPerformanceTable />
              <TlPerformanceTable />
            </div>
          )}
          {activeTab === 'source' && (
            <div className="flex gap-2">
              <SourceAnalyticsTable />
              <div className="w-2/5">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <p>Additional analytics table will be displayed here</p>
                      <p className="text-sm mt-2">40% of page width</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default SalesManagerAnalytics
