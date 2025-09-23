'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RefreshCw, Search, User, Phone, Calendar, MapPin, Car, Edit3, CheckCircle, AlertCircle, LogOut, Filter, X } from 'lucide-react'
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
  
  // Date range filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [user, setUser] = useState({
    username: 'creicrop',
    first_name: 'CRE',
    last_name: 'ICROP',
    name: 'CRE ICROP'
  })

  // Get user data from localStorage after component mounts
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
      console.log('📊 [ICROP Dashboard] Fetching qualified leads with PS assignments...')
      
      // Get token from localStorage
      const supabaseUser = localStorage.getItem('supabase_user')
      if (!supabaseUser) {
        throw new Error('No authentication token found')
      }
      
      const userData = JSON.parse(supabaseUser)
      const token = userData.access_token
      
      console.log('🔑 [ICROP Dashboard] Using token for authentication')
      
      const response = await fetch('/api/qualified-leads/ps-assigned', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-store'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch qualified leads')
      }
      
      const data = await response.json()
      console.log('📊 [ICROP Dashboard] Fetched qualified leads:', data.length)
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

  // Filter leads based on search term and date range
  useEffect(() => {
    let filtered = leads

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(lead => 
        lead.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_mobile_number.includes(searchTerm) ||
        lead.lead_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.ps_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.icrop_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply date range filter
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

    // Sort: pending ICROP leads first, then assigned ones
    filtered.sort((a, b) => {
      const aHasIcrop = !!a.icrop_id
      const bHasIcrop = !!b.icrop_id
      
      if (aHasIcrop && !bHasIcrop) return 1
      if (!aHasIcrop && bHasIcrop) return -1
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
      console.log(`🔄 [ICROP Dashboard] Updating ICROP ID for lead ${leadId}: ${icropId}`)

      // Get token from localStorage
      const supabaseUser = localStorage.getItem('supabase_user')
      if (!supabaseUser) {
        throw new Error('No authentication token found')
      }
      
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

      if (!response.ok) {
        throw new Error('Failed to update ICROP ID')
      }

      // Update local state
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, icrop_id: icropId.trim() }
          : lead
      ))

      // Clear the input
      setIcropInputs(prev => {
        const newInputs = { ...prev }
        delete newInputs[leadId]
        return newInputs
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

    return {
      total,
      withPs,
      withIcrop,
      pending
    }
  }, [leads])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading qualified leads...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  CRE ICROP Dashboard
                </h1>
                <p className="text-gray-600 mt-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Manage ICROP ID assignments for PS-assigned qualified leads
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">System Online</span>
                </div>
                <Button 
                  onClick={handleRefresh} 
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                      Total Qualified Leads
                    </p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
                      {stats.total}
                    </p>
                  </div>
                  <User className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                      PS Assigned
                    </p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
                      {stats.withPs}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                      ICROP Assigned
                    </p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
                      {stats.withIcrop}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                      Pending ICROP
                    </p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
                      {stats.pending}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-amber-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by customer name, phone, lead UID, PS name, or ICROP ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-12"
              />
              {(searchTerm || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Compact Date Range Filter */}
            <div className="mt-3 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Date Range:</span>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm w-36"
                  placeholder="From"
                />
                <span className="text-gray-400">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm w-36"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>PS-Assigned Qualified Leads ({filteredLeads.length})</span>
                {isRefreshing && (
                  <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PS Assignment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ICROP Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.customer_name}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {lead.customer_mobile_number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">{lead.lead_uid}</div>
                            <div className="text-gray-500">{lead.model_interested}</div>
                            {lead.variant && (
                              <div className="text-gray-500">{lead.variant}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {lead.ps_name ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {lead.ps_name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                Not Assigned
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {lead.icrop_id ? (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lead.ps_name && (
                            <div className="flex items-center space-x-2">
                              <Input
                                placeholder="Enter ICROP ID"
                                value={icropInputs[lead.id] || lead.icrop_id || ''}
                                onChange={(e) => setIcropInputs(prev => ({
                                  ...prev,
                                  [lead.id]: e.target.value
                                }))}
                                className="w-32 h-8 text-sm"
                                disabled={updatingLeadId === lead.id}
                              />
                              <Button
                                onClick={() => handleUpdateIcropId(lead.id)}
                                size="sm"
                                disabled={updatingLeadId === lead.id || !icropInputs[lead.id]?.trim()}
                                className="bg-purple-600 hover:bg-purple-700 h-8 px-3"
                              >
                                {updatingLeadId === lead.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Edit3 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}