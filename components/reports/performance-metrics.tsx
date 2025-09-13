"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Clock, Activity, Timer } from "lucide-react"

interface PerformanceMetricsProps {
  metrics: {
    averageDealSize: number
    averageTimeToClose: number
    totalActivities: number
    responseTime: number
  }
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>Key performance indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Avg Deal Size</p>
              <p className="text-lg font-bold text-blue-600">${metrics.averageDealSize.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <Clock className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Avg Time to Close</p>
              <p className="text-lg font-bold text-green-600">{metrics.averageTimeToClose} days</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
            <Activity className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Total Activities</p>
              <p className="text-lg font-bold text-purple-600">{metrics.totalActivities}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
            <Timer className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-lg font-bold text-orange-600">{metrics.responseTime}h</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
