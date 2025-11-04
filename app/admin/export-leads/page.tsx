"use client"

import React from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type Lead = {
  uid: string
  customer_name: string
  customer_mobile_number: string
  source?: string
  sub_source?: string
  lead_status?: string
  final_status?: string
  lead_category?: string
  model_interested?: string
  variant?: string
  branch?: string
  cre_name?: string
  ps_name?: string
  trade_in?: string
  trade_in_make?: string
  trade_in_model?: string
  trade_in_year?: string
  created_at?: string
  walk_in_date?: string
}

const branchesHardcoded = ["Mount Road", "Vyasarpadi", "Cuddalore"]

// Shared column schema for perfect alignment
const COLUMN_CONFIG = [
  { key: 'uid', header: 'UID', width: '100px', align: 'left' as const, priority: 'high' as const },
  { key: 'customer_name', header: 'Customer', width: '160px', align: 'left' as const, priority: 'high' as const },
  { key: 'customer_mobile_number', header: 'Mobile', width: '120px', align: 'left' as const, priority: 'high' as const },
  { key: 'lead_status', header: 'Status', width: '200px', align: 'center' as const, priority: 'high' as const },
  { key: 'final_status', header: 'Final', width: '110px', align: 'center' as const, priority: 'medium' as const },
  { key: 'model_interested', header: 'Model', width: '160px', align: 'left' as const, priority: 'medium' as const },
  { key: 'variant', header: 'Variant', width: '100px', align: 'left' as const, priority: 'low' as const },
  { key: 'branch', header: 'Branch', width: '100px', align: 'center' as const, priority: 'low' as const },
  { key: 'cre_name', header: 'CRE', width: '90px', align: 'left' as const, priority: 'medium' as const },
  { key: 'ps_name', header: 'PS', width: '90px', align: 'left' as const, priority: 'medium' as const },
  { key: 'trade_in', header: 'Trade-in', width: '80px', align: 'center' as const, priority: 'low' as const },
  { key: 'created_at', header: 'Created', width: '110px', align: 'center' as const, priority: 'medium' as const }
] as const

// Status color mapping for badges
const getStatusBadgeVariant = (status: string | undefined) => {
  if (!status) return 'secondary'
  const lowerStatus = status.toLowerCase()
  if (lowerStatus.includes('pending')) return 'outline'
  if (lowerStatus.includes('qualified') || lowerStatus.includes('hot')) return 'default'
  if (lowerStatus.includes('lost') || lowerStatus.includes('dead')) return 'destructive'
  return 'secondary'
}

