"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRightLeft, Users, Phone, Mail, Calendar, X, Plus, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { DndContext, DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core"
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface CREUser {
  id: string
  name: string
  username: string
}

interface Lead {
  id: string
  uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  created_at: string
}

interface AssignmentData {
  [source: string]: {
    cre: string
    leads: string[]
  }
}

type BucketAssignment = {
  creId: string
  creName: string
  count: number
}

export default function AssignLeadsPage() {
  const [unassignedData, setUnassignedData] = useState<any>(null)
  const [selectedLeads, setSelectedLeads] = useState<{ [source: string]: string[] }>({})
  const [assignments, setAssignments] = useState<AssignmentData>({})
  const [loading, setLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [showAddLeadModal, setShowAddLeadModal] = useState(false)
  const [addLeadForm, setAddLeadForm] = useState({
    customer_name: "",
    customer_mobile_number: "",
    source: "",
    sub_source: "",
    assigned_cre_id: "",
    assigned_cre_name: ""
  })
  const SOURCE_OPTIONS: { [key: string]: string[] } = {
    "Google": ["Web", "Tele In", "GMB Tele In"],
    "WhatsApp": ["Tele In", "Bulk Message"],
    "CarDekho": ["CD B", "CD G"],
    "CarWale": ["CWA", "CWB", "CWC", "CWG", "CWH", "CWK"],
    "OEM": ["Dealer CMS", "TKM"],
    "Meta": ["Web"],
    "Tele Out": ["Web"],
    "Referral": [],
    "Other": []
  }
  const [bucketAssignments, setBucketAssignments] = useState<{ [source: string]: BucketAssignment[] }>({})

  useEffect(() => {
    fetchUnassignedLeads()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing && !loading && !isAssigning) {
        console.log('[assign-leads] Auto-refreshing data...')
        fetchUnassignedLeads()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [isRefreshing, loading, isAssigning])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchUnassignedLeads()
    } finally {
      setIsRefreshing(false)
    }
  }

  const getToken = () => {
    if (typeof window === 'undefined') return ''
    
    // Try multiple possible keys for user data
    const possibleKeys = ['user', 'supabase_user', 'current_user']
    let session = null
    
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          session = JSON.parse(data)
          if (session?.access_token) {
            console.log('[assign-leads] Found token in localStorage key:', key)
            break
          }
        } catch (e) {
          console.error('[assign-leads] Error parsing localStorage key:', key, e)
        }
      }
    }
    
    const token = session?.access_token || ''
    console.log('[assign-leads] Token retrieved:', token ? 'Token exists' : 'No token')
    return token
  }

  const fetchAvailableCREs = async (): Promise<any[]> => {
    console.log('[assign-leads] Fetching available CREs...')
    const token = getToken()
    
    try {
      const headers: any = { 
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // Add cache-busting timestamp
      const timestamp = Date.now()
      const res = await fetch(`/api/cre-users?_t=${timestamp}`, { headers })
      console.log('[assign-leads] /api/cre-users response:', res.status, res.ok)
      if (res.ok) {
        const list = await res.json()
        console.log('[assign-leads] /api/cre-users data:', list)
        // CRE users from /api/cre-users already have role='cre' and are active, so no need to filter
        const result = (Array.isArray(list) ? list : []).map((u: any) => ({ 
          id: u.id, 
          name: u.name || u.full_name || u.username, 
          username: u.username, 
          role: 'cre', 
          is_active: u.is_active ?? true 
        }))
        console.log('[assign-leads] Mapped CREs from /api/cre-users:', result)
        if (result.length > 0) return result
      } else {
        const errorText = await res.text()
        console.error('[assign-leads] /api/cre-users error:', res.status, errorText)
      }
    } catch (e) {
      console.error('[assign-leads] Error fetching from /api/cre-users:', e)
    }
    // Fallback: unified users table with role filter
    try {
      console.log('[assign-leads] Trying fallback /api/users?role=cre...')
      const headers: any = { 
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // Add cache-busting timestamp
      const timestamp = Date.now()
      const res2 = await fetch(`/api/users?role=cre&_t=${timestamp}`, { headers })
      console.log('[assign-leads] /api/users?role=cre response:', res2.status, res2.ok)
      if (res2.ok) {
        const list2 = await res2.json()
        console.log('[assign-leads] /api/users?role=cre data:', list2)
        // Handle the response structure from /api/users which returns { users: [...] }
        const users = list2.users || list2
        const result = (Array.isArray(users) ? users : [])
          .filter((u: any) => (u.role || '').toLowerCase() === 'cre' && (u.is_active ?? true))
          .map((u: any) => ({ id: u.id, name: u.full_name || u.name || u.username, username: u.username, role: u.role, is_active: u.is_active }))
        console.log('[assign-leads] Final CREs result:', result)
        return result
      } else {
        const errorText = await res2.text()
        console.error('[assign-leads] /api/users?role=cre error:', res2.status, errorText)
      }
    } catch (e) {
      console.error('[assign-leads] Error fetching from /api/users?role=cre:', e)
    }
    
    // Final fallback: return empty array
    console.log('[assign-leads] All API calls failed, returning empty CRE list')
    return []
  }

  const fetchUnassignedLeads = async () => {
    try {
      console.log('[assign-leads] Starting fresh data fetch...')
      // Load CREs first so UI can show them even if unassigned API fails
      const creList = await fetchAvailableCREs()
      const timestamp = Date.now()
      
      // Try the authenticated endpoint first
      let response = await fetch(`/api/leads/unassigned?_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      // If authenticated endpoint fails, try public endpoint
      if (!response.ok) {
        console.warn('[assign-leads] Authenticated endpoint failed, trying public endpoint...')
        response = await fetch(`/api/public/unassigned?_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
      
      if (response.ok) {
        const data = await response.json()
        console.log('[assign-leads] Unassigned leads summary:', data)
        // Recompute accurate per-source counts using the per-source listing API
        const sourceList: string[] = Object.keys(data?.by_source || {})
        console.log('[assign-leads] Sources to fetch:', sourceList)
        
        const results = await Promise.all(
          sourceList.map(async (src) => {
            try {
              const r = await fetch(`/api/leads/unassigned/${encodeURIComponent(src)}?_t=${timestamp}&_cb=${Date.now()}`, {
                headers: { 
                  'Authorization': `Bearer ${getToken()}`, 
                  'Cache-Control': 'no-store, no-cache, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              })
              console.log(`[assign-leads] ${src} API response status:`, r.status)
              if (!r.ok) {
                // Try public endpoint
                const r2 = await fetch(`/api/public/unassigned/${encodeURIComponent(src)}?_t=${timestamp}&_cb=${Date.now()}`, {
                  headers: { 
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  }
                })
                if (!r2.ok) return []
                const list: any[] = await r2.json()
                console.log(`[assign-leads] list for ${src}:`, list.length, list)
                console.log(`[assign-leads] ${src} leads:`, list.map(l => `${l.uid}(${l.assigned})`))
                return list
              }
              const list: any[] = await r.json()
              console.log(`[assign-leads] list for ${src}:`, list.length, list)
              console.log(`[assign-leads] ${src} leads:`, list.map(l => `${l.uid}(${l.assigned})`))
              return list
            } catch (err) {
              console.error(`[assign-leads] Error fetching ${src}:`, err)
              return []
            }
          })
        )
        
        // Group leads by source + subsource combination
        const by_source: Record<string, number> = {}
        let total_unassigned = 0
        
        for (const leads of results) {
          for (const lead of leads) {
            const source = lead.source || 'Unknown'
            const subSource = lead.sub_source || ''
            
            // Create combined key: "Meta + Ads" or just "Meta" if no subsource
            const combinedKey = subSource ? `${source} + ${subSource}` : source
            
            by_source[combinedKey] = (by_source[combinedKey] || 0) + 1
            total_unassigned += 1
          }
        }
        console.log('[assign-leads] recomputed by_source:', by_source, 'total:', total_unassigned)
        setUnassignedData({
          ...data,
          available_cres: creList,
          by_source,
          total_unassigned,
        })
      } else {
        let err: any = {}
        try { err = await response.json() } catch { err = { error: await response.text() } }
        console.error('[assign-leads] Failed to load unassigned leads:', err)
        // Don't show alert, just fall back silently
        // Fallback: probe known sources individually to build counts
        const candidateSources = [
          'BTL','Meta','META','GOOGLE','Google','Car Dekho','Car Wale','CarWale','Telein','Landing Page','Walkin','Walk-in','WhatsApp','OEM','Tele Out','Referral','Other'
        ]
        const probe = await Promise.all(candidateSources.map(async (src) => {
          try {
            // Try public endpoint for fallback
            const r = await fetch(`/api/public/unassigned/${encodeURIComponent(src)}?_t=${Date.now()}`, {
              headers: { 
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            })
            if (!r.ok) return []
            const list: any[] = await r.json()
            console.log(`[assign-leads] Fallback found ${list.length} leads for ${src}`)
            return list
          } catch {
            return []
          }
        }))
        
        // Group leads by source + subsource combination in fallback
        const by_source: Record<string, number> = {}
        let total_unassigned = 0
        
        for (const leads of probe) {
          for (const lead of leads) {
            const source = lead.source || 'Unknown'
            const subSource = lead.sub_source || ''
            
            // Create combined key: "Meta + Ads" or just "Meta" if no subsource
            const combinedKey = subSource ? `${source} + ${subSource}` : source
            
            by_source[combinedKey] = (by_source[combinedKey] || 0) + 1
            total_unassigned += 1
          }
        }
        console.log('[assign-leads] Fallback - Setting unassigned data:', by_source)
        setUnassignedData({ by_source, total_unassigned, available_cres: creList })
      }
    } catch (error) {
      console.error('Error fetching unassigned leads:', error)
      const creList = await fetchAvailableCREs()
      console.log('[assign-leads] Error fallback - Setting unassigned data with CREs:', creList)
      setUnassignedData({ by_source: {}, total_unassigned: 0, available_cres: creList })
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }

  const handleCRESelection = (source: string, creId: string, creName: string) => {
    setAssignments(prev => ({
      ...prev,
      [source]: {
        cre: creId,
        leads: selectedLeads[source] || []
      }
    }))

    // Auto-select all leads for this source when CRE is selected
    if (!selectedLeads[source]) {
      setSelectedLeads(prev => ({
        ...prev,
        [source]: [] // Will be populated when leads are shown
      }))
    }
  }

  const handleLeadSelection = (source: string, leadId: string, isSelected: boolean) => {
    setSelectedLeads(prev => ({
      ...prev,
      [source]: isSelected 
        ? [...(prev[source] || []), leadId]
        : (prev[source] || []).filter(id => id !== leadId)
    }))
  }

  const handleAssignLeads = async () => {
    setIsAssigning(true)
    try {
      // Track total assigned count for each source
      const sourceAssignments: { [source: string]: number } = {}
      
      // Resolve per-source counts to concrete lead IDs and assign per CRE
      for (const [source, creBatches] of Object.entries(bucketAssignments)) {
        if (!creBatches || creBatches.length === 0) continue
        
        // Calculate total assigned for this source
        const totalAssignedForSource = creBatches.reduce((sum, batch) => sum + batch.count, 0)
        sourceAssignments[source] = totalAssignedForSource
        
        // Fetch fresh unassigned leads for this source
        const listResp = await fetch(`/api/leads/unassigned/${encodeURIComponent(source)}`, {
          headers: { 'Authorization': `Bearer ${getToken()}`, 'Cache-Control': 'no-store' }
        })
        if (!listResp.ok) throw new Error(`Failed to load leads for ${source}`)
        const leads: Lead[] = await listResp.json()

        let cursor = 0
        for (const batch of creBatches) {
          if (batch.count <= 0) continue
          const slice = leads.slice(cursor, cursor + batch.count)
          cursor += batch.count
          if (slice.length === 0) continue
          const assignmentData = {
            lead_ids: slice.map(l => l.uid),
            cre_id: batch.creId,
            cre_name: batch.creName
          }
          console.log('[assign-leads] Assignment data:', assignmentData)
          
          const response = await fetch(`/api/leads/assign?_t=${Date.now()}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            },
            body: JSON.stringify(assignmentData)
          })
          
          console.log('[assign-leads] Assignment response status:', response.status)
          const responseText = await response.text()
          console.log('[assign-leads] Assignment response:', responseText)
          if (!response.ok) throw new Error(`Failed to assign to ${batch.creName}`)
        }
      }

      // Update local state immediately to reflect the assignments
      setUnassignedData((prev: any) => {
        if (!prev) return prev
        
        const updatedBySource = { ...prev.by_source }
        let newTotalUnassigned = prev.total_unassigned
        
        // Update counts for each source that had assignments
        for (const [source, assignedCount] of Object.entries(sourceAssignments)) {
          const currentCount = updatedBySource[source] || 0
          const newCount = Math.max(0, currentCount - assignedCount)
          
          if (newCount === 0) {
            delete updatedBySource[source]
          } else {
            updatedBySource[source] = newCount
          }
          
          newTotalUnassigned -= assignedCount
        }
        
        return {
          ...prev,
          by_source: updatedBySource,
          total_unassigned: Math.max(0, newTotalUnassigned)
        }
      })

      // Reset selections and assignments
      setSelectedLeads({})
      setAssignments({})
      setBucketAssignments({})
      
      // Update last refresh time
      setLastRefresh(new Date())
      
      // Add a small delay to ensure database consistency, then refresh from server
      setTimeout(async () => {
        console.log('[assign-leads] Refreshing data after assignment to ensure consistency...')
        try {
          await fetchUnassignedLeads()
          console.log('[assign-leads] Data refreshed successfully after assignment')
        } catch (error) {
          console.error('[assign-leads] Error refreshing data after assignment:', error)
        }
      }, 1500) // 1.5 second delay to ensure database consistency
      
      alert('Leads assigned successfully!')
    } catch (error) {
      console.error('Error assigning leads:', error)
      alert('Error assigning leads. Please try again.')
    } finally {
      setIsAssigning(false)
    }
  }

  const getTotalSelectedLeads = () => {
    return Object.values(selectedLeads).reduce((total, leads) => total + leads.length, 0)
  }

  const getTotalAssignedCount = () => {
    return Object.values(bucketAssignments).flat().reduce((t, a) => t + a.count, 0)
  }

  const removeAssignment = (source: string) => {
    setAssignments(prev => {
      const updated = { ...prev }
      delete updated[source]
      return updated
    })
    setSelectedLeads(prev => {
      const updated = { ...prev }
      delete updated[source]
      return updated
    })
  }

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Basic mobile validation (10 digits)
      const mobile = (addLeadForm.customer_mobile_number || '').trim()
      if (!/^\d{10}$/.test(mobile)) {
        alert('Enter a valid 10-digit phone number')
        return
      }
      const response = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({
          ...addLeadForm,
          sub_source: addLeadForm.sub_source === "none" ? "" : (addLeadForm.sub_source || "")
        })
      })

      if (response.ok) {
        // If the lead was assigned to a CRE, it won't affect unassigned counts
        // If it wasn't assigned, we need to increment the unassigned count for that source
        if (!addLeadForm.assigned_cre_id && addLeadForm.source) {
          setUnassignedData((prev: any) => {
            if (!prev) return prev
            
            const updatedBySource = { ...prev.by_source }
            const currentCount = updatedBySource[addLeadForm.source] || 0
            updatedBySource[addLeadForm.source] = currentCount + 1
            
            return {
              ...prev,
              by_source: updatedBySource,
              total_unassigned: prev.total_unassigned + 1
            }
          })
        }
        
        setAddLeadForm({
          customer_name: "",
          customer_mobile_number: "",
          source: "",
          sub_source: "",
          assigned_cre_id: "",
          assigned_cre_name: ""
        })
        setShowAddLeadModal(false)
        setLastRefresh(new Date())
        alert('Lead added successfully!')
      } else {
        alert('Error adding lead. Please try again.')
      }
    } catch (error) {
      console.error('Error adding lead:', error)
      alert('Error adding lead. Please try again.')
    }
  }

  const handleCRESelectionForNewLead = (creId: string) => {
    const cre = unassignedData?.available_cres?.find((c: CREUser) => c.id === creId)
    if (cre) {
      setAddLeadForm(prev => ({
        ...prev,
        assigned_cre_id: creId,
        assigned_cre_name: cre.name
      }))
    }
  }

  // --- Drag and Drop helpers ---
  const handleDragEnd = (event: DragEndEvent) => {
    // no-op for the top list
  }

  const handleDropOnSource = (event: DragEndEvent) => {
    const overId = event.over?.id as string | undefined
    const active = event.active
    if (!overId || !String(overId).startsWith("source-")) return
    const source = String(overId).replace("source-", "")
    const cre = (active.data.current as any)?.cre as CREUser | undefined
    if (!cre) return
    addToBucket(source, cre)
  }

  const addToBucket = (source: string, cre: CREUser) => {
    const totalForSource = Number((unassignedData?.by_source || {})[source] || 0)
    setBucketAssignments(prev => {
      const list = prev[source] ? [...prev[source]] : []
      const assignedTotal = list.reduce((t, a) => t + a.count, 0)
      const remaining = Math.max(0, totalForSource - assignedTotal)
      if (remaining === 0) return prev
      const existingIndex = list.findIndex(b => b.creId === cre.id)
      if (existingIndex >= 0) {
        list[existingIndex] = { ...list[existingIndex], count: Math.min(list[existingIndex].count + 1, list[existingIndex].count + remaining) }
      } else {
        list.push({ creId: cre.id, creName: cre.name, count: Math.min(1, remaining) })
      }
      return { ...prev, [source]: list }
    })
  }

  const updateBucketCount = (source: string, creId: string, delta: number) => {
    setBucketAssignments(prev => {
      const list = prev[source] ? [...prev[source]] : []
      const index = list.findIndex(b => b.creId === creId)
      if (index === -1) return prev
      const totalForSource = Number((unassignedData?.by_source || {})[source] || 0)
      const assignedOthers = list
        .filter((b, i) => i !== index)
        .reduce((t, a) => t + a.count, 0)
      const maxForThis = Math.max(0, totalForSource - assignedOthers)
      const newCount = Math.max(0, Math.min(maxForThis, list[index].count + delta))
      if (newCount === 0) {
        list.splice(index, 1)
      } else {
        list[index] = { ...list[index], count: newCount }
      }
      return { ...prev, [source]: list }
    })
  }

  const removeFromBucket = (source: string, creId: string) => {
    setBucketAssignments(prev => {
      const list = prev[source] ? [...prev[source]] : []
      const next = list.filter(b => b.creId !== creId)
      return { ...prev, [source]: next }
    })
  }

  const setBucketForSource = (source: string, list: BucketAssignment[]) => {
    setBucketAssignments(prev => ({ ...prev, [source]: list }))
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading unassigned leads...</div>
        </div>
      </DashboardLayout>
    )
  }

  const computedTotal = Object.values(unassignedData?.by_source || {}).reduce((t: number, n: any) => t + Number(n || 0), 0)

  return (
    <DashboardLayout>
      <DndContext onDragEnd={(e) => { handleDragEnd(e); handleDropOnSource(e) }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🚀 Smart Dynamic Lead Assignment</h1>
            <p className="text-gray-600 mt-1">Assign unassigned leads to available CREs efficiently</p>
            {lastRefresh && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refresh every 30s
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" size="sm" asChild className="rounded-xl bg-white/70 border-none shadow hover:bg-gray-50">
              <Link href="/admin/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <Button 
              onClick={handleManualRefresh} 
              disabled={isRefreshing || loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </Button>
            <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Lead with CRE Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Lead with CRE Assignment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddLead} className="space-y-4">
                  <div>
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={addLeadForm.customer_name}
                      onChange={(e) => setAddLeadForm(prev => ({ ...prev, customer_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_mobile_number">Phone Number *</Label>
                    <Input
                      id="customer_mobile_number"
                      type="tel"
                      value={addLeadForm.customer_mobile_number}
                      onChange={(e) => setAddLeadForm(prev => ({ ...prev, customer_mobile_number: e.target.value }))}
                      pattern="[0-9]{10}"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="assigned_cre">Assigned CRE *</Label>
                    <Select value={addLeadForm.assigned_cre_id} onValueChange={handleCRESelectionForNewLead}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select CRE" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedData?.available_cres?.map((cre: CREUser) => (
                          <SelectItem key={cre.id} value={cre.id}>
                            {cre.name} ({cre.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="source">Source *</Label>
                    <Select value={addLeadForm.source} onValueChange={(value) => setAddLeadForm(prev => ({ ...prev, source: value, sub_source: "" }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(SOURCE_OPTIONS).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sub_source">Subsource</Label>
                    <Select
                      value={addLeadForm.sub_source}
                      onValueChange={(value) => setAddLeadForm(prev => ({ ...prev, sub_source: value }))}
                      disabled={!addLeadForm.source}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Source First" />
                      </SelectTrigger>
                      <SelectContent>
                        {(SOURCE_OPTIONS[addLeadForm.source] || []).length === 0 ? (
                          <SelectItem value="none">None</SelectItem>
                        ) : (
                          SOURCE_OPTIONS[addLeadForm.source].map((sub) => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setShowAddLeadModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Add Lead
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            {getTotalAssignedCount() > 0 && (
              <Button 
                onClick={handleAssignLeads} 
                disabled={isAssigning}
                className="bg-pink-600 hover:bg-pink-700"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {isAssigning ? 'Assigning...' : `Assign Leads (${getTotalAssignedCount()})`}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Users className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{computedTotal}</p>
                  <p className="text-sm text-gray-600">Total Unassigned Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(unassignedData?.by_source || {}).length}</p>
                  <p className="text-sm text-gray-600">Sources</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unassignedData?.available_cres?.length || 0}</p>
                  <p className="text-sm text-gray-600">Available CREs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ArrowRightLeft className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{getTotalAssignedCount()}</p>
                  <p className="text-sm text-gray-600">Selected for Assignment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available CREs - Draggable chips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>AVAILABLE CRES</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {console.log('[assign-leads] Rendering CREs:', unassignedData?.available_cres, 'Length:', unassignedData?.available_cres?.length)}
              {unassignedData?.available_cres && unassignedData.available_cres.length > 0 ? (
                unassignedData.available_cres.map((cre: CREUser) => (
                  <DraggableCRE key={cre.id} id={`cre-${cre.id}`} name={cre.name} subtitle={cre.username} data={{ cre }} />
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500 py-8">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>No CREs available</p>
                  <p className="text-sm">Check console for debugging info</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Assignment Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unassigned Leads by Source with droppable buckets */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Unassigned Leads by Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(unassignedData?.by_source || {}).map(([source, count]) => (
                  <DroppableSource
                    key={source}
                    source={source}
                    count={count as number}
                    assignments={bucketAssignments[source] || []}
                    onChangeCount={(creId, delta) => updateBucketCount(source, creId, delta)}
                    onRemove={(creId) => removeFromBucket(source, creId)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Assignment Preview */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Assignment Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(bucketAssignments).flatMap(([source, list]) => list.map((b) => (
                  <div key={`${source}-${b.creId}`} className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">{b.creName}</span> ← {b.count} from {source}
                      </div>
                    </div>
                  </div>
                )))}
                {Object.keys(bucketAssignments).length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <ArrowRightLeft className="h-8 w-8 mx-auto mb-2" />
                    <p>No assignments configured yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </DndContext>
    </DashboardLayout>
  )
}

// --- Draggable CRE chip ---
function DraggableCRE({ id, name, subtitle, data }: { id: string; name: string; subtitle: string; data: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data })
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 1,
  } as React.CSSProperties
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-gray-50 p-3 rounded-lg text-center cursor-move select-none">
      <div className="font-medium text-sm">{name}</div>
      <div className="text-xs text-gray-600">{subtitle}</div>
    </div>
  )
}

// --- Droppable Source bucket with counters ---
function DroppableSource({
  source,
  count,
  assignments,
  onChangeCount,
  onRemove,
}: {
  source: string
  count: number
  assignments: BucketAssignment[]
  onChangeCount: (creId: string, delta: number) => void
  onRemove: (creId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `source-${source}` })

  const getSourceColor = (src: string) => {
    const colors = {
      'BTL': 'bg-green-100 text-green-800',
      'META': 'bg-blue-100 text-blue-800',
      'GOOGLE': 'bg-red-100 text-red-800',
      'WEBSITE': 'bg-purple-100 text-purple-800',
      'REFERRAL': 'bg-yellow-100 text-yellow-800'
    } as any
    return colors[src] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div ref={setNodeRef} className={`border rounded-lg p-4 space-y-3 ${isOver ? 'ring-2 ring-pink-400' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Badge className={getSourceColor(source)}>{source}</Badge>
          <span className="font-medium">{count} leads</span>
        </div>
        <span className="text-xs text-gray-600">Drop CRE here</span>
      </div>

      <div className="space-y-2">
        {assignments.length === 0 && (
          <div className="text-xs text-gray-500">No CREs added yet.</div>
        )}
        {assignments.map((a) => (
          <div key={a.creId} className="flex items-center justify-between rounded p-2 bg-gradient-to-r from-indigo-50 to-pink-50 border">
            <div className="text-sm font-medium">{a.creName}</div>
            <div className="flex items-center space-x-2">
              <Button size="icon" variant="outline" onClick={() => onChangeCount(a.creId, -1)}>−</Button>
              <div className="w-8 text-center text-sm">{a.count}</div>
              <Button size="icon" variant="outline" onClick={() => onChangeCount(a.creId, +1)}>+</Button>
              <Button size="icon" variant="ghost" onClick={() => onRemove(a.creId)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <div className="text-xs text-gray-600">
          Remaining: {Math.max(0, count - assignments.reduce((t, a) => t + a.count, 0))}
        </div>
      </div>
    </div>
  )
}

// Component for each source's lead assignment card
function SourceLeadCard({ 
  source, 
  count, 
  availableCREs, 
  onCRESelect, 
  onLeadSelect, 
  selectedLeads, 
  assignedCRE 
}: {
  source: string
  count: number
  availableCREs: CREUser[]
  onCRESelect: (source: string, creId: string, creName: string) => void
  onLeadSelect: (source: string, leadId: string, isSelected: boolean) => void
  selectedLeads: string[]
  assignedCRE?: string
}) {
  const [showLeads, setShowLeads] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)

  const fetchSourceLeads = async () => {
    if (leads.length > 0) return // Already loaded
    
    setLoadingLeads(true)
    try {
      const session = typeof window !== 'undefined' ? (localStorage.getItem('supabase_user') || localStorage.getItem('user')) : null
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      const response = await fetch(`/api/leads/unassigned/${encodeURIComponent(source)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-store'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLeads(data)
      }
    } catch (error) {
      console.error('Error fetching source leads:', error)
    } finally {
      setLoadingLeads(false)
    }
  }

  const handleShowLeads = () => {
    if (!showLeads) {
      fetchSourceLeads()
    }
    setShowLeads(!showLeads)
  }

  const getSourceColor = (source: string) => {
    const colors = {
      'BTL': 'bg-green-100 text-green-800',
      'META': 'bg-blue-100 text-blue-800', 
      'GOOGLE': 'bg-red-100 text-red-800',
      'WEBSITE': 'bg-purple-100 text-purple-800',
      'REFERRAL': 'bg-yellow-100 text-yellow-800'
    }
    return colors[source as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Badge className={getSourceColor(source)}>{source}</Badge>
          <span className="font-medium">{count} leads</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleShowLeads}
        >
          {showLeads ? 'Hide' : 'Show'} Leads
        </Button>
      </div>

      <div className="flex items-center space-x-3">
        <Select value={assignedCRE} onValueChange={(value) => {
          const cre = availableCREs.find(c => c.id === value)
          if (cre) onCRESelect(source, value, cre.name)
        }}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select CRE" />
          </SelectTrigger>
          <SelectContent>
            {availableCREs.map((cre) => (
              <SelectItem key={cre.id} value={cre.id}>
                {cre.name} ({cre.username})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedLeads.length > 0 && (
          <Badge variant="secondary">{selectedLeads.length} selected</Badge>
        )}
      </div>

      {showLeads && (
        <div className="mt-4">
          {loadingLeads ? (
            <div className="text-center py-4">Loading leads...</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {leads.map((lead) => (
                <div key={lead.uid} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  <Checkbox
                    checked={selectedLeads.includes(lead.uid)}
                    onCheckedChange={(checked) => onLeadSelect(source, lead.uid, checked as boolean)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{lead.customer_name}</div>
                    <div className="text-xs text-gray-600 flex items-center space-x-2">
                      <span className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {lead.customer_mobile_number}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
