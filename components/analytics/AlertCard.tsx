'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react'

interface Alert {
  type: string
  count: number
  priority: 'high' | 'medium' | 'low'
  description?: string
  action?: string
}

interface AlertCardProps {
  title: string
  alerts: Alert[]
  onAction?: (alert: Alert) => void
  className?: string
}

const priorityConfig = {
  high: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeColor: 'bg-red-100 text-red-800'
  },
  medium: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeColor: 'bg-yellow-100 text-yellow-800'
  },
  low: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badgeColor: 'bg-green-100 text-green-800'
  }
}

export function AlertCard({ title, alerts, onAction, className }: AlertCardProps) {
  const getPriorityIcon = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig]
    const Icon = config.icon
    return <Icon className={`h-4 w-4 ${config.color}`} />
  }

  const getPriorityConfig = (priority: string) => {
    return priorityConfig[priority as keyof typeof priorityConfig]
  }

  const sortedAlerts = alerts.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          {title}
          <Badge variant="outline" className="text-xs">
            {alerts.length} alerts
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-sm">All good! No alerts at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAlerts.map((alert, index) => {
              const config = getPriorityConfig(alert.priority)
              return (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getPriorityIcon(alert.priority)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {alert.type}
                          </span>
                          <Badge className={config.badgeColor}>
                            {alert.count}
                          </Badge>
                        </div>
                        {alert.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {alert.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {alert.action && onAction && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAction(alert)}
                        className="text-xs"
                      >
                        {alert.action}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


