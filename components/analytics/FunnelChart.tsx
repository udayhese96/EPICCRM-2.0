'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FunnelStage {
  name: string
  count: number
  percentage: number
  color: string
}

interface FunnelChartProps {
  title: string
  stages: FunnelStage[]
  className?: string
}

export function FunnelChart({ title, stages, className }: FunnelChartProps) {
  const maxCount = Math.max(...stages.map(stage => stage.count))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
            const dropPercentage = index > 0 
              ? ((stages[index - 1].count - stage.count) / stages[index - 1].count) * 100 
              : 0

            return (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{stage.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {stage.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{stage.count}</div>
                    {index > 0 && dropPercentage > 0 && (
                      <div className="text-xs text-red-500">
                        -{dropPercentage.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="relative">
                  <div 
                    className="h-8 rounded-lg transition-all duration-500 ease-out"
                    style={{ 
                      width: `${width}%`,
                      backgroundColor: stage.color
                    }}
                  >
                    <div className="h-full flex items-center justify-center text-white font-medium text-sm">
                      {stage.count > 0 && stage.count}
                    </div>
                  </div>
                  
                  {index < stages.length - 1 && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300"></div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {stages.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Pipeline:</span>
              <span className="font-semibold">{stages[0].count} leads</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Final Conversion:</span>
              <span className="font-semibold text-green-600">
                {stages[stages.length - 1].percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

