'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    period: string
  }
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'
  subtitle?: string
  badge?: string
}

const colorClasses = {
  blue: {
    card: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
    icon: 'text-blue-200',
    title: 'text-blue-100'
  },
  green: {
    card: 'bg-gradient-to-r from-green-500 to-green-600 text-white',
    icon: 'text-green-200',
    title: 'text-green-100'
  },
  red: {
    card: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
    icon: 'text-red-200',
    title: 'text-red-100'
  },
  yellow: {
    card: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white',
    icon: 'text-yellow-200',
    title: 'text-yellow-100'
  },
  purple: {
    card: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white',
    icon: 'text-purple-200',
    title: 'text-purple-100'
  },
  orange: {
    card: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
    icon: 'text-orange-200',
    title: 'text-orange-100'
  }
}

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'blue', 
  subtitle,
  badge 
}: KPICardProps) {
  const colors = colorClasses[color]

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp className="h-4 w-4" />
    if (trend.value < 0) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-green-200'
    if (trend.value < 0) return 'text-red-200'
    return 'text-gray-200'
  }

  return (
    <Card className={colors.card}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className={`text-sm font-medium ${colors.title}`}>
                {title}
              </p>
              {badge && (
                <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-sm ${colors.title} mt-1`}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="text-sm font-medium">
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-xs opacity-75">
                  vs {trend.period}
                </span>
              </div>
            )}
          </div>
          <Icon className={`h-8 w-8 ${colors.icon}`} />
        </div>
      </CardContent>
    </Card>
  )
}


