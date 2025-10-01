'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Search, User, Phone, Calendar, Car, Edit3, CheckCircle, AlertCircle, LogOut, X, Zap, Loader2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface QualifiedLead {
  id: string
  lead_uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  sub_source: string
  cre_name: string
  ps_name?: string
  icrop_id?: string
  model_interested: string
  variant: string
  first_remark: string
  profession: string
  buying_plan: string
  finance_option: string
  test_drive_type: string
  lead_category: string
  trade_in: string
  branch: string
  created_at: string
  updated_at: string
}

export default function CREICROPDashboard() {
  const [leads, setLeads] = useState<QualifiedLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<QualifiedLead[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null)
  const [icropInputs, setIcropInputs] = useState<{[key: string]: string}>({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [user, setUser] = useState({
    username: 'creicrop',
    first_name: 'CRE',
    last_name: 'ICROP',
    name: 'CRE ICROP'
  })

  useEffect(() => {
    try {
      const supabaseUser = localStorage.getItem('supabase_user')
      if (supabaseUser) {
        const userData = JSON.parse(supabaseUser)
        setUser({
          username: userData.username,
          first_name: userData.name?.split(' ')[0] || userData.username,
          last_name: userData.name?.split(' ')[1] || 'ICROP',
          name: userData.name || userData.username
        })
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
    }
  }, [])

  const fetchQualifiedLeads = async () => {
    try {
      setIsLoading(true)
      const supabaseUser = localStorage.getItem('supabase_user')
      if (!supabaseUser) throw new Error('No authentication token found')
      const userData = JSON.parse(supabaseUser)
      const token = userData.access_token

      const response = await fetch('/api/qualified-leads/ps-assigned', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-store'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch qualified leads')
      const data = await response.json()
      setLeads(data)
      setFilteredLeads(data)
    } catch (error) {
      console.error('Error fetching qualified leads:', error)
      toast.error('Failed to fetch qualified leads')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQualifiedLeads()
  }, [])

  useEffect(() => {
    let filtered = leads
    if (searchTerm.trim()) {
      filtered = filtered.filter(lead => 
        lead.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_mobile_number.includes(searchTerm) ||
        lead.lead_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.ps_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.icrop_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (startDate || endDate) {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.created_at)
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate) : null
        if (start && leadDate < start) return false
        if (end && leadDate > end) return false
        return true
      })
    }
    filtered.sort((a, b) => {
      const aHasIcrop = !!a.icrop_id
      const bHasIcrop = !!b.icrop_id
      if (!aHasIcrop && bHasIcrop) return -1
      if (aHasIcrop && !bHasIcrop) return 1
      return 0
    })
    setFilteredLeads(filtered)
  }, [searchTerm, leads, startDate, endDate])

  const handleUpdateIcropId = async (leadId: string) => {
    const icropId = icropInputs[leadId]
    if (!icropId?.trim()) {
      toast.error('Please enter a valid ICROP ID')
      return
    }
    try {
      setUpdatingLeadId(leadId)
      const supabaseUser = localStorage.getItem('supabase_user')
      if (!supabaseUser) throw new Error('No authentication token found')
      const userData = JSON.parse(supabaseUser)
      const token = userData.access_token

      const response = await fetch(`/api/qualified-leads/${leadId}/icrop-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ icrop_id: icropId.trim() })
      })
      if (!response.ok) throw new Error('Failed to update ICROP ID')

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, icrop_id: icropId.trim() } : lead
      ))
      setIcropInputs(prev => {
        const next = { ...prev }
        delete next[leadId]
        return next
      })
      const lead = leads.find(l => l.id === leadId)
      toast.success(`ICROP ID ${icropId} assigned to ${lead?.customer_name}`)
    } catch (error) {
      console.error('Error updating ICROP ID:', error)
      toast.error('Failed to update ICROP ID')
    } finally {
      setUpdatingLeadId(null)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchQualifiedLeads()
    setIsRefreshing(false)
  }

  const handleSignOut = () => {
    localStorage.removeItem('supabase_user')
    window.location.href = '/auth/login'
  }

  const stats = useMemo(() => {
    const total = leads.length
    const withPs = leads.filter(lead => lead.ps_name).length
    const withIcrop = leads.filter(lead => lead.icrop_id).length
    const pending = withPs - withIcrop
    return { total, withPs, withIcrop, pending }
  }, [leads])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100/20 relative overflow-hidden rounded-3xl">
          <div className="relative z-10 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
              <p className="text-gray-600 font-medium">Loading qualified leads...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Fancy rounded Stat Card
  const StatCard = ({ title, value, subtitle, icon: Icon, accent }: { 
    title: string; value: number | string; subtitle: string; icon: any; accent: 'blue'|'green'|'purple'|'amber' 
  }) => {
    const color = {
      blue: { ring: 'ring-blue-100', grad: 'from-blue-50 to-blue-100', iconBg: 'from-blue-100 to-blue-200', icon: 'text-blue-600' },
      green: { ring: 'ring-green-100', grad: 'from-green-50 to-green-100', iconBg: 'from-green-100 to-green-200', icon: 'text-green-600' },
      purple: { ring: 'ring-purple-100', grad: 'from-purple-50 to-purple-100', iconBg: 'from-purple-100 to-purple-200', icon: 'text-purple-600' },
      amber: { ring: 'ring-amber-100', grad: 'from-amber-50 to-amber-100', iconBg: 'from-amber-100 to-amber-200', icon: 'text-amber-600' },
    }[accent]

    return (
      <div className={`rounded-3xl bg-white/80 backdrop-blur-md shadow-[0_10px_30px_rgba(16,24,40,0.05)] border border-white/60 hover:shadow-[0_14px_34px_rgba(16,24,40,0.08)] transition-all duration-300`}>
        <div className={`rounded-3xl bg-gradient-to-br ${color.grad} p-1`}>
          <div className="rounded-3xl bg-white/90 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900">{value}</p>
                <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color.iconBg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color.icon}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100/30 relative overflow-hidden">
        {/* Soft decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-gradient-to-br from-orange-100/30 to-orange-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-10 w-40 h-40 bg-gradient-to-tr from-orange-100/25 to-orange-200/25 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-8">
          {/* Header */}
          <div className="rounded-3xl overflow-hidden shadow-xl border border-white/50 bg-white/70 backdrop-blur-md">
            <div className="bg-gradient-to-r from-orange-500/90 via-orange-600/80 to-orange-700/70 px-6 md:px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">CRE ICROP Dashboard</h1>
                    <p className="text-orange-100 font-medium">Manage ICROP IDs for PS-assigned qualified leads</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-2 rounded-2xl border border-white/20">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-white/90 font-medium">System Online</span>
                  </div>
                  <Button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-sm px-4"
                  >
                    {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh
                  </Button>
                  <Button
                    onClick={handleSignOut}
                    className="rounded-2xl bg-red-500/25 hover:bg-red-500/35 text-white border border-red-300/40 px-4"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Qualified Leads" value={stats.total} subtitle="All qualified leads" icon={Building2} accent="blue" />
            <StatCard title="PS Assigned" value={stats.withPs} subtitle="Assigned to Pre-Sales" icon={CheckCircle} accent="green" />
            <StatCard title="ICROP Assigned" value={stats.withIcrop} subtitle="ICROP ID assigned" icon={CheckCircle} accent="purple" />
            <StatCard title="Pending ICROP" value={stats.pending} subtitle="Awaiting ICROP ID" icon={AlertCircle} accent="amber" />
          </div>

          {/* Search and Filters */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-md border border-white/60 shadow-xl p-6 space-y-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search by customer name, phone, lead UID, PS name, or ICROP ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-12 pr-12 rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 bg-white/70"
              />
              {(searchTerm || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 text-gray-500" />
                Date Range:
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm w-40 rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 bg-white/70"
                />
                <span className="text-gray-400">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm w-40 rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 bg-white/70"
                />
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div className="rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md border border-white/60 shadow-xl">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200/60">
              <div className="text-xl font-bold text-gray-800 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-orange-500 mr-3" />
                  PS-Assigned Qualified Leads
                  <Badge className="ml-3 bg-orange-100 text-orange-700 border-0 rounded-xl">
                    {filteredLeads.length} leads
                  </Badge>
                </div>
                {isRefreshing && <Loader2 className="h-5 w-5 animate-spin text-gray-500" />}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-50/40 to-orange-100/40 border-b border-gray-200/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lead Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">PS Assignment</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ICROP Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/60">
                  {filteredLeads.map((lead, index) => (
                    <tr key={lead.id} className={`transition-colors ${
                      index % 2 === 0 ? 'bg-white/70' : 'bg-gray-50/60'
                    } hover:bg-orange-50/40`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{lead.customer_name}</div>
                            <div className="text-sm text-gray-600 flex items-center mt-1">
                              <Phone className="h-3 w-3 mr-2" />
                              {lead.customer_mobile_number}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-gray-900">{lead.lead_uid}</div>
                          <div className="text-sm text-gray-600">{lead.model_interested}</div>
                          {lead.variant && <div className="text-xs text-gray-500">{lead.variant}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {lead.ps_name ? (
                          <Badge className="rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 font-medium px-3 py-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {lead.ps_name}
                          </Badge>
                        ) : (
                          <Badge className="rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border-0 font-medium px-3 py-1">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Not Assigned
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {lead.icrop_id ? (
                          <Badge className="rounded-xl bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-0 font-medium px-3 py-1">
                            <Building2 className="w-3 h-3 mr-1" />
                            {lead.icrop_id}
                          </Badge>
                        ) : (
                          <Badge className="rounded-xl bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-0 font-medium px-3 py-1">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {lead.ps_name && (
                          <div className="flex items-center gap-3">
                            <Input
                              placeholder="Enter ICROP ID"
                              value={icropInputs[lead.id] || lead.icrop_id || ''}
                              onChange={(e) => setIcropInputs(prev => ({ ...prev, [lead.id]: e.target.value }))}
                              className="w-40 h-10 text-sm rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 bg-white/80"
                              disabled={updatingLeadId === lead.id}
                            />
                            <Button
                              onClick={() => handleUpdateIcropId(lead.id)}
                              size="sm"
                              disabled={updatingLeadId === lead.id || !icropInputs[lead.id]?.trim()}
                              className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-10 px-4 font-medium shadow-sm disabled:opacity-50"
                            >
                              {updatingLeadId === lead.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Edit3 className="h-3 w-3 mr-1" />
                                  Update
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLeads.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-gray-600 text-lg font-medium">No leads found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting filters or refresh the data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
