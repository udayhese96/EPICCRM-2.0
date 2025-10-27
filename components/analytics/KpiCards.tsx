'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface KpiCardData {
  value: number
  percentage?: number
  label: string
}

interface KpiCardsProps {
  kpiCards: {
    total_leads: KpiCardData
    untouched: KpiCardData
    open_leads: KpiCardData
    lost_leads: KpiCardData
    won_leads: KpiCardData
  }
}

const KpiCards: React.FC<KpiCardsProps> = ({ kpiCards }) => {
  const getCardColor = (cardKey: string) => {
    switch (cardKey) {
      case 'total_leads':
        return 'bg-blue-50 border-blue-200'
      case 'untouched':
        return 'bg-yellow-50 border-yellow-200'
      case 'open_leads':
        return 'bg-blue-50 border-blue-200'
      case 'lost_leads':
        return 'bg-red-50 border-red-200'
      case 'won_leads':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getValueColor = (cardKey: string) => {
    switch (cardKey) {
      case 'total_leads':
        return 'text-blue-600'
      case 'untouched':
        return 'text-yellow-600'
      case 'open_leads':
        return 'text-blue-600'
      case 'lost_leads':
        return 'text-red-600'
      case 'won_leads':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getPercentageColor = (cardKey: string) => {
    switch (cardKey) {
      case 'total_leads':
        return 'text-blue-500'
      case 'untouched':
        return 'text-yellow-500'
      case 'open_leads':
        return 'text-blue-500'
      case 'lost_leads':
        return 'text-red-500'
      case 'won_leads':
        return 'text-green-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="grid grid-cols-5 gap-2 mb-4">
      {Object.entries(kpiCards).map(([key, card]) => (
        <Card key={key} className={`${getCardColor(key)} transition-all hover:shadow-lg hover:scale-105 duration-300 p-2 border-0 shadow-md`}>
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-600 truncate">
              {card.label}
            </div>
            <div className="flex flex-col">
              <div className={`text-sm font-bold ${getValueColor(key)} drop-shadow-sm`}>
                {card.value.toLocaleString()}
              </div>
              {card.percentage !== undefined && (
                <div className={`text-xs font-medium ${getPercentageColor(key)}`}>
                  ({card.percentage}%)
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default KpiCards
