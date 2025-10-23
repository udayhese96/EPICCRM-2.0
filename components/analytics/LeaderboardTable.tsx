'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Award, Trophy, Medal } from 'lucide-react'

interface LeaderboardEntry {
  rank?: number
  name: string
  branch?: string
  metrics: {
    [key: string]: number | string
  }
  score?: number
  trend?: 'up' | 'down' | 'stable'
}

interface LeaderboardTableProps {
  title: string
  entries: LeaderboardEntry[]
  metricLabels: {
    [key: string]: string
  }
  showRank?: boolean
  maxEntries?: number
  className?: string
}

export function LeaderboardTable({ 
  title, 
  entries, 
  metricLabels, 
  showRank = true,
  maxEntries = 10,
  className 
}: LeaderboardTableProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return (
          <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">{rank}</span>
          </div>
        )
    }
  }

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-700'
    if (score >= 80) return 'bg-green-100 text-green-700'
    if (score >= 60) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↗</span>
      case 'down':
        return <span className="text-red-500">↘</span>
      case 'stable':
        return <span className="text-gray-500">→</span>
      default:
        return null
    }
  }

  const displayedEntries = entries.slice(0, maxEntries)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {title}
          {showRank && (
            <Badge variant="outline" className="text-xs">
              Top {maxEntries}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayedEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No data available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedEntries.map((entry, index) => (
              <div 
                key={entry.name} 
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  entry.rank === 1 ? 'bg-yellow-50 border border-yellow-200' :
                  entry.rank === 2 ? 'bg-gray-50 border border-gray-200' :
                  entry.rank === 3 ? 'bg-amber-50 border border-amber-200' :
                  'bg-gray-50/50 hover:bg-gray-100'
                }`}
              >
                {/* Rank */}
                {showRank && (
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(entry.rank || index + 1)}
                  </div>
                )}

                {/* Name and Branch */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {entry.name}
                    </h4>
                    {entry.trend && getTrendIcon(entry.trend)}
                  </div>
                  {entry.branch && (
                    <p className="text-sm text-gray-500">{entry.branch}</p>
                  )}
                </div>

                {/* Metrics */}
                <div className="flex gap-4">
                  {Object.entries(metricLabels).map(([key, label]) => (
                    <div key={key} className="text-right">
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className="font-semibold text-gray-900">
                        {typeof entry.metrics[key] === 'number' 
                          ? entry.metrics[key].toLocaleString()
                          : entry.metrics[key]
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {/* Score */}
                {entry.score !== undefined && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <Badge className={getPerformanceColor(entry.score)}>
                      {entry.score.toFixed(1)}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