function exportToCsv(rows: Lead[]) {
  const headers = [
    'Lead UID','Customer Name','Mobile','Source','Sub Source','Lead Status','Final Status','Category','Model','Variant','Branch','CRE','PS','Trade-in','Make','Model','Year','Created','Walk-in Date'
  ]
  const lines = rows.map(r => [
    r.uid, r.customer_name, r.customer_mobile_number, r.source || '', r.sub_source || '', r.lead_status || '', r.final_status || '', r.lead_category || '', r.model_interested || '', r.variant || '', r.branch || '', r.cre_name || '', r.ps_name || '', r.trade_in || '', r.trade_in_make || '', r.trade_in_model || '', r.trade_in_year || '', r.created_at || '', r.walk_in_date || ''
  ])
  const csv = [headers, ...lines].map(row => row.map(field => {
    const v = String(field ?? '')
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}` : v
  }).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads_export_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportLeadsPage() {
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [loading, setLoading] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [branch, setBranch] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [tradeIn, setTradeIn] = React.useState('')
  const [options, setOptions] = React.useState<{ status: string[]; category: string[]; branch: string[]; trade_in: string[]; model: string[] }>({ status: [], category: [], branch: [], trade_in: [], model: [] })
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')
  const [source, setSource] = React.useState('')

  const load = async () => {
    setLoading(true)
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (branch) params.set('branch', branch)
      if (status) params.set('status', status)
      if (category) params.set('category', category)
      if (tradeIn) params.set('trade_in', tradeIn)
      if (source) params.set('source', source)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      params.set('_t', `${Date.now()}`)
      const resp = await fetch(`/api/leads?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
      const data = await resp.json()
      const rows: Lead[] = Array.isArray(data) ? data : (data.leads || [])
      setLeads(rows)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])
  React.useEffect(() => {
    // Load distinct filter options
    const fetchDistinct = async () => {
      try {
        const resp = await fetch('/api/leads/distinct?_t=' + Date.now(), { cache: 'no-store' })
        if (resp.ok) {
          const data = await resp.json()
          setOptions({
            status: Array.isArray(data.status) ? data.status : [],
            category: Array.isArray(data.category) ? data.category : [],
            branch: (Array.isArray(data.branch) && data.branch.length > 0) ? data.branch : branchesHardcoded,
            trade_in: Array.isArray(data.trade_in) ? data.trade_in : [],
            model: Array.isArray(data.model) ? data.model : [],
            ...(data.source ? { source: data.source } : {} as any),
          })
        } else {
          setOptions(prev => ({ ...prev, branch: branchesHardcoded }))
        }
      } catch {
        setOptions(prev => ({ ...prev, branch: branchesHardcoded }))
      }
    }
    fetchDistinct()
  }, [])

  const filtered = leads

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Export Leads
            </h1>
            <Button 
              onClick={() => exportToCsv(filtered)} 
              disabled={filtered.length === 0}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg rounded-xl px-6"
            >
              Export CSV
            </Button>
          </div>

          <Card className="border-orange-200 shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-2xl">
              <CardTitle className="text-orange-800">Filters</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                <div className="space-y-2 min-w-0">
                  <Label className="text-orange-700 font-medium">Search</Label>
                  <Input 
                    placeholder="Name, mobile, UID..." 
                    value={q} 
                    onChange={e => setQ(e.target.value)}
                    className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl w-full"
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-orange-700 font-medium">Source</Label>
                  <Select value={source || 'all'} onValueChange={(v) => setSource(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl w-full max-w-full">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-50 max-w-xs">
                      <SelectItem value="all">Any</SelectItem>
                      {(options as any)?.source?.map?.((s: string) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-orange-700 font-medium">Branch</Label>
                  <Select value={branch || 'all'} onValueChange={(v) => setBranch(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl w-full max-w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-50 max-w-xs">
                      <SelectItem value="all">All</SelectItem>
                    {options.branch.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-orange-700 font-medium">Status</Label>
                  <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl w-full max-w-full">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-50 max-w-sm min-w-max">
                    {['all', ...options.status].map(s => (
                        <SelectItem key={s} value={s} className="text-sm whitespace-normal break-words">
                          {s === 'all' ? 'Any' : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-orange-700 font-medium">Category</Label>
                  <Select value={category || 'all'} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl w-full max-w-full">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-50 max-w-xs">
                    {['all', ...options.category].map(c => (
                        <SelectItem key={c} value={c}>{c === 'all' ? 'Any' : c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-orange-700 font-medium">Trade-in</Label>
                  <Select value={tradeIn || 'all'} onValueChange={(v) => setTradeIn(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl w-full max-w-full">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-50 max-w-xs">
                    {['all', ...options.trade_in].map(t => (
                        <SelectItem key={t} value={t}>{t === 'all' ? 'Any' : t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-orange-700 font-medium">From</Label>
                  <Input 
                    type="date" 
                    value={fromDate} 
                    onChange={e => setFromDate(e.target.value)}
                    className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl w-full max-w-full"
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-orange-700 font-medium">To</Label>
                  <Input 
                    type="date" 
                    value={toDate} 
                    onChange={e => setToDate(e.target.value)}
                    className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl w-full max-w-full"
                  />
                </div>
                <div className="flex items-end min-w-0">
                  <Button 
                    onClick={load} 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl"
                  >
                    {loading ? 'Loading...' : 'Apply'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
              <CardTitle className="text-orange-800">Results ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Responsive table wrapper */}
              <div className="leads-table-wrapper">
                <table className="leads-table">
                  {/* Column group for locked widths */}
                  <colgroup>
                    {COLUMN_CONFIG.map(col => (
                      <col key={col.key} style={{ width: col.width }} />
                    ))}
                  </colgroup>
                  
                  {/* Sticky header */}
                  <thead className="leads-table-header">
                    <tr>
                      {COLUMN_CONFIG.map(col => (
                        <th 
                          key={col.key}
                          className={`leads-table-th leads-table-th-${col.align} priority-${col.priority}`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  {/* Table body */}
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td 
                          colSpan={COLUMN_CONFIG.length} 
                          className="leads-table-empty"
                        >
                          {loading ? 'Loading leads...' : 'No leads found with current filters'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((lead, idx) => (
                        <tr key={lead.uid} className="leads-table-row">
                          <td className="leads-table-td leads-table-td-left priority-high">
                            <div className="leads-table-cell-content" title={lead.uid}>
                              <span className="font-medium text-orange-900">
                                {lead.uid}
                              </span>
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-left priority-high">
                            <div className="leads-table-cell-content" title={lead.customer_name}>
                              {lead.customer_name}
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-left priority-high">
                            <div className="leads-table-cell-content" title={lead.customer_mobile_number}>
                              {lead.customer_mobile_number}
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-center leads-table-td-status priority-high">
                            <div className="leads-table-cell-content" title={lead.lead_status}>
                              <div className="leads-table-badge-container">
                                <Badge 
                                  variant={getStatusBadgeVariant(lead.lead_status)}
                                  className="leads-table-badge leads-table-badge-wrap"
                                >
                                  {lead.lead_status || '-'}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-center leads-table-td-status priority-medium">
                            <div className="leads-table-cell-content" title={lead.final_status}>
                              <div className="leads-table-badge-container">
                                <Badge 
                                  variant={getStatusBadgeVariant(lead.final_status)}
                                  className="leads-table-badge leads-table-badge-wrap"
                                >
                                  {lead.final_status || '-'}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-left leads-table-td-model priority-medium">
                            <div className="leads-table-cell-content" title={lead.model_interested}>
                              <div className="leads-table-model-content">
                                {lead.model_interested || '-'}
                              </div>
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-left priority-low">
                            <div className="leads-table-cell-content" title={lead.variant}>
                              {lead.variant || '-'}
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-center priority-low">
                            <div className="leads-table-cell-content" title={lead.branch}>
                              {lead.branch || '-'}
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-left priority-medium">
                            <div className="leads-table-cell-content" title={lead.cre_name}>
                              {lead.cre_name || '-'}
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-left priority-medium">
                            <div className="leads-table-cell-content" title={lead.ps_name}>
                              {lead.ps_name || '-'}
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-center priority-low">
                            <div className="leads-table-cell-content" title={lead.trade_in}>
                              {lead.trade_in || '-'}
                            </div>
                          </td>
                          <td className="leads-table-td leads-table-td-center priority-medium">
                            <div className="leads-table-cell-content" title={lead.created_at}>
                              <span className="text-gray-600 text-sm">
                                {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Responsive table styles */}
      <style jsx>{`
        .leads-table-wrapper {
          max-height: 70vh;
          overflow-x: auto;
          overflow-y: auto;
          border: 1px solid rgb(254 215 170); /* orange-200 */
          border-radius: 0.75rem; /* rounded-xl */
        }

        .leads-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          min-width: 1200px;
        }

        .leads-table-header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: linear-gradient(to right, rgb(255 237 213), rgb(254 243 199)); /* orange-100 to amber-100 */
        }

        .leads-table-th {
          padding: 8px 10px;
          font-weight: 600;
          color: rgb(154 52 18); /* orange-800 */
          border-bottom: 1px solid rgb(254 215 170); /* orange-200 */
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          word-break: keep-all;
          font-size: 0.6875rem; /* 11px - very small to fit more text */
          min-height: 40px;
          height: 40px;
          vertical-align: middle;
          line-height: 1.1;
        }

        .leads-table-th-left { text-align: left; }
        .leads-table-th-center { text-align: center; }
        .leads-table-th-right { text-align: right; }

        .leads-table-row {
          transition: background-color 0.15s ease;
          min-height: 44px;
          height: auto; /* Allow rows to grow for wrapped content */
        }

        .leads-table-row:nth-child(even) {
          background-color: rgb(255 251 235 / 0.3); /* orange-50/30 */
        }

        .leads-table-row:hover {
          background-color: rgb(255 251 235 / 0.7); /* orange-50/70 */
        }

        .leads-table-td {
          padding: 8px 10px;
          border-bottom: 1px solid rgb(254 215 170 / 0.3); /* orange-200/30 */
          white-space: nowrap; /* Default: single line */
          text-overflow: ellipsis;
          overflow: hidden;
          word-break: keep-all;
          font-size: 0.6875rem; /* 11px - very small to fit more text */
          vertical-align: top; /* Changed to top for better multi-line alignment */
          min-height: 44px;
          height: auto; /* Allow height to grow */
          line-height: 1.3;
        }

        /* Status column - allow wrapping and adaptive sizing */
        .leads-table-td-status {
          white-space: normal;
          overflow-wrap: break-word;
          word-break: normal;
          text-overflow: unset;
          overflow: visible;
          padding: 8px 4px; /* Even less horizontal padding for more text space */
          min-width: 0; /* Allow column to shrink if needed */
          max-width: none; /* Allow column to expand if needed */
        }

        /* Model Interested column - allow wrapping */
        .leads-table-td-model {
          white-space: normal;
          overflow-wrap: break-word;
          word-break: normal; /* Don't split words */
          text-overflow: unset;
          overflow: visible;
        }

        .leads-table-td-left { text-align: left; }
        .leads-table-td-center { text-align: center; }
        .leads-table-td-right { text-align: right; }

        .leads-table-cell-content {
          width: 100%;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          word-break: keep-all;
          line-height: 1.2;
          display: block;
        }

        .leads-table-badge {
          font-size: 0.6875rem; /* 11px - slightly larger for better readability */
          padding: 4px 6px;
          max-width: 100%;
          white-space: normal; /* Allow wrapping by default */
          text-overflow: unset;
          overflow: visible;
          word-break: normal; /* Keep words intact */
          overflow-wrap: break-word; /* Break long words if absolutely necessary */
          display: inline-block;
          text-align: center;
          line-height: 1.2; /* Better for multi-line text */
          border-radius: 4px;
          min-height: 22px; /* Minimum height but can grow */
          height: auto; /* Allow badge to grow vertically */
          box-sizing: border-box;
        }

        /* Status badge container - adaptive and flexible */
        .leads-table-badge-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 100%;
          padding: 2px;
        }

        /* Adaptive status badge - intelligent wrapping */
        .leads-table-badge-wrap {
          white-space: normal; /* Allow natural text wrapping */
          overflow-wrap: break-word;
          word-break: normal; /* Prefer keeping words intact */
          hyphens: auto; /* Enable hyphenation for very long words */
          text-overflow: unset;
          overflow: visible;
          width: 100%;
          max-width: 100%;
          text-align: center;
          line-height: 1.3; /* Better line spacing for multi-line text */
          min-height: auto;
          height: auto;
          display: inline-block;
          padding: 2px; /* Small padding inside badge */
        }

        /* Desktop: try to keep compact but allow wrapping when needed */
        @media (min-width: 1200px) {
          .leads-table-badge-wrap {
            line-height: 1.2;
            max-height: none; /* No height restriction */
          }
        }

        /* Medium screens: more aggressive wrapping */
        @media (max-width: 1199px) {
          .leads-table-badge-wrap {
            line-height: 1.1;
            word-spacing: -0.5px; /* Slightly tighter word spacing */
          }
        }

        /* Model text content with line clamp on mobile */
        .leads-table-model-content {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.3;
        }

        /* Desktop: unlimited lines for model */
        @media (min-width: 768px) {
          .leads-table-model-content {
            -webkit-line-clamp: unset;
            display: block;
          }
        }

        /* Mobile: 2-3 line clamp for model */
        @media (max-width: 767px) {
          .leads-table-model-content {
            -webkit-line-clamp: 3;
          }
        }

        .leads-table-empty {
          padding: 48px 16px;
          text-align: center;
          color: rgb(107 114 128); /* gray-500 */
          font-style: italic;
        }

        /* Desktop: ≥1200px - Full width columns */
        @media (min-width: 1200px) {
          .leads-table {
            min-width: 1160px; /* Further increased to accommodate wider Status column */
          }
        }

          /* Tablet: 768px - 1199px - Smaller fonts to fit more text */
        @media (min-width: 768px) and (max-width: 1199px) {
          .leads-table-th {
            padding: 6px 8px;
            font-size: 0.625rem; /* 10px - smaller to fit more text */
            min-height: 36px;
            height: auto;
            word-break: keep-all;
            line-height: 1.2;
          }

          .leads-table-td {
            padding: 6px 8px;
            font-size: 0.625rem; /* 10px - smaller to fit more text */
            min-height: 40px;
            height: auto;
            word-break: keep-all;
            line-height: 1.2;
          }

          .leads-table-td-status {
            padding: 6px 4px; /* Less horizontal padding for status */
          }

          .leads-table-row {
            min-height: 40px;
            height: auto;
          }

          .leads-table-badge {
            font-size: 0.625rem; /* 10px - readable for badges */
            padding: 3px 4px;
            word-break: normal; /* Allow word breaking on tablets */
            overflow-wrap: break-word;
            white-space: normal;
            line-height: 1.2;
            min-height: 20px;
            height: auto;
          }

          .leads-table-badge-wrap {
            line-height: 1.1;
          }

          .leads-table-cell-content {
            word-break: keep-all;
            line-height: 1.2;
          }

          .leads-table-wrapper {
            overflow-x: auto;
          }
        }

          /* Mobile: ≤767px - Collapse low priority columns, smaller fonts */
        @media (max-width: 767px) {
          .priority-low {
            display: none;
          }

          .leads-table {
            min-width: 600px;
          }

          .leads-table-th {
            padding: 4px 6px;
            font-size: 0.5625rem; /* 9px - very small for mobile */
            min-height: 32px;
            height: auto;
            word-break: keep-all;
            line-height: 1.1;
          }

          .leads-table-td {
            padding: 4px 6px;
            font-size: 0.5625rem; /* 9px - very small for mobile */
            min-height: 36px;
            height: auto;
            word-break: keep-all;
            line-height: 1.1;
          }

          .leads-table-td-status {
            padding: 4px 3px; /* Less horizontal padding for status on mobile */
          }

          .leads-table-row {
            min-height: 36px;
            height: auto;
          }

          .leads-table-badge {
            font-size: 0.5625rem; /* 9px - readable for mobile badges */
            padding: 2px 3px;
            word-break: normal; /* Allow word breaking on mobile */
            overflow-wrap: break-word;
            white-space: normal;
            line-height: 1.1;
            min-height: 18px;
            height: auto;
          }

          .leads-table-badge-wrap {
            line-height: 1.0;
          }

          .leads-table-cell-content {
            word-break: keep-all;
            line-height: 1.1;
          }

          /* Enable line clamp for model on mobile */
          .leads-table-model-content {
            -webkit-line-clamp: 2; /* 2 lines on small mobile */
          }

          .leads-table-wrapper {
            overflow-x: auto;
            max-height: 60vh;
          }
        }

        /* Extra small: ≤480px - Further collapse medium priority columns, ultra-small fonts */
        @media (max-width: 480px) {
          .priority-low,
          .priority-medium:nth-child(n+6) {
            display: none;
          }

          .leads-table {
            min-width: 400px;
          }

          .leads-table-th,
          .leads-table-td {
            word-break: keep-all;
            padding: 3px 4px;
            font-size: 0.5rem; /* 8px - ultra small */
            line-height: 1.0;
          }

          .leads-table-th {
            min-height: 28px;
            height: auto;
          }

          .leads-table-td {
            min-height: 32px;
            height: auto;
          }

          .leads-table-cell-content {
            word-break: keep-all;
            line-height: 1.0;
          }

          .leads-table-badge {
            word-break: normal; /* Allow word breaking on extra small screens */
            overflow-wrap: break-word;
            white-space: normal;
            font-size: 0.5rem; /* 8px - small but readable for badges */
            padding: 1px 2px;
            line-height: 1.0;
            min-height: 16px;
            height: auto;
          }

          .leads-table-row {
            min-height: 32px;
            height: auto;
          }

          /* Stricter line clamp for very small screens */
          .leads-table-model-content {
            -webkit-line-clamp: 2;
          }
        }

        /* Filter layout improvements */
        .filter-grid {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        /* Ensure select dropdowns don't overflow */
        [data-radix-select-content] {
          max-width: min(300px, 90vw) !important;
          z-index: 50 !important;
        }
        
        /* Prevent text overflow in select triggers */
        [data-radix-select-trigger] {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Better spacing for filter items */
        .filter-item {
          min-width: 0;
          flex: 1;
        }

        /* Responsive adjustments for filters */
        @media (max-width: 768px) {
          .filter-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .filter-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </DashboardLayout>
  )
}
