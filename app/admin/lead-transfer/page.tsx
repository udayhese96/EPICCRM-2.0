"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  RefreshCw, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  History,
  Download,
  Undo2,
  Search,
  Filter
} from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { VirtualList } from "@/components/ui/virtual-list"

interface Lead {
  id: number
  uid: string
  customer_name: string
  customer_mobile_number: string
  cre_id: string | null
  cre_name: string | null
  ps_name: string | null
  branch: string | null
  final_status: string
  lead_status: string | null
  source: string | null
  sub_source: string | null
  model_interested: string | null
  metadata: any
}

interface User {
  id: string
  username: string
  full_name: string
  branch: string
  role: string
}

interface TransferHistory {
  date: string
  from: string
  to: string
  count: number
  type: string
  user: string
}

export default function LeadTransferPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"cre" | "ps">("cre")
  
  // CRE Transfer States (SEPARATE from PS)
  const [creUsers, setCreUsers] = useState<User[]>([])
  const [fromCRE, setFromCRE] = useState("")
  const [toCRE, setToCRE] = useState("")
  const [allCreLeads, setAllCreLeads] = useState<Lead[]>([])
  const [creLeads, setCreLeads] = useState<Lead[]>([])
  // CRE-specific exclusions (do NOT mix with PS exclusions)
  const [recentlyTransferredCreIds, setRecentlyTransferredCreIds] = useState<Set<number>>(new Set())
  const [recentlyTransferredCreUids, setRecentlyTransferredCreUids] = useState<Set<string>>(new Set())
  // Note: We manage localStorage manually to avoid timing issues when switching CREs
  const gridCols = "grid grid-cols-[40px_8rem_1fr_9rem_7rem_7rem_14rem_4rem]"
  const [selectedCreLeads, setSelectedCreLeads] = useState<Set<number>>(new Set())
  
  // PS Transfer States (SEPARATE from CRE)
  const [psUsers, setPsUsers] = useState<User[]>([])
  const [fromPS, setFromPS] = useState("")
  const [toPS, setToPS] = useState("")
  const [psBranch, setPsBranch] = useState("")
  const [psLeads, setPsLeads] = useState<Lead[]>([])
  const [selectedPsLeads, setSelectedPsLeads] = useState<Set<number>>(new Set())
  // PS-specific exclusions (do NOT mix with CRE exclusions)
  const [recentlyTransferredPsIds, setRecentlyTransferredPsIds] = useState<Set<number>>(new Set())
  const [recentlyTransferredPsUids, setRecentlyTransferredPsUids] = useState<Set<string>>(new Set())
  
  // Common States
  const [branches, setBranches] = useState<string[]>([])
  const [finalStatusFilter, setFinalStatusFilter] = useState("all")
  const [leadStatusFilter, setLeadStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [subSourceFilter, setSubSourceFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Dynamic filter options (populated from actual data)
  const [availableFinalStatuses, setAvailableFinalStatuses] = useState<string[]>([])
  const [availableLeadStatuses, setAvailableLeadStatuses] = useState<string[]>([])
  const [availableSources, setAvailableSources] = useState<string[]>([])
  const [availableSubSources, setAvailableSubSources] = useState<string[]>([])
  
  // Preview & Results
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [transferResult, setTransferResult] = useState<any>(null)
  
  const [lastTransferTarget, setLastTransferTarget] = useState<{
    id: string
    name: string
    type: 'cre' | 'ps'
  } | null>(null)
  
  // History
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [selectedLeadHistory, setSelectedLeadHistory] = useState<any>(null)

  useEffect(() => {
    loadUsers()
    loadBranches()
  }, [])
  
  // Helper function to extract unique values from leads
  const extractUniqueValues = (leads: Lead[], field: keyof Lead): string[] => {
    const values = leads
      .map(lead => lead[field])
      .filter((value): value is string => !!value && value !== '')
    return Array.from(new Set(values)).sort()
  }

  const loadUsers = async () => {
    try {
      const supabase = createClient()
      
      // Load CRE users
      const { data: creData } = await supabase
        .from('users')
        .select('id, username, full_name, branch, role')
        .eq('role', 'cre')
        .order('username')
      
      if (creData) setCreUsers(creData)
      
      // Load PS users
      const { data: psData } = await supabase
        .from('users')
        .select('id, username, full_name, branch, role')
        .eq('role', 'ps')
        .order('username')
      
      if (psData) setPsUsers(psData)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadBranches = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('branch')
        .not('branch', 'is', null)
      
      if (data) {
        const uniqueBranches = Array.from(new Set(data.map(u => u.branch).filter(Boolean)))
        setBranches(uniqueBranches as string[])
      }
    } catch (error) {
      console.error('Error loading branches:', error)
    }
  }

  const loadCreLeads = async (extraExcludeIds?: number[], extraExcludeUids?: string[], forceNoExclusions?: boolean) => {
    if (!fromCRE) {
      alert('Please select a CRE first')
      return
    }
    
    setIsLoading(true)
    try {
      // IMPORTANT: Only use CRE exclusions here, NOT PS exclusions
      // recentlyTransferredCreIds already includes persisted IDs (loaded from localStorage in useEffect)
      // If forceNoExclusions is true, ignore all exclusions
      const excludeIdsSet = forceNoExclusions ? new Set<number>() : new Set<number>([
        ...Array.from(recentlyTransferredCreIds),
        ...(extraExcludeIds || [])
      ])
      const excludeUidsSet = forceNoExclusions ? new Set<string>() : new Set<string>([
        ...Array.from(recentlyTransferredCreUids),
        ...(extraExcludeUids || [])
      ])
      
      const excludeIds = Array.from(excludeIdsSet).join(',')
      const excludeUids = Array.from(excludeUidsSet).join(',')
      
      // Build URL with both exclude_ids and exclude_uids + cache-busting timestamp
      const url = `/api/admin/leads/transfer/cre-leads?cre_id=${fromCRE}&exclude_ids=${encodeURIComponent(excludeIds)}&exclude_uids=${encodeURIComponent(excludeUids)}&_t=${Date.now()}`
      console.log('Loading CRE leads from:', url)
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error fetching CRE leads:', errorData)
        
        // Show detailed error message
        let errorMessage = errorData.error || 'Unknown error'
        if (errorData.details) {
          errorMessage += '\n\nDetails: ' + errorData.details
        }
        
        // Special handling for configuration errors
        if (response.status === 500 && errorData.error?.includes('Service role key')) {
          errorMessage = '🔴 CRITICAL CONFIGURATION ERROR:\n\n' + errorMessage
          errorMessage += '\n\n⚠️ ACTION REQUIRED:\nPlease ensure that SUPABASE_SERVICE_ROLE_KEY is set in your Netlify environment variables.'
          errorMessage += '\n\nThis is a production configuration issue that must be fixed by your administrator.'
        }
        
        alert(errorMessage)
        setCreLeads([])
        return
      }
      
      const data = await response.json()
      const allLeads = data.leads || []

      console.log('========== CRE LEADS DEBUG ==========')
      console.log('CRE leads from API:', allLeads.length)
      console.log('Current fromCRE:', fromCRE)
      console.log('forceNoExclusions:', forceNoExclusions)
      console.log('Excluded IDs (state):', Array.from(recentlyTransferredCreIds))
      console.log('Excluded UIDs (state):', Array.from(recentlyTransferredCreUids))
      console.log('Extra excluded IDs:', extraExcludeIds || [])
      console.log('Extra excluded UIDs:', extraExcludeUids || [])
      console.log('Final excludeIds sent to API:', excludeIds || '(none)')
      console.log('Final excludeUids sent to API:', excludeUids || '(none)')
      
      // Debug: show raw rows' mapping to verify cre_id integrity from API
      try {
        console.log('Raw leads (id:uid:cre_id):', (allLeads as any[]).map(l => `${l.id}:${l.uid}:${l.cre_id}`).join(', '))
      } catch {}
      
      // Check if lead CD123123 is in the response
      const cd123123 = allLeads.find((l: any) => l.uid === 'CD123123')
      if (cd123123) {
        console.log('✅ Found CD123123 in API response:', cd123123.id, cd123123.cre_id)
      } else {
        console.log('❌ CD123123 NOT in API response')
      }
      console.log('======================================')

      // Client-side defensive filter: ensure only leads for selected CRE
      // (API should already enforce this, but double-check for safety)
      let leadsForCre = (allLeads as Lead[])
        .filter((lead: Lead) => lead.cre_id === fromCRE)
        .filter((lead: Lead) => !recentlyTransferredCreIds.has(lead.id))
        .filter((lead: Lead) => !recentlyTransferredCreUids.has(lead.uid))
      console.log('After client-side cre_id filter:', leadsForCre.length)
      
      // CRITICAL: Deduplicate by UID to prevent same lead appearing multiple times
      // This handles edge cases where database might have duplicate records
      const seenUids = new Set<string>()
      leadsForCre = leadsForCre.filter((lead: Lead) => {
        if (seenUids.has(lead.uid)) {
          console.warn('Duplicate UID detected and removed:', lead.uid, 'for CRE:', fromCRE)
          return false
        }
        seenUids.add(lead.uid)
        return true
      })
      console.log('After deduplication:', leadsForCre.length)

      // Filter out excluded statuses (case-insensitive)
      const excludedStatuses = ['booked', 'retailed', 'waiting for approval', 'won', 'lost']
      const filteredLeads = leadsForCre?.filter((lead: Lead) => {
        const finalStatus = (lead.final_status || '').toLowerCase()
        return !excludedStatuses.includes(finalStatus)
      }) || []
      
      console.log('After filtering excluded statuses:', filteredLeads.length)
      
      // Apply additional filters
      let finalLeads = filteredLeads
      
      if (finalStatusFilter !== 'all') {
        finalLeads = finalLeads.filter((lead: Lead) => 
          (lead.final_status || '').toLowerCase() === finalStatusFilter.toLowerCase()
        )
      }
      
      if (leadStatusFilter !== 'all') {
        finalLeads = finalLeads.filter((lead: Lead) => 
          (lead.lead_status || '').toLowerCase() === leadStatusFilter.toLowerCase()
        )
      }
      
      if (sourceFilter !== 'all') {
        finalLeads = finalLeads.filter((lead: Lead) => 
          (lead.source || '').toLowerCase() === sourceFilter.toLowerCase()
        )
      }
      
      if (subSourceFilter !== 'all') {
        finalLeads = finalLeads.filter((lead: Lead) => 
          (lead.sub_source || '').toLowerCase() === subSourceFilter.toLowerCase()
        )
      }
      
      // Apply search query
      if (searchQuery) {
        finalLeads = finalLeads.filter((lead: Lead) => 
          lead.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.customer_mobile_number?.includes(searchQuery) ||
          lead.uid?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      console.log('Final leads count:', finalLeads.length)
      
      // Populate dynamic filter options from all leads (before status filtering)
      setAvailableFinalStatuses(extractUniqueValues(filteredLeads, 'final_status'))
      setAvailableLeadStatuses(extractUniqueValues(filteredLeads, 'lead_status'))
      setAvailableSources(extractUniqueValues(filteredLeads, 'source'))
      setAvailableSubSources(extractUniqueValues(filteredLeads, 'sub_source'))
      
      // Keep raw for virtualization calculations
      setAllCreLeads(leadsForCre)

      if (finalLeads.length === 0) {
        if (allLeads?.length === 0) {
          alert('No leads found for this CRE. The CRE might not have any assigned leads.')
        } else {
          alert(`No transferable leads found. Found ${allLeads?.length || 0} total leads, but all are in excluded statuses (Booked, Retailed, Won, Lost, etc.)`)
        }
      } else {
        setCreLeads(finalLeads)
      }
    } catch (error) {
      console.error('Error loading CRE leads:', error)
      alert('Error loading leads. Please check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  // UI click wrapper to satisfy event type
  const handleLoadCreLeadsClick = () => {
    void loadCreLeads()
  }

  // Sync localStorage exclude ids into CRE session state when fromCRE changes
  // This ensures previously transferred leads remain excluded across page refreshes
  useEffect(() => {
    // IMPORTANT: Read directly from localStorage to avoid stale hook values
    let ids: number[] = []
    if (fromCRE) {
      try {
        const stored = localStorage.getItem(`lt_exclude_${fromCRE}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          ids = Array.isArray(parsed) ? parsed : []
        }
      } catch (e) {
        console.error('Error reading localStorage excludes:', e)
      }
    }
    
    setRecentlyTransferredCreIds(new Set<number>(ids))
    // Reset CRE UIDs when switching CRE (UIDs are session-only, not persisted)
    setRecentlyTransferredCreUids(new Set<string>())
    
    // CRITICAL: Clear stale lead data when switching CREs to force fresh load
    setCreLeads([])
    setAllCreLeads([])
    setSelectedCreLeads(new Set())
    
    // Also reset filters to avoid confusion with stale filter state
    setFinalStatusFilter('all')
    setLeadStatusFilter('all')
    setSourceFilter('all')
    setSubSourceFilter('all')
    setSearchQuery('')
    
    console.log('CRE changed to:', fromCRE, '- Cleared lead state, filters, and loaded persisted excludes:', ids)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCRE])

  // Clear PS state when switching PS (similar to CRE)
  useEffect(() => {
    // Clear stale PS lead data when switching PS
    setPsLeads([])
    setSelectedPsLeads(new Set())
    
    // Reset PS-specific exclusions (session-only, not persisted for PS)
    setRecentlyTransferredPsIds(new Set())
    setRecentlyTransferredPsUids(new Set())
    
    console.log('PS changed to:', fromPS, '- Cleared PS lead state and exclusions')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPS])

  // Live filtering for CRE whenever filters/search change (on already loaded data)
  useEffect(() => {
    if (allCreLeads.length === 0) return
    console.log('Live filtering - allCreLeads:', allCreLeads.length, 'leads')
    console.log('Live filtering - allCreLeads UIDs:', allCreLeads.map(l => l.uid))
    console.log('Live filtering - filters:', { finalStatusFilter, leadStatusFilter, sourceFilter, subSourceFilter, searchQuery })
    
    let final = [...allCreLeads]
    if (finalStatusFilter !== 'all') {
      final = final.filter((l: Lead) => (l.final_status || '').toLowerCase() === finalStatusFilter.toLowerCase())
      console.log('After finalStatusFilter:', final.length, 'leads')
    }
    if (leadStatusFilter !== 'all') {
      final = final.filter((l: Lead) => (l.lead_status || '').toLowerCase() === leadStatusFilter.toLowerCase())
      console.log('After leadStatusFilter:', final.length, 'leads')
    }
    if (sourceFilter !== 'all') {
      final = final.filter((l: Lead) => (l.source || '').toLowerCase() === sourceFilter.toLowerCase())
      console.log('After sourceFilter:', final.length, 'leads')
    }
    if (subSourceFilter !== 'all') {
      final = final.filter((l: Lead) => (l.sub_source || '').toLowerCase() === subSourceFilter.toLowerCase())
      console.log('After subSourceFilter:', final.length, 'leads')
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      final = final.filter((l: Lead) =>
        (l.customer_name || '').toLowerCase().includes(q) ||
        (l.customer_mobile_number || '').includes(searchQuery) ||
        (l.uid || '').toLowerCase().includes(q)
      )
      console.log('After searchQuery:', final.length, 'leads')
    }
    console.log('Live filtering - final UIDs:', final.map(l => l.uid))
    setCreLeads(final)
  }, [allCreLeads, finalStatusFilter, leadStatusFilter, sourceFilter, subSourceFilter, searchQuery])

  const loadPsLeads = async () => {
    if (!fromPS || !psBranch) {
      alert('Please select branch and PS first')
      return
    }
    
    setIsLoading(true)
    try {
      // IMPORTANT: Only use PS exclusions here, NOT CRE exclusions
      const excludeIds = Array.from(recentlyTransferredPsIds).join(',')
      const excludeUids = Array.from(recentlyTransferredPsUids).join(',')
      
      const url = `/api/admin/leads/transfer/ps-leads?ps_id=${fromPS}&branch=${encodeURIComponent(psBranch)}&exclude_ids=${encodeURIComponent(excludeIds)}&exclude_uids=${encodeURIComponent(excludeUids)}&_t=${Date.now()}`
      console.log('Loading PS leads from:', url)
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error fetching PS leads:', errorData)
        
        // Show detailed error message
        let errorMessage = errorData.error || 'Unknown error'
        if (errorData.details) {
          errorMessage += '\n\nDetails: ' + errorData.details
        }
        
        // Special handling for configuration errors
        if (response.status === 500 && errorData.error?.includes('Service role key')) {
          errorMessage = '🔴 CRITICAL CONFIGURATION ERROR:\n\n' + errorMessage
          errorMessage += '\n\n⚠️ ACTION REQUIRED:\nPlease ensure that SUPABASE_SERVICE_ROLE_KEY is set in your Netlify environment variables.'
          errorMessage += '\n\nThis is a production configuration issue that must be fixed by your administrator.'
        }
        
        alert(errorMessage)
        setPsLeads([])
        return
      }
      
      const data = await response.json()
      const allLeads = data.leads || []
      
      console.log('PS leads from API:', allLeads.length)
      
      // Filter out excluded statuses (case-insensitive)
      const excludedStatuses = ['booked', 'retailed', 'waiting for approval', 'won', 'lost']
      let filteredLeads = allLeads?.filter((lead: Lead) => {
        const finalStatus = (lead.final_status || '').toLowerCase()
        return !excludedStatuses.includes(finalStatus)
      }) || []
      
      // Apply additional filters
      if (finalStatusFilter !== 'all') {
        filteredLeads = filteredLeads.filter((lead: Lead) => 
          (lead.final_status || '').toLowerCase() === finalStatusFilter.toLowerCase()
        )
      }
      
      if (leadStatusFilter !== 'all') {
        filteredLeads = filteredLeads.filter((lead: Lead) => 
          (lead.lead_status || '').toLowerCase() === leadStatusFilter.toLowerCase()
        )
      }
      
      if (sourceFilter !== 'all') {
        filteredLeads = filteredLeads.filter((lead: Lead) => 
          (lead.source || '').toLowerCase() === sourceFilter.toLowerCase()
        )
      }
      
      if (subSourceFilter !== 'all') {
        filteredLeads = filteredLeads.filter((lead: Lead) => 
          (lead.sub_source || '').toLowerCase() === subSourceFilter.toLowerCase()
        )
      }
      
      // Apply search query
      if (searchQuery) {
        filteredLeads = filteredLeads.filter((lead: Lead) => 
          lead.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.customer_mobile_number?.includes(searchQuery) ||
          lead.uid?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      // Populate dynamic filter options from all leads (before status filtering)
      setAvailableFinalStatuses(extractUniqueValues(allLeads, 'final_status'))
      setAvailableLeadStatuses(extractUniqueValues(allLeads, 'lead_status'))
      setAvailableSources(extractUniqueValues(allLeads, 'source'))
      setAvailableSubSources(extractUniqueValues(allLeads, 'sub_source'))
      
      setPsLeads(filteredLeads)
      
      if (filteredLeads.length === 0) {
        if (allLeads?.length === 0) {
          alert('No leads found for this PS in the selected branch.')
        } else {
          alert(`No transferable leads found. Found ${allLeads?.length || 0} total leads, but all are in excluded statuses.`)
        }
      }
    } catch (error) {
      console.error('Error loading PS leads:', error)
      alert('Error loading leads. Please check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreTransferPreview = () => {
    if (!fromCRE || !toCRE) {
      alert('Please select both source and target CRE')
      return
    }
    
    if (fromCRE === toCRE) {
      alert('Cannot transfer to the same CRE')
      return
    }
    
    if (selectedCreLeads.size === 0) {
      alert('Please select at least one lead')
      return
    }
    
    const selectedLeadsData = creLeads.filter(lead => selectedCreLeads.has(lead.id))
    const fromUser = creUsers.find(u => u.id === fromCRE)
    const toUser = creUsers.find(u => u.id === toCRE)
    
    setPreviewData({
      type: 'cre',
      from: fromUser,
      to: toUser,
      leads: selectedLeadsData,
      count: selectedCreLeads.size
    })
    setShowPreview(true)
  }

  const handlePsTransferPreview = () => {
    if (!fromPS || !toPS || !psBranch) {
      alert('Please select branch, source PS and target PS')
      return
    }
    
    if (fromPS === toPS) {
      alert('Cannot transfer to the same PS')
      return
    }
    
    if (selectedPsLeads.size === 0) {
      alert('Please select at least one lead')
      return
    }
    
    const selectedLeadsData = psLeads.filter(lead => selectedPsLeads.has(lead.id))
    const fromUser = psUsers.find(u => u.id === fromPS)
    const toUser = psUsers.find(u => u.id === toPS)
    
    setPreviewData({
      type: 'ps',
      from: fromUser,
      to: toUser,
      leads: selectedLeadsData,
      count: selectedPsLeads.size,
      branch: psBranch
    })
    setShowPreview(true)
  }

  const executeTransfer = async () => {
    if (!previewData) return
    
    setIsLoading(true)
    setShowPreview(false)
    
    try {
      const response = await fetch('/api/admin/leads/transfer', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: previewData.type,
          from_id: previewData.from.id,
          to_id: previewData.to.id,
          lead_ids: previewData.leads.map((l: Lead) => l.id),
          from_name: previewData.from.username,
          to_name: previewData.to.username,
          branch: previewData.branch
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setTransferResult({
          success: true,
          message: `Successfully transferred ${result.transferred} leads!`,
          details: result
        })
        
        // Optimistic UI update: remove transferred leads locally
        if (previewData.type === 'cre') {
          // CRE Transfer: Update CRE-specific exclusion state ONLY
          const movedIds = new Set<number>(previewData.leads.map((l: Lead) => l.id))
          const movedUids = new Set<string>(previewData.leads.map((l: Lead) => l.uid).filter(Boolean))
          
          console.log('CRE transfer - excluding IDs:', Array.from(movedIds))
          console.log('CRE transfer - excluding UIDs:', Array.from(movedUids))
          
          // Update session state
          setRecentlyTransferredCreIds(prev => {
            const newSet = new Set<number>([...prev, ...movedIds])
            // Also persist to localStorage for this specific CRE
            if (fromCRE) {
              try {
                localStorage.setItem(`lt_exclude_${fromCRE}`, JSON.stringify(Array.from(newSet)))
                console.log('Saved to localStorage for CRE:', fromCRE, 'IDs:', Array.from(newSet))
              } catch (e) {
                console.error('Error saving to localStorage:', e)
              }
            }
            return newSet
          })
          setRecentlyTransferredCreUids(prev => new Set<string>([...prev, ...movedUids]))
          
          // Remove from visible list immediately
          setCreLeads(prev => prev.filter(l => !movedIds.has(l.id)))
          setAllCreLeads(prev => prev.filter(l => !movedIds.has(l.id)))
          
          // Trigger foreground reload with exclusions
          await loadCreLeads(Array.from(movedIds), Array.from(movedUids))
        } else {
          // PS Transfer: Update PS-specific exclusion state ONLY
          const movedIds = new Set<number>(previewData.leads.map((l: Lead) => l.id))
          const movedUids = new Set<string>(previewData.leads.map((l: any) => l.uid).filter(Boolean))
          
          console.log('PS transfer - excluding IDs:', Array.from(movedIds))
          console.log('PS transfer - excluding UIDs:', Array.from(movedUids))
          
          setRecentlyTransferredPsIds(prev => new Set<number>([...prev, ...movedIds]))
          setRecentlyTransferredPsUids(prev => new Set<string>([...prev, ...movedUids]))
          
          // Remove from visible list immediately
          setPsLeads(prev => prev.filter(l => !movedIds.has(l.id)))
        }

        // Reset selections
        setSelectedCreLeads(new Set())
        setSelectedPsLeads(new Set())

        // Store transfer target for quick access
        setLastTransferTarget({
          id: previewData.to.id,
          name: previewData.to.full_name || previewData.to.username,
          type: previewData.type
        })
        
        // REAL-TIME REFRESH: Immediately refresh target CRE's leads
        if (previewData.type === 'cre') {
          // Clear exclusions for target CRE to show transferred leads
          const targetCreId = previewData.to.id
          try {
            localStorage.removeItem(`lt_exclude_${targetCreId}`)
            console.log('✅ Cleared exclusions for target CRE:', targetCreId)
          } catch (e) {
            console.error('Error clearing target CRE exclusions:', e)
          }
          
          // If we're currently viewing the target CRE, refresh immediately
          if (fromCRE === targetCreId) {
            console.log('🔄 Refreshing target CRE leads immediately...')
            // Clear the state for this CRE
            setRecentlyTransferredCreIds(new Set())
            setRecentlyTransferredCreUids(new Set())
            setTimeout(async () => {
              await loadCreLeads(undefined, undefined, true) // Load with NO exclusions
            }, 200)
          } else {
            // Offer to switch to target CRE to see transferred leads
            const targetName = previewData.to.full_name || previewData.to.username
            const shouldSwitch = confirm(`✅ Transfer complete!\n\nWould you like to switch to "${targetName}" to see the transferred leads immediately?`)
            
            if (shouldSwitch) {
              // Switch to target CRE
              setFromCRE(targetCreId)
              
              // Clear any existing state
              setCreLeads([])
              setAllCreLeads([])
              setSelectedCreLeads(new Set())
              setRecentlyTransferredCreIds(new Set())
              setRecentlyTransferredCreUids(new Set())
              
              // Load leads for target CRE with NO exclusions
              setTimeout(async () => {
                await loadCreLeads(undefined, undefined, true)
              }, 300)
            }
          }
        }
        
        // Background refresh to reconcile with server (handles replication/caching)
        setTimeout(() => {
          if (previewData.type === 'cre') {
            loadCreLeads()
          } else {
            loadPsLeads()
          }
        }, 500)
        
        // Show success message (only if not switching to target CRE)
        if (previewData.type !== 'cre' || fromCRE === previewData.to.id) {
          const targetName = previewData.to.full_name || previewData.to.username
          alert(`✅ Successfully transferred ${result.transferred} leads!\n\n🔄 The leads have been refreshed in real-time.`)
        }
        
      } else {
        setTransferResult({
          success: false,
          message: result.error || 'Transfer failed',
          details: result
        })
        
        // Show error message
        alert(`❌ Transfer failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      setTransferResult({
        success: false,
        message: error.message || 'An error occurred during transfer'
      })
      
      // Show error message
      alert(`❌ Transfer error: ${error.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAllCre = (checked: boolean) => {
    if (checked) {
      setSelectedCreLeads(new Set(creLeads.map(lead => lead.id)))
    } else {
      setSelectedCreLeads(new Set())
    }
  }

  const handleSelectAllPs = (checked: boolean) => {
    if (checked) {
      setSelectedPsLeads(new Set(psLeads.map(lead => lead.id)))
    } else {
      setSelectedPsLeads(new Set())
    }
  }

  const toggleCreLead = (leadId: number) => {
    const newSet = new Set(selectedCreLeads)
    if (newSet.has(leadId)) {
      newSet.delete(leadId)
    } else {
      newSet.add(leadId)
    }
    setSelectedCreLeads(newSet)
  }

  const togglePsLead = (leadId: number) => {
    const newSet = new Set(selectedPsLeads)
    if (newSet.has(leadId)) {
      newSet.delete(leadId)
    } else {
      newSet.add(leadId)
    }
    setSelectedPsLeads(newSet)
  }

  const showLeadHistory = (lead: Lead) => {
    // Handle metadata being either an object or a JSON string
    const raw = lead.metadata
    let metadata: any = {}
    if (typeof raw === 'string') {
      try {
        metadata = JSON.parse(raw)
      } catch {
        metadata = {}
      }
    } else if (raw && typeof raw === 'object') {
      metadata = raw
    }
    const transferHistory = Array.isArray(metadata.transfer_history) ? metadata.transfer_history : []
    setSelectedLeadHistory({
      lead,
      history: transferHistory
    })
    setShowHistory(true)
  }

  const exportReport = () => {
    // Implementation for export
    alert('Export functionality coming soon!')
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#fff7ef] via-[#fff2e4] to-[#ffe7d1]">
      {/* Soft orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[-12vw] top-[-10vw] w-[42vw] h-[42vw] rounded-full bg-[rgba(251,176,92,0.12)] blur-2xl" />
        <div className="absolute right-[-14vw] bottom-[-8vw] w-[40vw] h-[40vw] rounded-full bg-[rgba(255,205,145,0.16)] blur-2xl" />
      </div>

      <DashboardLayout>
        <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-6 py-10 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild className="rounded-xl bg-white/70 border-none shadow hover:bg-orange-50">
                <Link href="/admin/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-orange-700">
              Lead Transfer
            </h1>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportReport}
              className="rounded-xl bg-white/70 border-none shadow hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-4">
            <Button
              onClick={() => setActiveTab("cre")}
              className={`flex-1 rounded-2xl py-6 font-bold text-lg transition-all ${
                activeTab === "cre"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
                  : "bg-white/80 text-orange-700 hover:bg-orange-50"
              }`}
            >
              <Users className="h-5 w-5 mr-2" />
              CRE Transfer
            </Button>
            <Button
              onClick={() => setActiveTab("ps")}
              className={`flex-1 rounded-2xl py-6 font-bold text-lg transition-all ${
                activeTab === "ps"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
                  : "bg-white/80 text-orange-700 hover:bg-orange-50"
              }`}
            >
              <Users className="h-5 w-5 mr-2" />
              PS Transfer
            </Button>
          </div>

          {/* Transfer Result */}
          {transferResult && (
            <Alert 
              variant={transferResult.success ? "default" : "destructive"} 
              className="rounded-2xl shadow-lg bg-white/95"
            >
              {transferResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <div className="w-full">
                <AlertTitle className="text-lg font-bold">
                  {transferResult.success ? "Transfer Successful!" : "Transfer Failed"}
                </AlertTitle>
                <AlertDescription>
                  {transferResult.message}
                  {transferResult.details && (
                    <div className="mt-2 text-sm">
                      <p><strong>Transferred:</strong> {transferResult.details.transferred}</p>
                      {transferResult.details.failed > 0 && (
                        <p><strong>Failed:</strong> {transferResult.details.failed}</p>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* CRE Transfer Section */}
          {activeTab === "cre" && (
            <Card className="rounded-[2rem] bg-gradient-to-tr from-[#fff5ea] via-[#ffeacc] to-[#ffe1b3] shadow-2xl border border-orange-200">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-orange-800">Transfer CRE Leads</CardTitle>
                <CardDescription className="text-orange-700">
                  Transfer leads from one CRE to another across any branch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* CRE Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-orange-900">From CRE</Label>
                    <Select value={fromCRE} onValueChange={setFromCRE}>
                      <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                        <SelectValue placeholder="Select CRE" />
                      </SelectTrigger>
                      <SelectContent>
                        {creUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-orange-900">To CRE</Label>
                    <Select value={toCRE} onValueChange={setToCRE}>
                      <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                        <SelectValue placeholder="Select CRE" />
                      </SelectTrigger>
                      <SelectContent>
                        {creUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Load Leads Button */}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleLoadCreLeadsClick} 
                    disabled={!fromCRE || isLoading}
                    className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Load Leads
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      if (fromCRE) {
                        try {
                          console.log('🔄 Force Refresh: Clearing exclusions for CRE:', fromCRE)
                          
                          // Clear localStorage FIRST
                          localStorage.removeItem(`lt_exclude_${fromCRE}`)
                          
                          // Clear state
                          setRecentlyTransferredCreIds(new Set())
                          setRecentlyTransferredCreUids(new Set())
                          
                          // Load with NO exclusions (forceNoExclusions = true)
                          await loadCreLeads(undefined, undefined, true)
                          
                          console.log('✅ Force refresh complete for CRE:', fromCRE)
                        } catch (e) {
                          console.error('Error during force refresh:', e)
                          setIsLoading(false)
                        }
                      }
                    }}
                    disabled={!fromCRE || isLoading}
                    variant="outline"
                    className="rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Force Refresh
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      // Clear ALL exclusions for ALL CREs
                      try {
                        const keys = Object.keys(localStorage)
                        keys.forEach(key => {
                          if (key.startsWith('lt_exclude_')) {
                            localStorage.removeItem(key)
                          }
                        })
                        setRecentlyTransferredCreIds(new Set())
                        setRecentlyTransferredCreUids(new Set())
                        alert('All exclusions cleared! Click "Load Leads" to refresh.')
                      } catch (e) {
                        console.error('Error clearing all exclusions:', e)
                      }
                    }}
                    variant="outline"
                    className="rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                  >
                    Clear All Exclusions
                  </Button>
                  
                  {/* View Transferred Leads Button */}
                  {lastTransferTarget && (
                    <Button 
                      onClick={() => {
                        if (lastTransferTarget.type === 'cre') {
                          // Switch to target CRE
                          setFromCRE(lastTransferTarget.id)
                          setActiveTab('cre')
                          
                          // Clear localStorage and state for target CRE
                          try {
                            localStorage.removeItem(`lt_exclude_${lastTransferTarget.id}`)
                          } catch (e) {
                            console.error('Error clearing localStorage:', e)
                          }
                          
                          // Clear any existing state
                          setCreLeads([])
                          setAllCreLeads([])
                          setSelectedCreLeads(new Set())
                          setRecentlyTransferredCreIds(new Set())
                          setRecentlyTransferredCreUids(new Set())
                          
                          // Load leads for target CRE with NO exclusions
                          setTimeout(async () => {
                            await loadCreLeads(undefined, undefined, true)
                          }, 300)
                        } else {
                          // Switch to target PS
                          setFromPS(lastTransferTarget.id)
                          setActiveTab('ps')
                          
                          // Clear any existing state
                          setPsLeads([])
                          setSelectedPsLeads(new Set())
                          
                          // Load leads for target PS
                          setTimeout(async () => {
                            await loadPsLeads()
                          }, 300)
                        }
                      }}
                      disabled={isLoading}
                      variant="default"
                      className="rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View {lastTransferTarget.name}'s Leads
                    </Button>
                  )}
                </div>

                {/* Filters */}
                {creLeads.length > 0 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Final Status</Label>
                        <Select value={finalStatusFilter} onValueChange={setFinalStatusFilter}>
                          <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableFinalStatuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Lead Status</Label>
                        <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
                          <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableLeadStatuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Source</Label>
                        <Select value={sourceFilter} onValueChange={setSourceFilter}>
                          <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableSources.map(source => (
                              <SelectItem key={source} value={source}>{source}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Sub Source</Label>
                        <Select value={subSourceFilter} onValueChange={setSubSourceFilter}>
                          <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableSubSources.map(subSource => (
                              <SelectItem key={subSource} value={subSource}>{subSource}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Search</Label>
                        <Input
                          placeholder="Name, Mobile, UID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="rounded-xl border-orange-200 bg-white/90"
                        />
                      </div>
                    </div>
                    {/* Live filters applied automatically */}
                  </>
                )}

                {/* Leads Table */}
                {creLeads.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Checkbox 
                          checked={selectedCreLeads.size === creLeads.length}
                          onCheckedChange={handleSelectAllCre}
                        />
                        <Label className="font-semibold text-orange-900">
                          Select All ({selectedCreLeads.size} of {creLeads.length} selected)
                        </Label>
                      </div>
                    </div>

                    <div className="border border-orange-100 rounded-2xl bg-white/90 shadow-sm">
                      {/* Grid header */}
                      <div className={`sticky top-0 z-10 bg-orange-50 text-orange-800 font-medium text-sm ${gridCols} border-b`}>
                        <div className="px-4 py-3">
                          <Checkbox />
                        </div>
                        <div className="px-4 py-3">UID</div>
                        <div className="px-4 py-3">Customer</div>
                        <div className="px-4 py-3">Mobile</div>
                        <div className="px-4 py-3">Status</div>
                        <div className="px-4 py-3">Source</div>
                        <div className="px-4 py-3">Model</div>
                        <div className="px-4 py-3">Actions</div>
                      </div>
                      {/* Virtualized rows */}
                      <VirtualList
                        items={creLeads}
                        itemHeight={64}
                        containerHeight={500}
                        renderItem={(lead) => (
                          <div className={`${gridCols} items-center hover:bg-orange-50 text-sm`}>
                            <div className="px-4 py-3 border-b">
                              <Checkbox
                                checked={selectedCreLeads.has(lead.id)}
                                onCheckedChange={() => toggleCreLead(lead.id)}
                              />
                            </div>
                            <div className="px-4 py-3 border-b font-mono text-xs">{lead.uid}</div>
                            <div className="px-4 py-3 border-b font-medium truncate">{lead.customer_name}</div>
                            <div className="px-4 py-3 border-b font-mono text-xs">{lead.customer_mobile_number}</div>
                            <div className="px-4 py-3 border-b">
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                {lead.lead_status || 'Pending'}
                              </span>
                            </div>
                            <div className="px-4 py-3 border-b text-xs">{lead.source || 'N/A'}</div>
                            <div className="px-4 py-3 border-b text-xs truncate">{lead.model_interested || 'N/A'}</div>
                            <div className="px-4 py-3 border-b">
                              <Button size="sm" variant="ghost" onClick={() => showLeadHistory(lead)} className="rounded-lg">
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleCreTransferPreview}
                        disabled={selectedCreLeads.size === 0 || !toCRE}
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Transfer {selectedCreLeads.size} Leads
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* PS Transfer Section */}
          {activeTab === "ps" && (
            <Card className="rounded-[2rem] bg-gradient-to-tr from-[#fff5ea] via-[#ffeacc] to-[#ffe1b3] shadow-2xl border border-orange-200">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-orange-800">Transfer PS Leads</CardTitle>
                <CardDescription className="text-orange-700">
                  Transfer leads from one PS to another within the same branch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Branch Selection */}
                <div className="space-y-2">
                  <Label className="font-semibold text-orange-900">Branch</Label>
                  <Select value={psBranch} onValueChange={setPsBranch}>
                    <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* PS Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-orange-900">From PS</Label>
                    <Select value={fromPS} onValueChange={setFromPS}>
                      <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                        <SelectValue placeholder="Select PS" />
                      </SelectTrigger>
                      <SelectContent>
                        {psUsers
                          .filter(user => !psBranch || user.branch === psBranch)
                          .map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name || user.username}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-orange-900">To PS</Label>
                    <Select value={toPS} onValueChange={setToPS}>
                      <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                        <SelectValue placeholder="Select PS" />
                      </SelectTrigger>
                      <SelectContent>
                        {psUsers
                          .filter(user => !psBranch || user.branch === psBranch)
                          .map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name || user.username}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Load Leads Button */}
                <Button 
                  onClick={loadPsLeads} 
                  disabled={!fromPS || !psBranch || isLoading}
                  className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Load Leads
                    </>
                  )}
                </Button>

                {/* Similar filters and table as CRE section */}
                {psLeads.length > 0 && (
                  <>
                    {/* Filters (same as CRE) */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Final Status</Label>
                        <Select value={finalStatusFilter} onValueChange={setFinalStatusFilter}>
                          <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableFinalStatuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Lead Status</Label>
                        <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
                          <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableLeadStatuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Source</Label>
                        <Select value={sourceFilter} onValueChange={setSourceFilter}>
                          <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableSources.map(source => (
                              <SelectItem key={source} value={source}>{source}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Sub Source</Label>
                        <Select value={subSourceFilter} onValueChange={setSubSourceFilter}>
                          <SelectTrigger className="rounded-xl border-orange-200 bg-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {availableSubSources.map(subSource => (
                              <SelectItem key={subSource} value={subSource}>{subSource}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-orange-800">Search</Label>
                        <Input
                          placeholder="Name, Mobile, UID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="rounded-xl border-orange-200 bg-white/90"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={loadPsLeads} 
                      variant="outline"
                      size="sm"
                      className="rounded-xl bg-white/80 border-orange-200"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Apply Filters
                    </Button>

                    {/* Leads Table */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Checkbox 
                          checked={selectedPsLeads.size === psLeads.length}
                          onCheckedChange={handleSelectAllPs}
                        />
                        <Label className="font-semibold text-orange-900">
                          Select All ({selectedPsLeads.size} of {psLeads.length} selected)
                        </Label>
                      </div>
                    </div>

                    <div className="border border-orange-100 rounded-2xl bg-white/90 shadow-sm">
                      <div className={`sticky top-0 z-10 bg-orange-50 text-orange-800 font-medium text-sm ${gridCols} border-b`}>
                        <div className="px-4 py-3"><Checkbox /></div>
                        <div className="px-4 py-3">UID</div>
                        <div className="px-4 py-3">Customer</div>
                        <div className="px-4 py-3">Mobile</div>
                        <div className="px-4 py-3">Status</div>
                        <div className="px-4 py-3">Source</div>
                        <div className="px-4 py-3">Model</div>
                        <div className="px-4 py-3">Actions</div>
                      </div>
                      <VirtualList
                        items={psLeads}
                        itemHeight={64}
                        containerHeight={500}
                        renderItem={(lead) => (
                          <div className={`${gridCols} items-center hover:bg-orange-50 text-sm`}>
                            <div className="px-4 py-3 border-b">
                              <Checkbox
                                checked={selectedPsLeads.has(lead.id)}
                                onCheckedChange={() => togglePsLead(lead.id)}
                              />
                            </div>
                            <div className="px-4 py-3 border-b font-mono text-xs">{lead.uid}</div>
                            <div className="px-4 py-3 border-b font-medium truncate">{lead.customer_name}</div>
                            <div className="px-4 py-3 border-b font-mono text-xs">{lead.customer_mobile_number}</div>
                            <div className="px-4 py-3 border-b">
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                {lead.lead_status || 'Pending'}
                              </span>
                            </div>
                            <div className="px-4 py-3 border-b text-xs">{lead.source || 'N/A'}</div>
                            <div className="px-4 py-3 border-b text-xs truncate">{lead.model_interested || 'N/A'}</div>
                            <div className="px-4 py-3 border-b">
                              <Button size="sm" variant="ghost" onClick={() => showLeadHistory(lead)} className="rounded-lg">
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handlePsTransferPreview}
                        disabled={selectedPsLeads.size === 0 || !toPS}
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Transfer {selectedPsLeads.size} Leads
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-800">Confirm Transfer</DialogTitle>
            <DialogDescription>
              Review the transfer details before proceeding
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-xl">
                <div>
                  <p className="text-sm text-orange-600 font-medium">From</p>
                  <p className="text-lg font-bold text-orange-900">
                    {previewData.from.full_name || previewData.from.username}
                  </p>
                  <p className="text-xs text-orange-700">{previewData.from.branch}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-600 font-medium">To</p>
                  <p className="text-lg font-bold text-orange-900">
                    {previewData.to.full_name || previewData.to.username}
                  </p>
                  <p className="text-xs text-orange-700">{previewData.to.branch}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-600 font-medium mb-2">Leads to Transfer ({previewData.count})</p>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {previewData.leads.slice(0, 10).map((lead: Lead) => (
                    <div key={lead.id} className="flex justify-between items-center p-2 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{lead.customer_name}</p>
                        <p className="text-xs text-gray-600 font-mono">{lead.uid}</p>
                      </div>
                      <p className="text-xs font-mono text-gray-600">{lead.customer_mobile_number}</p>
                    </div>
                  ))}
                  {previewData.count > 10 && (
                    <p className="text-xs text-gray-600 text-center">... and {previewData.count - 10} more</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={executeTransfer}
              disabled={isLoading}
              className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isLoading ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-800">Transfer History</DialogTitle>
            <DialogDescription>
              {selectedLeadHistory?.lead.customer_name} - {selectedLeadHistory?.lead.uid}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLeadHistory && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedLeadHistory.history.length > 0 ? (
                selectedLeadHistory.history.map((entry: any, idx: number) => (
                  <div key={idx} className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-orange-900">
                          {entry.type === 'cre_transferred' ? 'CRE Transfer' : 'PS Transfer'}
                        </p>
                        <p className="text-sm text-orange-700">
                          From: <strong>{entry.from}</strong> → To: <strong>{entry.to}</strong>
                        </p>
                        <p className="text-xs text-orange-600 mt-1">By: {entry.by || 'Admin'}</p>
                      </div>
                      <p className="text-xs text-orange-600">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No transfer history</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowHistory(false)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

