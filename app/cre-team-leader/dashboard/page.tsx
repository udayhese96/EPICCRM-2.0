"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { RefreshCw, Users, CheckCircle, XCircle, AlertCircle, UserCheck, UserX, Building2, MapPin, Calendar, Phone, Mail, Car, FileText, TrendingUp, BarChart3, Filter, Search, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react'

interface QualifiedLead {
  id: string
  lead_uid: string
  customer_location?: string
  customer_name: string
  customer_mobile_number: string
  source: string
  sub_source?: string
  cre_name?: string
  lead_category?: string
  model_interested?: string
  first_remark?: string
  variant?: string
  buying_plan?: string
  finance_option?: string
  profession?: string
  test_drive_type?: string
  trade_in?: string
  branch?: string
  ps_name?: string
  ps_id?: string
  icrop_id?: string
  created_at: string
  updated_at?: string
  lead_status: string
  final_status?: string
}

interface GemUser {
  id: string
  name: string
  username: string
  branch: string
  is_active: boolean
}

interface Branch {
  id: string
  name: string
  code: string
}

export default function CRETeamLeaderDashboard() {
  const [qualifiedLeads, setQualifiedLeads] = useState<QualifiedLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<QualifiedLead[]>([])
  const [gemUsers, setGemUsers] = useState<GemUser[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>("")
  const [filteredGemUsers, setFilteredGemUsers] = useState<GemUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [assignmentDialog, setAssignmentDialog] = useState(false)
  const [selectedGem, setSelectedGem] = useState("")
  const [user, setUser] = useState<any>(null)
  const [selectedGems, setSelectedGems] = useState<{[leadId: string]: string}>({})
  
  // Date range filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  useEffect(() => {
    // Initialize user from localStorage
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      setUser(JSON.parse(supabaseUser))
    }
    loadData()
    // Only refresh when user manually clicks refresh or when leads are assigned
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      setFilteredGemUsers(gemUsers.filter(gem => gem.branch === selectedBranch))
    } else {
      setFilteredGemUsers(gemUsers)
    }
  }, [selectedBranch, gemUsers])

  // Filter leads based on search term and date range
  useEffect(() => {
    let filtered = qualifiedLeads

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

        // Apply source filter
        if (sourceFilter !== 'all') {
          if (sourceFilter === 'walkin') {
            // Show walk-in and digital leads
            if (!['Walk-in', 'Digital', 'Google', 'Meta', 'WhatsApp', 'Car Dekho', 'Car Wale', 'OEM', 'Tele Out', 'Referral', 'Other'].includes(lead.source)) {
              return false
            }
          } else {
            // Show specific source
            if (lead.source !== sourceFilter) {
              return false
            }
          }
        }

        return true
      })
    }

    setFilteredLeads(filtered)
  }, [searchTerm, qualifiedLeads, startDate, endDate, sourceFilter])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load all data in parallel for maximum speed with cache-busting
      const timestamp = Date.now()
      const [leadsResponse, gemResponse, branchesResponse] = await Promise.all([
        fetch(`/api/cre-team-leader/qualified-leads?_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }),
        fetch(`/api/ps-users?_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }),
        fetch(`/api/branches?_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      ])

      // Process responses in parallel
      const [leadsData, gemData, branchesData] = await Promise.all([
        leadsResponse.ok ? leadsResponse.json() : [],
        gemResponse.ok ? gemResponse.json() : [],
        branchesResponse.ok ? branchesResponse.json() : []
      ])

      console.log('📊 [CRE TL] Loaded qualified leads:', leadsData.length)
      console.log('📊 [CRE TL] Sample lead data:', leadsData[0])
      console.log('📊 [CRE TL] Lead with ps_name:', leadsData.find((l: any) => l.lead_uid === 'LD000546'))
      
      // Sort: Fresh leads (no ps_name) at top by created_at, then assigned leads by updated_at (newest assignments first)
      const sortedLeads = leadsData.sort((a: any, b: any) => {
        const aHasPS = !!a.ps_name
        const bHasPS = !!b.ps_name
        
        // Fresh leads (no PS) come first
        if (!aHasPS && bHasPS) return -1
        if (aHasPS && !bHasPS) return 1
        
        // Both are fresh leads - sort by created_at (newest first)
        if (!aHasPS && !bHasPS) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        
        // Both are assigned leads - sort by updated_at (newest assignments at top)
        if (aHasPS && bHasPS) {
          const aTime = new Date(a.updated_at || a.created_at).getTime()
          const bTime = new Date(b.updated_at || b.created_at).getTime()
          return bTime - aTime
        }
        
        return 0
      })
      
      setQualifiedLeads(sortedLeads)
      setGemUsers(gemData)
      setBranches(branchesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBranchChange = async (branch: string) => {
    setSelectedBranch(branch)
    setSelectedGem('')
    // Load GEM users for selected branch
    try {
      const response = await fetch(`/api/ps-users?branch=${encodeURIComponent(branch)}`)
      if (response.ok) {
        const gemData = await response.json()
        setFilteredGemUsers(gemData)
      }
    } catch (error) {
      console.error('Error loading GEM users for branch:', error)
    }
  }

  const handleLeadSelection = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId])
      console.log('✅ Lead selected:', leadId, 'Total selected:', selectedLeads.length + 1)
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId))
      console.log('❌ Lead deselected:', leadId, 'Total selected:', selectedLeads.length - 1)
    }
  }

  const handleBranchAssignment = async (leadId: string, branch: string) => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      
      const response = await fetch('/api/qualified-leads/assign-branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          branch: branch
        }),
      })

      if (response.ok) {
        toast.success(`Branch assigned successfully`)
        // Update the lead in the local state
        setQualifiedLeads(prev => 
          prev.map(lead => 
            lead.id === leadId 
              ? { ...lead, branch: branch }
              : lead
          )
        )
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to assign branch')
      }
    } catch (error) {
      console.error('Error assigning branch:', error)
      toast.error('Failed to assign branch')
    }
  }

  const handleGemSelection = (leadId: string, gemName: string) => {
    // Find the GEM user by name
    const gemUser = gemUsers.find(gem => gem.name === gemName)
    if (!gemUser) {
      toast.error('GEM user not found')
      return
    }

    // Update the selected GEM state (doesn't affect actual assignment)
    setSelectedGems(prev => ({
      ...prev,
      [leadId]: gemName
    }))
  }

  const handleIndividualAssignment = async (leadId: string) => {
    try {
      const lead = qualifiedLeads.find(l => l.id === leadId)
      if (!lead) {
        toast.error('Lead not found')
        return
      }

      if (!lead.branch) {
        toast.error('Please select a branch first')
        return
      }

      const selectedGemName = selectedGems[leadId]
      if (!selectedGemName) {
        toast.error('Please select a GEM from the dropdown first')
        return
      }

      // Find the selected GEM user
      const gemUser = gemUsers.find(gem => gem.name === selectedGemName)
      if (!gemUser) {
        toast.error('Selected GEM user not found')
        return
      }

      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      
      const response = await fetch('/api/qualified-leads/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_ids: [leadId],
          ps_id: gemUser.id,
          ps_name: gemUser.name,
          ps_branch: gemUser.branch
        }),
      })

      if (response.ok) {
        toast.success(`Lead assigned to ${gemUser.name}`)
        // Update the lead in the local state
        setQualifiedLeads(prev => 
          prev.map(l => 
            l.id === leadId 
              ? { ...l, ps_name: gemUser.name, ps_id: gemUser.id }
              : l
          )
        )
        // Clear the selected GEM for this lead
        setSelectedGems(prev => {
          const newSelectedGems = { ...prev }
          delete newSelectedGems[leadId]
          return newSelectedGems
        })
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to assign lead')
      }
    } catch (error) {
      console.error('Error assigning lead:', error)
      toast.error('Failed to assign lead')
    }
  }

  const handleDeassignment = async (leadId: string) => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      
      console.log('🔍 [Auth] Session data:', { session: !!session, parsed: !!parsed, token: !!token })
      console.log('🔍 [Auth] Token preview:', token ? token.substring(0, 50) + '...' : 'No token')
      console.log('🔍 [Auth] Parsed data keys:', parsed ? Object.keys(parsed) : 'No parsed data')
      
      const response = await fetch('/api/qualified-leads/deassign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: leadId
        }),
      })

      if (response.ok) {
        toast.success('Lead deassigned successfully')
        // Update the lead in the local state
        setQualifiedLeads(prev => 
          prev.map(lead => 
            lead.id === leadId 
              ? { ...lead, ps_name: '', ps_id: '' }
              : lead
          )
        )
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to deassign lead')
      }
    } catch (error) {
      console.error('Error deassigning lead:', error)
      toast.error('Failed to deassign lead')
    }
  }

  const handleBulkAssignment = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to assign')
      return
    }

    if (!selectedGem) {
      toast.error('Please select a GEM user')
      return
    }

    try {
      const selectedGemUser = gemUsers.find(gem => gem.id === selectedGem)
      if (!selectedGemUser) {
        toast.error('Selected GEM user not found')
        return
      }

      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      
      const response = await fetch('/api/qualified-leads/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_ids: selectedLeads,
          ps_id: selectedGem,
          ps_name: selectedGemUser.name,
          ps_branch: selectedGemUser.branch
        }),
      })

      if (response.ok) {
        toast.success(`Successfully assigned ${selectedLeads.length} leads to ${selectedGemUser.name}`)
        setSelectedLeads([])
        setAssignmentDialog(false)
        setSelectedGem("")
        loadData() // Reload data
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to assign leads')
      }
    } catch (error) {
      console.error('Error assigning leads:', error)
      toast.error('Failed to assign leads')
    }
  }

  const getStatusBadge = (lead: QualifiedLead) => {
    if (lead.ps_name) {
      return (
        <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 font-medium px-3 py-1">
          <UserCheck className="w-3 h-3 mr-1" />
          Assigned to {lead.ps_name}
        </Badge>
      )
    }
    return (
      <Badge className="bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-0 font-medium px-3 py-1">
        <AlertCircle className="w-3 h-3 mr-1" />
        Unassigned
      </Badge>
    )
  }

  return (
    <DashboardLayout>
      {/* Modern Background */}
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100/20 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-orange-200/20 to-orange-300/20 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-to-br from-orange-100/30 to-orange-200/30 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-gradient-to-br from-orange-200/25 to-orange-300/25 rounded-full blur-lg"></div>
        </div>

        <div className="relative z-10 p-6 space-y-8">
          {/* Modern Header Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                      CRE Team Leader Dashboard
                    </h1>
                    <p className="text-orange-100 mt-1 font-medium">
                      Manage and assign qualified leads to GEM teams
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={loadData} 
                    disabled={isLoading}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm font-medium px-6 py-2 rounded-xl transition-all duration-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                  <Dialog open={assignmentDialog} onOpenChange={(open) => {
                    setAssignmentDialog(open)
                    if (open) {
                      console.log('🎯 Assignment dialog opened with selected leads:', selectedLeads)
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        disabled={selectedLeads.length === 0}
                        className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-6 py-2 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Assign Selected ({selectedLeads.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white rounded-2xl border-0 shadow-2xl">
                      <DialogHeader className="pb-6">
                        <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center">
                          <UserCheck className="w-6 h-6 mr-3 text-orange-500" />
                          Assign Leads to GEM
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div>
                          <Label htmlFor="branch" className="text-sm font-semibold text-gray-700 mb-2 block">
                            Select Branch
                          </Label>
                          <Select value={selectedBranch} onValueChange={handleBranchChange}>
                            <SelectTrigger className="w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                              <SelectValue placeholder="Choose a branch" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-0 shadow-lg">
                              {branches.length > 0 ? (
                                branches.map((branch) => (
                                  <SelectItem key={branch.id} value={branch.name} className="rounded-lg">
                                    <div className="flex items-center">
                                      <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                                      {branch.name}
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-branches" disabled>
                                  No branches available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="gem" className="text-sm font-semibold text-gray-700 mb-2 block">
                            Select GEM User
                          </Label>
                          <Select value={selectedGem} onValueChange={setSelectedGem}>
                            <SelectTrigger className="w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                              <SelectValue placeholder="Choose a GEM user" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-0 shadow-lg">
                              {filteredGemUsers.length > 0 ? (
                                filteredGemUsers.map((gem) => (
                                  <SelectItem key={gem.id} value={gem.id} className="rounded-lg">
                                    <div className="flex items-center">
                                      <Users className="w-4 h-4 mr-2 text-gray-500" />
                                      {gem.name} ({gem.username})
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-gem" disabled>
                                  {selectedBranch ? 'No GEM users for this branch' : 'Select a branch first'}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setAssignmentDialog(false)}
                            className="px-6 py-2 rounded-xl border-gray-200 hover:bg-gray-50 font-medium"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleBulkAssignment}
                            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg"
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Assign {selectedLeads.length} Leads
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </Card>

          {/* Modern Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Leads</p>
                    <p className="text-3xl font-bold text-gray-900">{qualifiedLeads.length}</p>
                    <p className="text-xs text-gray-500 mt-1">All qualified leads</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Unassigned</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {qualifiedLeads.filter(lead => !lead.ps_name).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Need assignment</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Assigned</p>
                    <p className="text-3xl font-bold text-green-600">
                      {qualifiedLeads.filter(lead => lead.ps_name).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">In progress</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Modern Search and Filters */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Search Bar */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                    <Search className="w-4 h-4 mr-2" />
                    Search Leads
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Search by customer name, phone, lead UID, PS name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-gray-700 bg-white/50"
                    />
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Date Range Filter
                  </Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 bg-white/50"
                        placeholder="From"
                      />
                      <span className="text-gray-400 font-medium">to</span>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 bg-white/50"
                        placeholder="To"
                      />
                    </div>
                    {(startDate || endDate || searchTerm || sourceFilter !== 'all') && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm('')
                          setStartDate('')
                          setEndDate('')
                          setSourceFilter('all')
                        }}
                        className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600 font-medium px-4"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>

                {/* Source Filter */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    Source Filter
                  </Label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 bg-white/50">
                      <SelectValue placeholder="Select source filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="walkin">Walk-in & Digital Leads</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Meta">Meta</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="Car Dekho">Car Dekho</SelectItem>
                      <SelectItem value="Car Wale">Car Wale</SelectItem>
                      <SelectItem value="OEM">OEM</SelectItem>
                      <SelectItem value="Tele Out">Tele Out</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modern Leads Table */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm px-6 py-4">
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                Lead Management
                <Badge className="ml-3 bg-orange-100 text-orange-700 border-0">
                  {filteredLeads.length} leads
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-orange-50/50 to-orange-100/50 hover:bg-orange-50/70">
                      <TableHead className="w-12 text-center font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              const unassignedIds = filteredLeads.filter(lead => !lead.ps_name).map(lead => lead.id)
                              setSelectedLeads(unassignedIds)
                            } else {
                              setSelectedLeads([])
                            }
                          }}
                          className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          Location
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          Customer
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2" />
                          Mobile
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">Source</TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <Car className="w-4 h-4 mr-2" />
                          Model
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 mr-2" />
                          Branch
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">GEM User</TableHead>
                      <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads
                      .sort((a, b) => {
                        // Unassigned leads first, then assigned leads
                        if (!a.ps_name && b.ps_name) return -1
                        if (a.ps_name && !b.ps_name) return 1
                        return 0
                      })
                      .map((lead, index) => (
                      <TableRow 
                        key={lead.id} 
                        className={`hover:bg-orange-50/30 transition-all duration-200 border-0 ${
                          index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={(e) => handleLeadSelection(lead.id, e.target.checked)}
                            disabled={!!lead.ps_name}
                            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-700">
                          {lead.customer_location || (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-800">
                          {lead.customer_name}
                        </TableCell>
                        <TableCell className="text-gray-600 font-medium">
                          {lead.customer_mobile_number}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-0 font-medium px-3 py-1">
                            {lead.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700 font-medium">
                          {lead.model_interested || (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={lead.branch || ''} 
                            onValueChange={(branch) => handleBranchAssignment(lead.id, branch)}
                            disabled={!!lead.ps_name}
                          >
                            <SelectTrigger className="w-36 h-9 rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                              <SelectValue placeholder="Select Branch" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-0 shadow-lg">
                              {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.name} className="rounded-lg">
                                  <div className="flex items-center">
                                    <Building2 className="w-3 h-3 mr-2 text-gray-500" />
                                    {branch.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={selectedGems[lead.id] || ''} 
                            onValueChange={(gemName) => handleGemSelection(lead.id, gemName)}
                            disabled={!!lead.ps_name}
                          >
                            <SelectTrigger className="w-36 h-9 rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                              <SelectValue placeholder="Select GEM" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-0 shadow-lg">
                              {gemUsers
                                .filter(gem => !lead.branch || gem.branch === lead.branch)
                                .map((gem) => (
                                <SelectItem key={gem.id} value={gem.name} className="rounded-lg">
                                  <div className="flex items-center">
                                    <Users className="w-3 h-3 mr-2 text-gray-500" />
                                    {gem.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!lead.ps_name ? (
                              <Button
                                size="sm"
                                onClick={() => handleIndividualAssignment(lead.id)}
                                disabled={!lead.branch || !selectedGems[lead.id]}
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs px-4 py-2 rounded-lg font-medium shadow-sm disabled:opacity-50"
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Assign
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleDeassignment(lead.id)}
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs px-4 py-2 rounded-lg font-medium shadow-sm"
                              >
                                <UserX className="w-3 h-3 mr-1" />
                                Deassign
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(lead)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredLeads.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No leads found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your search filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
