'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface PsRankingData {
  rank: number
  ps_name: string
  won_leads: number
  booked_leads: number
}

interface PsRankingsProps {
  psRankings: PsRankingData[]
}

const PsRankings: React.FC<PsRankingsProps> = ({ psRankings }) => {
  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800' // Gold
    if (rank === 2) return 'bg-gray-100 text-gray-800'     // Silver
    if (rank === 3) return 'bg-orange-100 text-orange-800' // Bronze
    return 'bg-blue-100 text-blue-800' // Default
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  if (!psRankings || psRankings.length === 0) {
    return null
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">PS Rankings</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium py-2">Rank</TableHead>
                <TableHead className="text-xs font-medium py-2">PS Name</TableHead>
                <TableHead className="text-xs font-medium py-2 text-center">Won</TableHead>
                <TableHead className="text-xs font-medium py-2 text-center">Booked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {psRankings.map((ps) => (
                <TableRow key={ps.ps_name} className="hover:bg-gray-50">
                  <TableCell className="py-2">
                    <Badge className={`text-xs ${getRankBadgeColor(ps.rank)}`}>
                      {getRankIcon(ps.rank)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-2 font-medium">
                    {ps.ps_name}
                  </TableCell>
                  <TableCell className="text-xs py-2 text-center">
                    <span className="text-green-600 font-semibold">
                      {ps.won_leads}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs py-2 text-center">
                    <span className="text-blue-600 font-semibold">
                      {ps.booked_leads}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default PsRankings
