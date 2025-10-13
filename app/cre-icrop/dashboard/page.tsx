'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Search, User, Phone, Calendar, Car, Edit3, CheckCircle, AlertCircle, LogOut, X, Zap, Loader2, Building2, Clock, MessageSquare, Eye, ArrowUpDown } from 'lucide-react'
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
  trade_in_make?: string
  trade_in_model?: string
  trade_in_year?: string
  trade_in_km?: string
  trade_in_ownership?: string
  branch: string
  created_at: string
  updated_at: string
  metadata?: any
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
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [showTradeInDetails, setShowTradeInDetails] = useState(false)
  const [selectedLead, setSelectedLead] = useState<QualifiedLead | null>(null)
  const [callHistory, setCallHistory] = useState<any[]>([])
  const [tradeInDetails, setTradeInDetails] = useState<any>(null)

  const [user, setUser] = useState({
    username: 'creicrop',
    first_name: 'CRE',
    last_name: 'ICROP',
    name: 'CRE ICROP'
  })

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
      
      const sortedData = data.sort((a: QualifiedLead, b: QualifiedLead) => {
        const aHasIcrop = !!a.icrop_id
        const bHasIcrop = !!b.icrop_id
        
        if (!aHasIcrop && bHasIcrop) return -1
        if (aHasIcrop && !bHasIcrop) return 1
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      setLeads(sortedData)
      setFilteredLeads(sortedData)
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

  const handleShowCallHistory = async (lead: QualifiedLead) => {
    setSelectedLead(lead)
    setShowCallHistory(true)
    
    try {
      const metadata = lead.metadata || {}
      const metadataHistory = metadata.call_history || []
      
      const constructedHistory = []
      
      if (lead.first_remark) {
        constructedHistory.push({
          type: 'First Call',
          user: lead.cre_name || 'CRE',
          subject: 'Initial Contact',
          description: lead.first_remark,
          timestamp: lead.created_at,
          status: 'Completed'
        })
      }

      const supabaseUser = localStorage.getItem('supabase_user')
      if (supabaseUser) {
        try {
          const userData = JSON.parse(supabaseUser)
          const token = userData.access_token

          const response = await fetch(`/api/call-history-test?lead_uid=${lead.lead_uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-store'
            }
          })
          
          if (response.ok) {
            const apiData = await response.json()
            setCallHistory(apiData || [])
            return
          }
        } catch (apiError) {
          console.log('API call failed, using fallback data:', apiError)
        }
      }
      
      const allHistory = [...metadataHistory, ...constructedHistory]
      
      allHistory.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date || 0)
        const dateB = new Date(b.timestamp || b.date || 0)
        return dateB.getTime() - dateA.getTime()
      })
      
      setCallHistory(allHistory)
    } catch (error) {
      console.error('Error processing call history:', error)
      setCallHistory([])
    }
  }

  const handleShowTradeInDetails = async (lead: QualifiedLead) => {
    if (lead.trade_in?.toLowerCase() !== 'yes') {
      toast.error('No trade-in details available for this lead')
      return
    }

    setSelectedLead(lead)
    setShowTradeInDetails(true)
    
    try {
      const supabaseUser = localStorage.getItem('supabase_user')
      if (supabaseUser) {
        try {
          const userData = JSON.parse(supabaseUser)
          const token = userData.access_token

          const response = await fetch(`/api/trade-in-test?lead_uid=${lead.lead_uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-store'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            setTradeInDetails(data)
            return
          }
        } catch (apiError) {
          console.log('API call failed, using fallback data:', apiError)
        }
      }
      
      setTradeInDetails({
        trade_in_make: lead.trade_in_make,
        trade_in_model: lead.trade_in_model,
        trade_in_year: lead.trade_in_year,
        trade_in_km: lead.trade_in_km,
        trade_in_ownership: lead.trade_in_ownership,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      })
    } catch (error) {
      console.error('Error processing trade-in details:', error)
      setTradeInDetails({
        trade_in_make: lead.trade_in_make,
        trade_in_model: lead.trade_in_model,
        trade_in_year: lead.trade_in_year,
        trade_in_km: lead.trade_in_km,
        trade_in_ownership: lead.trade_in_ownership,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      })
    }
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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100/30 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-gradient-to-br from-orange-100/30 to-orange-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-10 w-40 h-40 bg-gradient-to-tr from-orange-100/25 to-orange-200/25 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Qualified Leads" value={stats.total} subtitle="All qualified leads" icon={Building2} accent="blue" />
            <StatCard title="PS Assigned" value={stats.withPs} subtitle="Assigned to Pre-Sales" icon={CheckCircle} accent="green" />
            <StatCard title="ICROP Assigned" value={stats.withIcrop} subtitle="ICROP ID assigned" icon={CheckCircle} accent="purple" />
            <StatCard title="Pending ICROP" value={stats.pending} subtitle="Awaiting ICROP ID" icon={AlertCircle} accent="amber" />
          </div>

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

            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-orange-400" />
                </div>
                <p className="text-gray-600 text-lg font-medium">No leads found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting filters or refresh the data</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[700px]">
                <div className="min-w-[1500px]">
                  <div className="bg-gradient-to-r from-orange-50/40 to-orange-100/40 border-b border-gray-200/60 px-6 py-4 sticky top-0 z-10">
                    <div className="grid grid-cols-[140px_200px_120px_200px_140px_140px_150px_140px_220px] gap-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div>Date</div>
                      <div>Customer</div>
                      <div>Source</div>
                      <div>Lead Details</div>
                      <div>Trade-in</div>
                      <div>PS Assignment</div>
                      <div>Call History</div>
                      <div>ICROP Status</div>
                      <div>Actions</div>
                    </div>
                  </div>

                  <div>
                    {filteredLeads.map((lead, index) => (
                      <div key={lead.id} className={`border-b border-gray-200/60 px-6 py-4 transition-colors ${
                        index % 2 === 0 ? 'bg-white/70' : 'bg-gray-50/60'
                      } hover:bg-orange-50/40`}>
                        <div className="grid grid-cols-[140px_200px_120px_200px_140px_140px_150px_140px_220px] gap-6 items-center">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {new Date(lead.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900 truncate">{lead.customer_name}</div>
                              <div className="text-xs text-gray-600 flex items-center mt-1">
                                <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{lead.customer_mobile_number}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <Badge className="rounded-xl bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 border-0 font-medium px-2 py-1 text-xs whitespace-nowrap">
                              {lead.source}
                            </Badge>
                            {lead.sub_source && (
                              <div className="text-xs text-gray-500 mt-1 truncate">{lead.sub_source}</div>
                            )}
                          </div>
                          
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{lead.lead_uid}</div>
                            <div className="text-xs text-gray-600 truncate">{lead.model_interested}</div>
                            {lead.variant && <div className="text-xs text-gray-500 truncate">{lead.variant}</div>}
                          </div>
                          
                          <div>
                            {lead.trade_in?.toLowerCase() === 'yes' ? (
                              <div className="flex items-center gap-1">
                                <Badge className="rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 font-medium px-2 py-1 text-xs whitespace-nowrap">
                                  <Car className="w-3 h-3 mr-1" />
                                  Yes
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShowTradeInDetails(lead)}
                                  className="rounded-xl border-green-200 text-green-600 hover:bg-green-50 h-7 w-7 p-0 flex-shrink-0"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Badge className="rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border-0 font-medium px-2 py-1 text-xs whitespace-nowrap">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {lead.trade_in || 'No'}
                              </Badge>
                            )}
                          </div>
                          
                          <div>
                            {lead.ps_name ? (
                              <Badge className="rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 font-medium px-2 py-1 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{lead.ps_name}</span>
                              </Badge>
                            ) : (
                              <Badge className="rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border-0 font-medium px-2 py-1 text-xs whitespace-nowrap">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Not Assigned
                              </Badge>
                            )}
                          </div>
                          
                          <div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShowCallHistory(lead)}
                              className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 h-8 px-3 text-xs whitespace-nowrap"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              View History
                            </Button>
                          </div>
                          
                          <div>
                            {lead.icrop_id ? (
                              <Badge className="rounded-xl bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-0 font-medium px-2 py-1 text-xs">
                                <Building2 className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{lead.icrop_id}</span>
                              </Badge>
                            ) : (
                              <Badge className="rounded-xl bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-0 font-medium px-2 py-1 text-xs whitespace-nowrap">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          
                          <div>
                            {lead.ps_name && (
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Enter ICROP ID"
                                  value={icropInputs[lead.id] || lead.icrop_id || ''}
                                  onChange={(e) => setIcropInputs(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                  className="w-32 h-8 text-xs rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 bg-white/80"
                                  disabled={updatingLeadId === lead.id}
                                />
                                <Button
                                  onClick={() => handleUpdateIcropId(lead.id)}
                                  size="sm"
                                  disabled={updatingLeadId === lead.id || !icropInputs[lead.id]?.trim()}
                                  className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-8 px-3 text-xs font-medium shadow-sm disabled:opacity-50 whitespace-nowrap"
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCallHistory && selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-6 w-6 text-white" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Call History</h2>
                    <p className="text-blue-100">{selectedLead.customer_name} - {selectedLead.lead_uid}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowCallHistory(false)}
                  className="rounded-2xl bg-white/20 hover:bg-white/30 text-white border border-white/30"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {callHistory.length > 0 ? (
                <div>
                  <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-blue-600">📞</span>
                      <span className="text-sm font-medium text-gray-700">CRE Calls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-green-600">🎯</span>
                      <span className="text-sm font-medium text-gray-700">PS Follow-ups</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-yellow-600">⏳</span>
                      <span className="text-sm font-medium text-gray-700">Pending Reasons</span>
                    </div>
                    <div className="text-xs text-gray-500 ml-auto">
                      {callHistory.length} total calls
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {callHistory.map((call, index) => {
                      const isCRE = call.type?.includes('CRE') || call.type?.includes('First') || call.type?.includes('Second') || call.type?.includes('Third') || call.type?.includes('Fourth') || call.type?.includes('Fifth') || call.type?.includes('Sixth')
                      const isPS = call.type?.includes('PS')
                      const isPendingReason = call.type?.includes('Pending Reason')
                      
                      const cardClass = isPendingReason
                        ? "bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200"
                        : isCRE 
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200" 
                        : isPS 
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                        : "bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200"
                      
                      const badgeClass = isPendingReason
                        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                        : isCRE
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : isPS
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                      
                      const iconClass = isPendingReason ? "text-yellow-600" : isCRE ? "text-blue-600" : isPS ? "text-green-600" : "text-gray-600"
                      const icon = isPendingReason ? "⏳" : isCRE ? "📞" : isPS ? "🎯" : "📋"
                      
                      return (
                        <div key={index} className={`rounded-2xl p-4 ${cardClass} shadow-sm hover:shadow-md transition-shadow`}>
                          <div className="flex items-start gap-3">
                            <div className={`text-2xl ${iconClass} mt-1`}>
                              {icon}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${badgeClass} border-0 rounded-xl font-medium`}>
                                  {call.type || 'Call'}
                                </Badge>
                                <span className="text-sm text-gray-600 font-medium">
                                  👤 {call.user || selectedLead.cre_name}
                                </span>
                              </div>
                              <p className="text-gray-800 font-semibold mb-2">{call.subject || 'Call Update'}</p>
                              <p className="text-gray-600 text-sm leading-relaxed">{call.description || call.remark || 'No description available'}</p>
                            </div>
                            
                            <div className="text-right min-w-[120px]">
                              <p className="text-xs text-gray-500 mb-1">
                                🕒 {call.timestamp ? new Date(call.timestamp).toLocaleString() : 
                                   call.date ? new Date(call.date).toLocaleString() : 
                                   'No date'}
                              </p>
                              {call.status && (
                                <Badge className={`mt-1 text-xs font-medium ${
                                  call.status.toLowerCase().includes('completed') 
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : call.status.toLowerCase().includes('pending')
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    : call.status.toLowerCase().includes('call me back')
                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                } border-0 rounded-xl`}>
                                  {call.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium">No call history available</p>
                  <p className="text-gray-400 text-sm mt-1">Call history will appear here when calls are made</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTradeInDetails && selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Car className="h-6 w-6 text-white" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Trade-in Details</h2>
                    <p className="text-green-100">{selectedLead.customer_name} - {selectedLead.lead_uid}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowTradeInDetails(false)}
                  className="rounded-2xl bg-white/20 hover:bg-white/30 text-white border border-white/30"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {tradeInDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
                      <h3 className="font-semibold text-green-800 mb-2 flex items-center">
                        <Car className="h-4 w-4 mr-2" />
                        Vehicle Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Make:</span>
                          <span className="ml-2 font-medium">{tradeInDetails.trade_in_make || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Model:</span>
                          <span className="ml-2 font-medium">{tradeInDetails.trade_in_model || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Year:</span>
                          <span className="ml-2 font-medium">{tradeInDetails.trade_in_year || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Kilometers:</span>
                          <span className="ml-2 font-medium">{tradeInDetails.trade_in_km || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Ownership:</span>
                          <span className="ml-2 font-medium">{tradeInDetails.trade_in_ownership || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                      <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        Trade-in Status
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <Badge className="ml-2 bg-green-100 text-green-700 border-0 rounded-xl">
                            Active
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Created:</span>
                          <span className="ml-2 font-medium">
                            {tradeInDetails.created_at ? new Date(tradeInDetails.created_at).toLocaleDateString() : 'Not available'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Updated:</span>
                          <span className="ml-2 font-medium">
                            {tradeInDetails.updated_at ? new Date(tradeInDetails.updated_at).toLocaleDateString() : 'Not available'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium">No trade-in details available</p>
                  <p className="text-gray-400 text-sm mt-1">Trade-in information will appear here when available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
