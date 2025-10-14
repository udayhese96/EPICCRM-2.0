"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft,
  ArrowRight,
  Users,
  CheckCircle2,
  Loader2,
  Search,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { VirtualList } from "@/components/ui/virtual-list"

interface Lead {
  id: number
  uid: string
  customer_name: string
  customer_mobile_number: string
  cre_id: string | null
  cre_name: string | null
  ps_id: string | null
  ps_name: string | null
  final_status: string
  lead_status: string | null
  source: string | null
  model_interested: string | null
  updated_at: string
}

interface User {
  id: string
  username: string
  full_name: string
  role: string
  branch: string | null
}

export default function TransferLeadsV2Page() {
  const [activeTab, setActiveTab] = useState<"cre" | "ps">("cre")
  
  // Users
  const [creUsers, setCreUsers] = useState<User[]>([])
  const [psUsers, setPsUsers] = useState<User[]>([])
  
  // CRE Transfer State
  const [fromCRE, setFromCRE] = useState("")
  const [toCRE, setToCRE] = useState("")
  const [creLeads, setCreLeads] = useState<Lead[]>([])
  const [selectedCreLeads, setSelectedCreLeads] = useState<Set<number>>(new Set())
  
  // PS Transfer State
  const [fromPS, setFromPS] = useState("")
  const [toPS, setToPS] = useState("")
  const [psLeads, setPsLeads] = useState<Lead[]>([])
  const [selectedPsLeads, setSelectedPsLeads] = useState<Set<number>>(new Set())
  
  // UI State
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [transferring, setTransferring] = useState(false)

  // Fetch users on mount
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const supabase = createClient()
      
      // Fetch CRE users
      const { data: cres } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'cre')
        .eq('is_active', true)
        .order('full_name')
      
      // Fetch PS users  
      const { data: pss } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'ps')
        .eq('is_active', true)
        .order('full_name')
      
      setCreUsers(cres || [])
      setPsUsers(pss || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Load CRE leads
  const loadCreLeads = async () => {
    if (!fromCRE) {
      alert('Please select a CRE first')
      return
    }

    setIsLoading(true)
    setSelectedCreLeads(new Set())
    
    try {
      const timestamp = Date.now()
      const response = await fetch(
        `/api/admin/transfer-leads/get-cre-leads?cre_id=${fromCRE}&_t=${timestamp}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        }
      )
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leads')
      }
      
      setCreLeads(data.leads || [])
    } catch (error: any) {
      console.error('Error loading CRE leads:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Load PS leads
  const loadPsLeads = async () => {
    if (!fromPS) {
      alert('Please select a PS first')
      return
    }

    setIsLoading(true)
    setSelectedPsLeads(new Set())
    
    try {
      const timestamp = Date.now()
      const response = await fetch(
        `/api/admin/transfer-leads/get-ps-leads?ps_id=${fromPS}&_t=${timestamp}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        }
      )
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leads')
      }
      
      setPsLeads(data.leads || [])
    } catch (error: any) {
      console.error('Error loading PS leads:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Transfer leads
  const handleTransfer = async () => {
    const isCre = activeTab === 'cre'
    const selectedIds = isCre ? Array.from(selectedCreLeads) : Array.from(selectedPsLeads)
    const fromId = isCre ? fromCRE : fromPS
    const toId = isCre ? toCRE : toPS
    const toUser = isCre ? creUsers.find(u => u.id === toCRE) : psUsers.find(u => u.id === toPS)

    if (selectedIds.length === 0) {
      alert('Please select at least one lead to transfer')
      return
    }

    if (!toId) {
      alert('Please select a target user')
      return
    }

    if (fromId === toId) {
      alert('Source and target cannot be the same')
      return
    }

    const confirmed = confirm(
      `Transfer ${selectedIds.length} lead(s) to ${toUser?.full_name}?`
    )

    if (!confirmed) return

    setTransferring(true)

    try {
      const response = await fetch('/api/admin/transfer-leads/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          lead_ids: selectedIds,
          transfer_type: isCre ? 'cre' : 'ps',
          from_id: fromId,
          to_id: toId,
          to_name: toUser?.full_name || toUser?.username || ''
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Transfer failed')
      }

      alert(`✅ Successfully transferred ${result.transferred} lead(s)!`)

      // Force reload leads from both source and target with cache bypass
      if (isCre) {
        await loadCreLeads() // Reload source CRE's leads
        setSelectedCreLeads(new Set())
      } else {
        await loadPsLeads() // Reload source PS's leads
        setSelectedPsLeads(new Set())
      }

    } catch (error: any) {
      console.error('Transfer error:', error)
      alert(`❌ Transfer failed: ${error.message}`)
    } finally {
      setTransferring(false)
    }
  }

  // Filter leads by search query
  const filteredCreLeads = creLeads.filter(lead => 
    !searchQuery || 
    lead.uid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.customer_mobile_number?.includes(searchQuery)
  )

  const filteredPsLeads = psLeads.filter(lead =>
    !searchQuery ||
    lead.uid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.customer_mobile_number?.includes(searchQuery)
  )

  // Select/deselect all
  const handleSelectAllCre = (checked: boolean) => {
    if (checked) {
      setSelectedCreLeads(new Set(filteredCreLeads.map(l => l.id)))
    } else {
      setSelectedCreLeads(new Set())
    }
  }

  const handleSelectAllPs = (checked: boolean) => {
    if (checked) {
      setSelectedPsLeads(new Set(filteredPsLeads.map(l => l.id)))
    } else {
      setSelectedPsLeads(new Set())
    }
  }

  // Toggle individual lead
  const toggleCreLead = (id: number) => {
    const newSet = new Set(selectedCreLeads)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedCreLeads(newSet)
  }

  const togglePsLead = (id: number) => {
    const newSet = new Set(selectedPsLeads)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedPsLeads(newSet)
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/admin/dashboard">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Lead Transfer Center
            </h1>
            <p className="text-gray-600 mt-2">Transfer leads between CREs or PSs efficiently</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <Button
              onClick={() => setActiveTab('cre')}
              variant={activeTab === 'cre' ? 'default' : 'outline'}
              className="flex-1 rounded-xl h-14"
            >
              <Users className="h-5 w-5 mr-2" />
              CRE Transfer
            </Button>
            <Button
              onClick={() => setActiveTab('ps')}
              variant={activeTab === 'ps' ? 'default' : 'outline'}
              className="flex-1 rounded-xl h-14"
            >
              <Users className="h-5 w-5 mr-2" />
              PS Transfer
            </Button>
          </div>

          {/* CRE Transfer */}
          {activeTab === 'cre' && (
            <Card className="rounded-3xl shadow-xl border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-3xl">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  CRE Lead Transfer
                </CardTitle>
                <CardDescription>
                  Transfer leads from one CRE to another
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Selection Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>From CRE</Label>
                    <Select value={fromCRE} onValueChange={setFromCRE}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select CRE" />
                      </SelectTrigger>
                      <SelectContent>
                        {creUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.branch || 'N/A'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={loadCreLeads}
                      disabled={!fromCRE || isLoading}
                      className="w-full rounded-xl h-10"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Load Leads
                        </>
                      )}
                    </Button>
                  </div>

                  <div>
                    <Label>To CRE</Label>
                    <Select value={toCRE} onValueChange={setToCRE}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select target CRE" />
                      </SelectTrigger>
                      <SelectContent>
                        {creUsers.filter(u => u.id !== fromCRE).map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.branch || 'N/A'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search */}
                {creLeads.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by UID, name, or mobile..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                )}

                {/* Leads List */}
                {creLeads.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedCreLeads.size === filteredCreLeads.length && filteredCreLeads.length > 0}
                          onCheckedChange={handleSelectAllCre}
                        />
                        <span className="text-sm text-gray-600">
                          {selectedCreLeads.size} of {filteredCreLeads.length} selected
                        </span>
                      </div>
                      <Button
                        onClick={handleTransfer}
                        disabled={selectedCreLeads.size === 0 || !toCRE || transferring}
                        className="rounded-xl"
                      >
                        {transferring ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Transferring...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Transfer {selectedCreLeads.size} Lead(s)
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Virtualized List */}
                    <div className="border rounded-xl overflow-hidden">
                      <VirtualList
                        height={500}
                        itemCount={filteredCreLeads.length}
                        itemSize={80}
                        className="bg-white"
                      >
                        {({ index, style }) => {
                          const lead = filteredCreLeads[index]
                          const isSelected = selectedCreLeads.has(lead.id)
                          
                          return (
                            <div
                              key={lead.id}
                              style={style}
                              className={`flex items-center gap-4 px-4 border-b hover:bg-gray-50 cursor-pointer ${
                                isSelected ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => toggleCreLead(lead.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleCreLead(lead.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-blue-600">{lead.uid}</span>
                                  <Badge variant="outline">{lead.final_status}</Badge>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {lead.customer_name} • {lead.customer_mobile_number}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {lead.model_interested} • {lead.source}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(lead.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                          )
                        }}
                      </VirtualList>
                    </div>
                  </div>
                )}

                {creLeads.length === 0 && fromCRE && !isLoading && (
                  <div className="text-center py-12 text-gray-500">
                    No leads found for this CRE
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* PS Transfer - Similar structure */}
          {activeTab === 'ps' && (
            <Card className="rounded-3xl shadow-xl border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-3xl">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-green-600" />
                  PS Lead Transfer
                </CardTitle>
                <CardDescription>
                  Transfer leads from one PS to another
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Similar content as CRE but for PS */}
                <div className="text-center py-12 text-gray-500">
                  PS Transfer functionality - Similar to CRE Transfer
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

