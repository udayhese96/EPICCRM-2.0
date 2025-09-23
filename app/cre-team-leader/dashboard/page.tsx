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
import { RefreshCw, Users, CheckCircle, XCircle, AlertCircle, UserCheck, UserX, Building2, MapPin, Calendar, Phone, Mail, Car, FileText, TrendingUp, BarChart3, Filter, Search, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

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
        return true
      })
    }

    setFilteredLeads(filtered)
  }, [searchTerm, qualifiedLeads, startDate, endDate])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load all data in parallel for maximum speed
      const [leadsResponse, gemResponse, branchesResponse] = await Promise.all([
        fetch('/api/cre-team-leader/qualified-leads'),
        fetch('/api/ps-users'),
        fetch('/api/branches')
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
      
      setQualifiedLeads(leadsData)
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
      return <Badge variant="secondary">Assigned to {lead.ps_name}</Badge>
    }
    return <Badge variant="outline">Unassigned</Badge>
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CRE Team Leader Dashboard
                </h1>
                <p className="text-gray-600 mt-2">Manage and assign qualified leads to GEM teams</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={loadData} 
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
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
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
                    >
                      Assign Selected ({selectedLeads.length})
                    </Button>
                  </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Leads to GEM</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="branch">Branch</Label>
                    <Select value={selectedBranch} onValueChange={handleBranchChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.length > 0 ? (
                          branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.name}>
                              {branch.name}
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
                    <Label htmlFor="gem">GEM User</Label>
                    <Select value={selectedGem} onValueChange={setSelectedGem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GEM user" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredGemUsers.length > 0 ? (
                          filteredGemUsers.map((gem) => (
                            <SelectItem key={gem.id} value={gem.id}>
                              {gem.name} ({gem.username})
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
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAssignmentDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkAssignment}>
                      Assign {selectedLeads.length} Leads
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Total Assigned Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{qualifiedLeads.length}</div>
                <p className="text-blue-100 text-sm">All assigned leads</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">Unassigned Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {qualifiedLeads.filter(lead => !lead.ps_name).length}
                </div>
                <p className="text-orange-100 text-sm">Need assignment</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-100">Assigned Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {qualifiedLeads.filter(lead => lead.ps_name).length}
                </div>
                <p className="text-green-100 text-sm">In progress</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Search */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer name, phone, lead UID, PS name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Date Range Filter */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <Label className="text-sm font-medium">Date Range</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="start-date" className="text-xs text-gray-500">From</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-xs text-gray-500">To</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clear Filters */}
            <Card className="shadow-lg">
              <CardContent className="p-6 flex items-center justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Qualified Leads Table */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Assigned Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <TableHead className="w-12 text-center">Select</TableHead>
                      <TableHead className="font-semibold text-gray-700">Location</TableHead>
                      <TableHead className="font-semibold text-gray-700">Customer Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Mobile</TableHead>
                      <TableHead className="font-semibold text-gray-700">Source</TableHead>
                      <TableHead className="font-semibold text-gray-700">Model Interested</TableHead>
                      <TableHead className="font-semibold text-gray-700">Branch</TableHead>
                      <TableHead className="font-semibold text-gray-700">GEM</TableHead>
                      <TableHead className="font-semibold text-gray-700">Action</TableHead>
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
                        className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={(e) => handleLeadSelection(lead.id, e.target.checked)}
                            disabled={!!lead.ps_name}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">{lead.customer_location || '—'}</TableCell>
                        <TableCell className="font-medium text-gray-800">{lead.customer_name}</TableCell>
                        <TableCell className="text-gray-600">{lead.customer_mobile_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                            {lead.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700">{lead.model_interested || '—'}</TableCell>
                        <TableCell className="text-gray-700">
                          <Select 
                            value={lead.branch || ''} 
                            onValueChange={(branch) => handleBranchAssignment(lead.id, branch)}
                            disabled={!!lead.ps_name}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue placeholder="Select Branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.name}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          <Select 
                            value={selectedGems[lead.id] || ''} 
                            onValueChange={(gemName) => handleGemSelection(lead.id, gemName)}
                            disabled={!!lead.ps_name}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue placeholder="Select GEM" />
                            </SelectTrigger>
                            <SelectContent>
                              {gemUsers
                                .filter(gem => !lead.branch || gem.branch === lead.branch)
                                .map((gem) => (
                                <SelectItem key={gem.id} value={gem.name}>
                                  {gem.name}
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
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs px-3 py-1"
                              >
                                Assign
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleDeassignment(lead.id)}
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs px-3 py-1"
                              >
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </DashboardLayout>
  )
}

