"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type CREUser = { id: string; name: string; username: string }
type Lead = {
  uid: string
  source?: string
  lead_status?: string
  final_status?: string
  created_at?: string
}

function PieChart({ data, size = 200, title }: { data: { label: string; value: number; color: string }[]; size?: number; title?: string }) {
  const sum = data.reduce((s, d) => s + (d.value || 0), 0)
  const total = sum || 1
  let cumulative = 0
  const radius = size / 2
  const center = size / 2
  const inner = radius * 0.6
  if (sum === 0) {
    return (
      <div className="flex items-center justify-center w-[200px] h-[200px] text-xs text-gray-500 bg-gray-50 rounded-md">
        No data
      </div>
    )
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}> 
      {data.map((d, i) => {
        const frac = d.value / total
        const start = cumulative * 2 * Math.PI
        const end = (cumulative + frac) * 2 * Math.PI
        cumulative += frac
        const x1 = center + radius * Math.sin(start)
        const y1 = center - radius * Math.cos(start)
        const x2 = center + radius * Math.sin(end)
        const y2 = center - radius * Math.cos(end)
        const largeArc = end - start > Math.PI ? 1 : 0
        const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
        return <path key={i} d={path} fill={d.color} />
      })}
      <circle cx={center} cy={center} r={inner} fill="white" />
      <text x={center} y={center - 4} textAnchor="middle" className="fill-gray-900" fontSize="16" fontWeight={700}>{sum}</text>
      <text x={center} y={center + 14} textAnchor="middle" className="fill-gray-500" fontSize="10">Total</text>
    </svg>
  )
}

function BarChart({ data, height = 200 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max = Math.max(1, ...data.map(d => d.value || 0))
  const barWidth = Math.max(28, Math.floor(600 / Math.max(1, data.length)))
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-xs text-gray-500 bg-gray-50 rounded-md">No data</div>
  }
  const palette = ["#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f87171", "#22d3ee", "#f472b6"]
  return (
    <div className="flex items-end gap-4 overflow-x-auto" style={{ height }}>
      {data.map((d, i) => {
        const topColor = palette[i % palette.length]
        const base = (d.color || "#2563eb").toString()
        return (
          <div key={d.label + i} className="flex flex-col items-center">
            <div
              className="rounded-md shadow-sm"
              style={{
                height: Math.max(8, (d.value / max) * (height - 48)),
                width: barWidth,
                background: `linear-gradient(180deg, ${topColor} 0%, ${base} 100%)`
              }}
              title={`${d.label}: ${d.value}`}
            />
            <div className="text-xs mt-2 max-w-[100px] text-center truncate" title={d.label}>{d.label}</div>
            <div className="text-[10px] text-gray-500">{d.value}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const [creUsers, setCreUsers] = useState<CREUser[]>([])
  const [perCreLeads, setPerCreLeads] = useState<Record<string, Lead[]>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        // Load all CRE users
        const usersResp = await fetch('/api/ps-users') // fallback if /api/cre-users not available
        let users: CREUser[] = []
        if (usersResp.ok) {
          users = (await usersResp.json()).map((u: any) => ({ id: u.id, name: u.name, username: u.username }))
        } else {
          const creResp = await fetch('/api/cre-users')
          if (creResp.ok) users = (await creResp.json()).map((u: any) => ({ id: u.id, name: u.name, username: u.username }))
        }
        setCreUsers(users)

        // For each CRE, fetch their assigned leads (public endpoint with query param for name or username)
        const results: Record<string, Lead[]> = {}
        await Promise.all(users.slice(0, 6).map(async (u) => {
          const qs = new URLSearchParams()
          if (u.name) qs.append('name', u.name)
          else if (u.username) qs.append('username', u.username)
          const resp = await fetch(`/api/cre-assigned?${qs.toString()}`)
          const data = resp.ok ? await resp.json() : []
          results[u.id] = (data || []).map((l: any) => ({
            uid: l.uid,
            source: l.source,
            lead_status: l.lead_status,
            final_status: l.final_status,
            created_at: l.created_at
          }))
        }))
        setPerCreLeads(results)
      } catch (e) {
        console.error('Failed loading analytics', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const overall = useMemo(() => {
    const all: Lead[] = Object.values(perCreLeads).flat()
    const byStatus: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    all.forEach(l => {
      const fs = (l.final_status || 'Pending').trim()
      byStatus[fs] = (byStatus[fs] || 0) + 1
      const src = (l.source || 'Unknown').trim()
      bySource[src] = (bySource[src] || 0) + 1
    })
    return { byStatus, bySource }
  }, [perCreLeads])

  const topCres = useMemo(() => {
    return creUsers.map(u => {
      const arr = perCreLeads[u.id] || []
      const booked = arr.filter(l => (l.final_status || '').toLowerCase() === 'booked').length
      const retailed = arr.filter(l => (l.final_status || '').toLowerCase() === 'retailed').length
      return { label: u.name || u.username, value: booked + retailed }
    }).sort((a, b) => b.value - a.value)
  }, [creUsers, perCreLeads])

  const statusPieData = useMemo(() => {
    const palette = ['#16a34a', '#2563eb', '#ef4444', '#f59e0b', '#64748b', '#0ea5e9', '#a78bfa']
    return Object.entries(overall.byStatus).map(([label, value], i) => ({ label, value: value as number, color: palette[i % palette.length] }))
  }, [overall])

  const sourcePieData = useMemo(() => {
    const palette = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f472b6']
    return Object.entries(overall.bySource).map(([label, value], i) => ({ label, value: value as number, color: palette[i % palette.length] }))
  }, [overall])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analytics</h1>
          {isLoading ? <Badge>Loading…</Badge> : <Badge variant="secondary">Updated</Badge>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Mix</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-8 items-center">
              <PieChart data={statusPieData} />
              <div className="text-sm space-y-2">
                {statusPieData.map(s => {
                  const total = statusPieData.reduce((a, b) => a + b.value, 0) || 1
                  const pct = Math.round((s.value / total) * 100)
                  return (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
                      <span className="min-w-[110px]">{s.label}</span>
                      <span className="text-gray-500">{s.value}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Source Mix</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-8 items-center">
              <PieChart data={sourcePieData} />
              <div className="text-sm space-y-2">
                {sourcePieData.map(s => {
                  const total = sourcePieData.reduce((a, b) => a + b.value, 0) || 1
                  const pct = Math.round((s.value / total) * 100)
                  return (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
                      <span className="min-w-[110px]">{s.label}</span>
                      <span className="text-gray-500">{s.value}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing CREs (Booked + Retailed)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={topCres.slice(0, 10)} />
          </CardContent>
        </Card>

        <Separator className="my-2" />
        <div className="text-xs text-gray-500">Note: Comparison uses assigned leads per CRE fetched from the API. Adjust metrics as needed.</div>
      </div>
    </DashboardLayout>
  )
}



