"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { RefreshCw, Users, CheckCircle, XCircle, AlertCircle, UserCheck, UserX, Building2, MapPin, Calendar, Phone, Car, BarChart3, Filter, Search, Loader2, Zap, MessageSquare, Eye, ArrowUpDown, X, Clock } from 'lucide-react'

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
  trade_in_make?: string
  trade_in_model?: string
  trade_in_year?: string
  trade_in_km?: string
  trade_in_ownership?: string
  branch?: string
  ps_name?: string
  ps_id?: string
  icrop_id?: string
  created_at: string
  updated_at?: string
  lead_status: string
  final_status?: string
  metadata?: any
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
  
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [assignedCount, setAssignedCount] = useState(0)
  const [unassignedPages, setUnassignedPages] = useState(1)

  const [showCallHistory, setShowCallHistory] = useState(false)
  const [showTradeInDetails, setShowTradeInDetails] = useState(false)
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<QualifiedLead | null>(null)
  const [callHistory, setCallHistory] = useState<any[]>([])
  const [tradeInDetails, setTradeInDetails] = useState<any>(null)
  
  // Loading states for assignments
  const [assigningLeads, setAssigningLeads] = useState<Set<string>>(new Set())
  const [deassigningLeads, setDeassigningLeads] = useState<Set<string>>(new Set())
  const [isBulkAssigning, setIsBulkAssigning] = useState(false)

  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      setUser(JSON.parse(supabaseUser))
    }
    loadData(1) // Start with page 1
  }, [])

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadData(page)
  }

  useEffect(() => {
    if (selectedBranch) {
      setFilteredGemUsers(gemUsers.filter(gem => gem.branch === selectedBranch))
    } else {
      setFilteredGemUsers(gemUsers)
    }
  }, [selectedBranch, gemUsers])

  // Trigger search when searchTerm changes
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchTerm.trim()) {
        loadData(1, searchTerm)
      } else {
        loadData(currentPage)
      }
    }, 300) // Debounce for 300ms for real-time search
    
    return () => clearTimeout(searchTimeout)
  }, [searchTerm])

  useEffect(() => {
    // If search is active, the API has already filtered the results
    // Only apply frontend filtering for date and source filters
    if (searchTerm.trim()) {
      // Search results are already from API, just use them as-is
      setFilteredLeads(qualifiedLeads)
      return
    }
    
    // Apply frontend filtering only for date and source (not search)
    const hasActiveFilters = startDate || endDate || (sourceFilter !== 'all')
    
    if (hasActiveFilters) {
      let filtered = qualifiedLeads

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

      if (sourceFilter !== 'all') {
        if (sourceFilter === 'walkin') {
          filtered = filtered.filter(lead => ['Walk-in', 'Digital', 'Google', 'Meta', 'WhatsApp', 'Car Dekho', 'Car Wale', 'OEM', 'Tele Out', 'Referral', 'Other'].includes(lead.source))
        } else {
          filtered = filtered.filter(lead => lead.source === sourceFilter)
        }
      }

      filtered.sort((a, b) => {
        if (!a.ps_name && b.ps_name) return -1
        if (a.ps_name && !b.ps_name) return 1
        return 0
      })

      setFilteredLeads(filtered)
    } else {
      // No active filters - show the raw page data as-is from backend
      setFilteredLeads(qualifiedLeads)
    }
  }, [searchTerm, qualifiedLeads, startDate, endDate, sourceFilter])

  const loadData = async (page: number = currentPage, search?: string) => {
    setIsLoading(true)
    try {
      const timestamp = Date.now()
      let apiUrl = `/api/cre-team-leader/qualified-leads?page=${page}&limit=100&_t=${timestamp}`
      if (search && search.trim()) {
        apiUrl += `&search=${encodeURIComponent(search.trim())}&limit=1000`
      }
      
      const [leadsResponse, gemResponse, branchesResponse] = await Promise.all([
        fetch(apiUrl, {
          headers: { 'Cache-Control': 'no-store' }
        }),
        fetch(`/api/ps-users?_t=${timestamp}`, {
          headers: { 'Cache-Control': 'no-store' }
        }),
        fetch(`/api/branches?_t=${timestamp}`, {
          headers: { 'Cache-Control': 'no-store' }
        })
      ])
      
      const [leadsData, gemData, branchesData] = await Promise.all([
        leadsResponse.ok ? leadsResponse.json() : {leads: [], pagination: {}},
        gemResponse.ok ? gemResponse.json() : [],
        branchesResponse.ok ? branchesResponse.json() : []
      ])

      // Extract leads array and pagination info from the API response
      const leadsArray = leadsData.leads || []
      const pagination = leadsData.pagination || {}
      
      // Update pagination state
      setTotalPages(pagination.total_pages || 1)
      setTotalCount(pagination.total_count || 0)
      setUnassignedCount(pagination.unassigned_count || 0)
      setAssignedCount(pagination.assigned_count || 0)
      setUnassignedPages(pagination.unassigned_pages || 1)
      
      const sortedLeads = leadsArray.sort((a: any, b: any) => {
        if (!a.ps_name && b.ps_name) return -1
        if (a.ps_name && !b.ps_name) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      setQualifiedLeads(sortedLeads)
      setFilteredLeads(sortedLeads)
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
  }

  const handleLeadSelection = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId])
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId))
    }
  }

  const handleBranchAssignment = async (leadId: string, branch: string) => {
    // Just update the local state, don't make API call
    setQualifiedLeads(prev => 
      prev.map(lead => lead.id === leadId ? { ...lead, branch: branch } : lead)
    )
  }

  const handleGemSelection = (leadId: string, gemName: string) => {
    setSelectedGems(prev => ({ ...prev, [leadId]: gemName }))
  }

  const handleIndividualAssignment = async (leadId: string) => {
    // Add loading state
    setAssigningLeads(prev => new Set(prev).add(leadId))
    
    try {
      const lead = qualifiedLeads.find(l => l.id === leadId)
      if (!lead?.branch) {
        toast.error('Please select a branch first')
        return
      }

      const selectedGemName = selectedGems[leadId]
      if (!selectedGemName) {
        toast.error('Please select a GEM first')
        return
      }

      const gemUser = gemUsers.find(gem => gem.name === selectedGemName)
      if (!gemUser) return

      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      
      // Assign PS with branch info in one call
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
          ps_branch: gemUser.branch,
          branch: lead.branch  // Include the selected branch
        }),
      })

      if (response.ok) {
        toast.success(`Lead assigned to ${gemUser.name}`)
        setQualifiedLeads(prev => 
          prev.map(l => l.id === leadId ? { ...l, ps_name: gemUser.name, ps_id: gemUser.id } : l)
        )
        setSelectedGems(prev => {
          const newSelectedGems = { ...prev }
          delete newSelectedGems[leadId]
          return newSelectedGems
        })
      } else {
        toast.error('Failed to assign lead')
      }
    } catch (error) {
      toast.error('Failed to assign lead')
    } finally {
      setAssigningLeads(prev => {
        const newSet = new Set(prev)
        newSet.delete(leadId)
        return newSet
      })
    }
  }

  const handleDeassignment = async (leadId: string) => {
    // Add loading state
    setDeassigningLeads(prev => new Set(prev).add(leadId))
    
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      
      const response = await fetch('/api/qualified-leads/deassign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lead_id: leadId }),
      })
      
      if (response.ok) {
        toast.success('Lead deassigned successfully')
        setQualifiedLeads(prev => 
          prev.map(lead => lead.id === leadId ? { ...lead, ps_name: '', ps_id: '' } : lead)
        )
      } else {
        const errorData = await response.json()
        toast.error(`Failed to deassign lead: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deassigning lead:', error)
      toast.error('Failed to deassign lead')
    } finally {
      setDeassigningLeads(prev => {
        const newSet = new Set(prev)
        newSet.delete(leadId)
        return newSet
      })
    }
  }

  const handleBulkAssignment = async () => {
    if (selectedLeads.length === 0 || !selectedGem || !selectedBranch) {
      toast.error('Please select leads, branch, and a GEM user')
      return
    }

    setIsBulkAssigning(true)

    try {
      const selectedGemUser = gemUsers.find(gem => gem.id === selectedGem)
      if (!selectedGemUser) return

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
          ps_branch: selectedGemUser.branch,
          branch: selectedBranch  // Include the selected branch
        }),
      })

      if (response.ok) {
        toast.success(`Successfully assigned ${selectedLeads.length} leads`)
        setSelectedLeads([])
        setAssignmentDialog(false)
        setSelectedGem("")
        loadData(currentPage)
      } else {
        toast.error('Failed to assign leads')
      }
    } catch (error) {
      toast.error('Failed to assign leads')
    } finally {
      setIsBulkAssigning(false)
    }
  }

  const handleShowCallHistory = async (lead: QualifiedLead) => {
    setSelectedLeadForHistory(lead)
    setShowCallHistory(true)
    
    try {
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
          console.log('API call failed')
        }
      }
      
      setCallHistory(constructedHistory)
    } catch (error) {
      setCallHistory([])
    }
  }

  const handleShowTradeInDetails = async (lead: QualifiedLead) => {
    if (lead.trade_in?.toLowerCase() !== 'yes') {
      toast.error('No trade-in details available')
      return
    }

    setSelectedLeadForHistory(lead)
    setShowTradeInDetails(true)
    
    try {
      const supabaseUser = localStorage.getItem('supabase_user')
      if (supabaseUser) {
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
      setTradeInDetails(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-orange-200/20 to-orange-300/20 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-to-br from-orange-100/30 to-orange-200/30 rounded-full blur-2xl"></div>
        </div>

        <div className="relative z-10 p-6 space-y-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">CRE Team Leader Dashboard</h1>
                    <p className="text-orange-100 mt-1">Manage and assign qualified leads to GEM teams</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => loadData(currentPage)} 
                    disabled={isLoading}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Refresh
                  </Button>
                  <Dialog open={assignmentDialog} onOpenChange={setAssignmentDialog}>
                    <DialogTrigger asChild>
                      <Button disabled={selectedLeads.length === 0} className="bg-white text-orange-600">
                        <Users className="w-4 h-4 mr-2" />
                        Assign Selected ({selectedLeads.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Leads to GEM</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Branch</Label>
                          <Select value={selectedBranch} onValueChange={handleBranchChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>GEM User</Label>
                          <Select value={selectedGem} onValueChange={setSelectedGem}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose GEM" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredGemUsers.map((gem) => (
                                <SelectItem key={gem.id} value={gem.id}>{gem.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setAssignmentDialog(false)}>Cancel</Button>
                          <Button onClick={handleBulkAssignment} disabled={isBulkAssigning}>
                            {isBulkAssigning ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Assigning...
                              </>
                            ) : (
                              <>Assign {selectedLeads.length} Leads</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Leads</p>
                    <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
                    <p className="text-xs text-gray-500 mt-1">All qualified leads</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Unassigned</p>
                    <p className="text-3xl font-bold text-orange-600">{unassignedCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Need assignment</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Assigned</p>
                    <p className="text-3xl font-bold text-green-600">{assignedCount}</p>
                    <p className="text-xs text-gray-500 mt-1">In progress</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by customer name, phone, lead UID, PS name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-gray-200 focus:border-orange-500"
                />
              </div>

              <div className="flex items-center space-x-4">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border-gray-200"
                />
                <span className="text-gray-400">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border-gray-200"
                />
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="walkin">Walk-in & Digital</SelectItem>
                    <SelectItem value="Meta">Meta</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm.trim() || startDate || endDate || sourceFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setStartDate('')
                      setEndDate('')
                      setSourceFilter('all')
                    }}
                    className="rounded-xl"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                  Lead Management
                  <Badge className="ml-3 bg-orange-100 text-orange-700 border-0">
                    {filteredLeads.length} leads
                  </Badge>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    Page {currentPage} of {totalPages}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    Mixed Leads (Unassigned First)
                  </Badge>
                  {(searchTerm.trim() || startDate || endDate || sourceFilter !== 'all') && (
                    <Badge className="bg-orange-100 text-orange-700 text-xs">
                      Filtered
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No leads found</p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[700px]">
                  <div className="min-w-[1600px]">
                    <div className="bg-gradient-to-r from-orange-50/40 to-orange-100/40 border-b border-gray-200/60 px-6 py-4 sticky top-0 z-10">
                      <div className="grid grid-cols-[50px_140px_200px_120px_120px_150px_140px_140px_140px_180px_120px] gap-6 text-xs font-semibold text-gray-700 uppercase">
                        <div className="text-center">
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
                            className="w-4 h-4 text-orange-600 rounded"
                          />
                        </div>
                        <div>Date</div>
                        <div>Customer</div>
                        <div>Source</div>
                        <div>CRE</div>
                        <div>Lead Details</div>
                        <div>Branch</div>
                        <div>GEM User</div>
                        <div>Actions</div>
                        <div>View</div>
                        <div>Status</div>
                      </div>
                    </div>

                    <div>
                      {filteredLeads.map((lead, index) => (
                        <div key={lead.id} className={`border-b border-gray-200/60 px-6 py-4 ${
                          index % 2 === 0 ? 'bg-white/70' : 'bg-gray-50/60'
                        } hover:bg-orange-50/40`}>
                          <div className="grid grid-cols-[50px_140px_200px_120px_120px_150px_140px_140px_140px_180px_120px] gap-6 items-center">
                            <div className="text-center">
                              <input
                                type="checkbox"
                                checked={selectedLeads.includes(lead.id)}
                                onChange={(e) => handleLeadSelection(lead.id, e.target.checked)}
                                disabled={!!lead.ps_name}
                                className="w-4 h-4 text-orange-600 rounded"
                              />
                            </div>

                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(lead.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-semibold text-gray-800 truncate">{lead.customer_name}</div>
                              <div className="text-xs text-gray-600 truncate">{lead.customer_mobile_number}</div>
                            </div>

                            <Badge className="bg-blue-100 text-blue-700 text-xs truncate">
                              {lead.source}
                            </Badge>
                            <div className="text-sm text-gray-800 truncate">
                              {lead.cre_name || '-'}
                            </div>

                            <div>
                              <div className="text-sm font-semibold text-gray-900 truncate">{lead.lead_uid}</div>
                              <div className="text-xs text-gray-600 truncate">{lead.model_interested}</div>
                            </div>

                            <Select 
                              value={lead.branch || ''} 
                              onValueChange={(branch) => handleBranchAssignment(lead.id, branch)}
                              disabled={!!lead.ps_name}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue placeholder="Branch" />
                              </SelectTrigger>
                              <SelectContent>
                                {branches.map((branch) => (
                                  <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select 
                              value={selectedGems[lead.id] || ''} 
                              onValueChange={(gemName) => handleGemSelection(lead.id, gemName)}
                              disabled={!!lead.ps_name}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue placeholder="GEM" />
                              </SelectTrigger>
                              <SelectContent>
                                {gemUsers.filter(gem => !lead.branch || gem.branch === lead.branch).map((gem) => (
                                  <SelectItem key={gem.id} value={gem.name}>{gem.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex gap-2">
                              {!lead.ps_name ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleIndividualAssignment(lead.id)}
                                  disabled={!lead.branch || !selectedGems[lead.id] || assigningLeads.has(lead.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
                                >
                                  {assigningLeads.has(lead.id) ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <UserCheck className="w-3 h-3 mr-1" />
                                  )}
                                  {assigningLeads.has(lead.id) ? 'Assigning...' : 'Assign'}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleDeassignment(lead.id)}
                                  disabled={deassigningLeads.has(lead.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-3"
                                >
                                  {deassigningLeads.has(lead.id) ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <UserX className="w-3 h-3 mr-1" />
                                  )}
                                  {deassigningLeads.has(lead.id) ? 'Deassigning...' : 'Deassign'}
                                </Button>
                              )}
                            </div>

                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShowCallHistory(lead)}
                                className="text-xs h-7 px-2 border-blue-200 text-blue-600"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                              {lead.trade_in?.toLowerCase() === 'yes' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShowTradeInDetails(lead)}
                                  className="text-xs h-7 px-2 border-green-200 text-green-600"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            <div>
                              {lead.ps_name ? (
                                <Badge className="bg-green-100 text-green-700 text-xs truncate">
                                  {lead.ps_name}
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                  Unassigned
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 px-6 py-4 border-t border-gray-200/60">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing page {currentPage} of {totalPages} 
                    <span className="ml-2 text-blue-600 font-medium">
                      (Mixed leads: {totalCount} total, {unassignedCount} unassigned, {assignedCount} assigned)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1 || isLoading}
                      className="text-xs"
                    >
                      First
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                      className="text-xs"
                    >
                      Previous
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={isLoading}
                            className={`text-xs w-8 h-8 ${
                              currentPage === pageNum 
                                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                                : 'hover:bg-orange-50'
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoading}
                      className="text-xs"
                    >
                      Next
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages || isLoading}
                      className="text-xs"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {showCallHistory && selectedLeadForHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Call History</h2>
                <p className="text-blue-100">{selectedLeadForHistory.customer_name}</p>
              </div>
              <Button onClick={() => setShowCallHistory(false)} variant="ghost" className="text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {callHistory.length > 0 ? (
                <div className="space-y-4">
                  {callHistory.map((call, i) => (
                    <div key={i} className="border rounded-2xl p-4 bg-blue-50">
                      <Badge className="mb-2">{call.type}</Badge>
                      <p className="font-semibold">{call.subject}</p>
                      <p className="text-sm text-gray-600">{call.description}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(call.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No call history</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showTradeInDetails && selectedLeadForHistory && tradeInDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Trade-in Details</h2>
              <Button onClick={() => setShowTradeInDetails(false)} variant="ghost" className="text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Make</p>
                  <p className="font-semibold">{tradeInDetails.trade_in_make || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Model</p>
                  <p className="font-semibold">{tradeInDetails.trade_in_model || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Year</p>
                  <p className="font-semibold">{tradeInDetails.trade_in_year || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kilometers</p>
                  <p className="font-semibold">{tradeInDetails.trade_in_km || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
