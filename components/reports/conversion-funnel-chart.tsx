"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ConversionFunnelChartProps {
  data: Array<{
    stage: string
    count: number
    percentage: number
  }>
}

export function ConversionFunnelChart({ data }: ConversionFunnelChartProps) {
  const maxCount = Math.max(...data.map((item) => item.count))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Lead progression through the sales pipeline</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((stage, index) => {
            const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
            const isLast = index === data.length - 1

            return (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{stage.count}</span>
                    <span className="text-xs text-gray-500">({stage.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLast
                        ? "bg-green-500"
                        : index === 0
                          ? "bg-blue-500"
                          : index === 1
                            ? "bg-yellow-500"
                            : index === 2
                              ? "bg-orange-500"
                              : "bg-purple-500"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white mix-blend-difference">{stage.count} leads</span>
                  </div>
                </div>
                {index < data.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-400" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
