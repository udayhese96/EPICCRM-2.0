"use client"

import React from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { VirtualList } from '@/components/ui/virtual-list'

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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-orange-700 font-medium">Search</Label>
                  <Input 
                    placeholder="Name, mobile, UID..." 
                    value={q} 
                    onChange={e => setQ(e.target.value)}
                    className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-700 font-medium">Source</Label>
                  <Select value={source || 'all'} onValueChange={(v) => setSource(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Any</SelectItem>
                      {(options as any)?.source?.map?.((s: string) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-700 font-medium">Branch</Label>
                  <Select value={branch || 'all'} onValueChange={(v) => setBranch(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All</SelectItem>
                    {options.branch.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-700 font-medium">Status</Label>
                  <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                    {['all', ...options.status].map(s => (
                        <SelectItem key={s} value={s}>{s === 'all' ? 'Any' : s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-700 font-medium">Category</Label>
                  <Select value={category || 'all'} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                    {['all', ...options.category].map(c => (
                        <SelectItem key={c} value={c}>{c === 'all' ? 'Any' : c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-700 font-medium">Trade-in</Label>
                  <Select value={tradeIn || 'all'} onValueChange={(v) => setTradeIn(v === 'all' ? '' : v)}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                    {['all', ...options.trade_in].map(t => (
                        <SelectItem key={t} value={t}>{t === 'all' ? 'Any' : t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-700 font-medium">Walk-in From</Label>
                  <Input 
                    type="date" 
                    value={fromDate} 
                    onChange={e => setFromDate(e.target.value)}
                    className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-700 font-medium">Walk-in To</Label>
                  <Input 
                    type="date" 
                    value={toDate} 
                    onChange={e => setToDate(e.target.value)}
                    className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 rounded-xl"
                  />
                </div>
                <div className="flex items-end">
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
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-xl border border-orange-100" style={{ paddingBottom: 0 }}>
                <div className="min-w-[1200px]">
                  {/* Single header row aligned with virtual rows; no extra scrollbar */}
                  <div className="flex items-center bg-gradient-to-r from-orange-100 to-amber-100 border-b border-orange-100 text-orange-800 font-semibold">
                    <div className="w-32 px-4">UID</div>
                    <div className="w-80 px-4">Customer</div>
                    <div className="w-48 px-4">Mobile</div>
                    <div className="w-40 px-4">Status</div>
                    <div className="w-40 px-4">Final</div>
                    <div className="w-56 px-4">Model</div>
                    <div className="w-56 px-4">Variant</div>
                    <div className="w-48 px-4">Branch</div>
                    <div className="w-40 px-4">CRE</div>
                    <div className="w-40 px-4">PS</div>
                    <div className="w-32 px-4">Trade-in</div>
                    <div className="w-48 px-4">Created</div>
                  </div>
                  <div className="w-full">
                  <VirtualList
                    items={filtered}
                    itemHeight={56}
                    containerHeight={520}
                    renderItem={(lead, idx) => (
                      <div
                        key={lead.uid}
                        className={`flex items-center ${idx % 2 === 0 ? 'bg-white hover:bg-orange-50/50' : 'bg-orange-50/30 hover:bg-orange-50/70'}`}
                        style={{ height: 56 }}
                      >
                        <div className="w-32 px-4 font-medium text-orange-900 whitespace-nowrap" title={lead.uid}>{lead.uid}</div>
                        <div className="w-80 px-4 text-gray-700 whitespace-nowrap" title={lead.customer_name}>{lead.customer_name}</div>
                        <div className="w-48 px-4 text-gray-700 whitespace-nowrap" title={lead.customer_mobile_number}>{lead.customer_mobile_number}</div>
                        <div className="w-40 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 truncate">
                            {lead.lead_status}
                          </span>
                        </div>
                        <div className="w-40 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 truncate">
                            {lead.final_status}
                          </span>
                        </div>
                        <div className="w-56 px-4 text-gray-700 whitespace-nowrap">{lead.model_interested}</div>
                        <div className="w-56 px-4 text-gray-700 whitespace-nowrap">{lead.variant}</div>
                        <div className="w-48 px-4 text-gray-700 whitespace-nowrap">{lead.branch}</div>
                        <div className="w-40 px-4 text-gray-700 whitespace-nowrap">{lead.cre_name}</div>
                        <div className="w-40 px-4 text-gray-700 whitespace-nowrap">{lead.ps_name}</div>
                        <div className="w-32 px-4 text-gray-700 whitespace-nowrap">{lead.trade_in}</div>
                        <div className="w-48 px-4 text-gray-600 text-sm whitespace-nowrap">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''}</div>
                      </div>
                    )}
                  />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
