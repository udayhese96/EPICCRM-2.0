"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  BarChart3, 
  Star,
  Calendar,
  Users,
  Trophy,
  AlertCircle,
  Search,
  X,
  Phone,
  User,
  RefreshCw,
  Edit3,
  Filter,
  Clock,
  Flame,
  Snowflake,
  Thermometer
} from "lucide-react"
import { useState, useEffect, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { LeadUpdateModal } from "./components/lead-update-modal"
import { AddLeadModal } from "./components/add-lead-modal"
import { RemarksSync } from "./components/remarks-sync"
import { toast } from "sonner"

interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  name?: string
  role: string
}

// Snapshot helpers to detect meaningful UI changes after a fetch
const normalizeStatus = (s?: string | null) => (s || "").toString().trim().toLowerCase()
const computeCountsSnapshot = (leads: any[]) => {
  const isFinalizedWon = (l: any) => {
    const fs = (l?.final_status || '').toString().toLowerCase()
    return fs === 'booked' || fs === 'retailed'
  }
  const calledSet = new Set(["rnr","dnd","not reachable","switched off","busy","disconnecting the call","temporary out of service","incoming call facility not available","out of network","plan postponed","interested"]) 
  
  // Fresh leads: all non-qualified, non-won leads (including call outcomes like RNR, DND, etc.)
  const fresh = leads.filter(l => {
    const leadStatus = (l?.lead_status || '').toString().toLowerCase()
    return leadStatus !== 'qualified' && !isFinalizedWon(l)
  }).length
  
  const called = leads.filter(l => calledSet.has(normalizeStatus(l?.lead_status)) && !isFinalizedWon(l)).length
  const followUp = leads.filter(l => normalizeStatus(l?.lead_status) === 'call me back' && !isFinalizedWon(l)).length
  const qualified = leads.filter(l => (l?.lead_status === 'Qualified') && ((l?.final_status || '').toString().toLowerCase() === 'pending') && !isFinalizedWon(l)).length
  const pending = leads.filter(l => ((l?.final_status || '').toString().toLowerCase() === 'pending') && !!(l?.first_call_date) && !isFinalizedWon(l)).length
  return { total: leads.length, fresh, called, followUp, qualified, pending }
}

interface Lead {
  id: string
  uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  campaign: string
  date: string
  lead_status: string
  final_status?: string
  lead_category?: "Hot" | "Warm" | "Cold"
  follow_up_date?: string // ISO yyyy-mm-dd
  first_call_date?: string
  pending_reason?: string
  followup_count?: number // 0..5
  call_logs?: { date: string; outcome: string; remarks: string }[]
  customer_email?: string
  customer_location?: string
  remarks?: string
  lead_remark?: string
  // Per-step follow-up statuses (set post-qualification)
  second_call_lead_status?: string
  third_call_lead_status?: string
  fourth_call_lead_status?: string
  fifth_call_lead_status?: string
  sixth_call_lead_status?: string
  branch?: string
  ps_name?: string
  ps_id?: string
  icrop_id?: string
  // Additional fields for lost requests
  lost_reason?: string
  lost_requested_at?: string
  ps_requested_by?: string
}

export default function CREDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRemarksSyncOpen, setIsRemarksSyncOpen] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [lostRequests, setLostRequests] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<string>("fresh")
  const [activeStatus, setActiveStatus] = useState<string>("Fresh")
  const [searchTerm, setSearchTerm] = useState("")
  const [pendingCategory, setPendingCategory] = useState<"all" | "Hot" | "Warm" | "Cold">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateMode, setDateMode] = useState<"All Time" | "Today" | "This Week" | "Date Range">("All Time")
  const [wonLostFilter, setWonLostFilter] = useState<"all" | "Booked" | "Retailed" | "Lost" | "Lost Requested">("all")
  const [startDate, setStartDate] = useState('')
  const [redisWorkerStatus, setRedisWorkerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const [countsUpdating, setCountsUpdating] = useState(false)
  const [notifications, setNotifications] = useState<Array<{id: string, type: 'walkin', leadUid: string, timestamp: Date, message?: string}>>([])

  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      setUser(JSON.parse(supabaseUser))
    }
    fetchAssignedLeads()
    fetchLostRequests()

    // Listen for immediate refresh events after modal submits
    const immediateRefresh = async () => {
      setIsRefreshing(true)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [Event] Lead master updated event triggered')
      }
      const result = await fetchAssignedLeads(true)
      fetchLostRequests()
      // If counts didn't change yet, retry once after 1s to cover propagation lag
      try {
        if (result && JSON.stringify(result.before) === JSON.stringify(result.after)) {
          setTimeout(() => { fetchAssignedLeads(true) }, 1000)
        }
      } catch {}
      setTimeout(() => setIsRefreshing(false), 900)
    }
    
    // Listen for lead status changes specifically
    const handleLeadStatusChange = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [Event] Lead status change event triggered')
      }
      setIsRefreshing(true)
      // Multiple rapid refreshes to catch status changes
      fetchAssignedLeads(true)
      setTimeout(() => fetchAssignedLeads(true), 500)
      setTimeout(() => fetchAssignedLeads(true), 1000)
      setTimeout(() => setIsRefreshing(false), 1500)
    }
    
    window.addEventListener('lead-master-updated', immediateRefresh as any)
    window.addEventListener('lead-status-changed', handleLeadStatusChange as any)
    checkRedisWorkerStatus()
    
    // Set up real-time subscriptions instead of polling
    const cleanup = setupRealtimeSubscriptions()
    
    // Primary polling system (more reliable than real-time)
    const primaryPolling = setInterval(() => {
      if (!isLoading && !isRefreshing) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [Primary] Automatic refresh...')
        }
        fetchAssignedLeads()
        fetchLostRequests()
      }
    }, 3000) // 3 seconds - even more aggressive polling
    
    // Secondary polling for count updates
    const countPolling = setInterval(() => {
      if (!isLoading && !isRefreshing) {
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 [Count] Checking for count updates...')
        }
        fetchAssignedLeads()
        fetchLostRequests()
      }
    }, 15000) // 15 seconds - less frequent count checks
    
    // Redis worker status check
    const workerStatusCheck = setInterval(() => {
      checkRedisWorkerStatus()
    }, 3000) // Check worker status every 3 seconds
    
    return () => {
      // Cleanup real-time subscriptions
      if (cleanup) {
        cleanup()
      }
      window.removeEventListener('lead-master-updated', immediateRefresh as any)
      window.removeEventListener('lead-status-changed', handleLeadStatusChange as any)
      // Cleanup polling intervals
      clearInterval(primaryPolling)
      clearInterval(countPolling)
      clearInterval(workerStatusCheck)
    }
  }, [user?.username])

  const setupRealtimeSubscriptions = () => {
    // Only setup if we have a user
    if (!user?.username) {
      return () => {}
    }
    
    try {
      const supabase = createClient()
    
    // Subscribe to lead_master changes (no server-side filter to avoid case-sensitivity issues)
    const leadSubscription = supabase
      .channel(`lead_master_changes_${user.username}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_master'
        },
        (payload) => {
          const newCre = ((payload.new as any)?.cre_name || '').toLowerCase()
          const oldCre = ((payload.old as any)?.cre_name || '').toLowerCase()
          const usernameLower = user.username.toLowerCase()

          // Only react if this change is relevant to the logged-in CRE (case-insensitive)
          if (newCre !== usernameLower && oldCre !== usernameLower) {
            return
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [Real-time] Lead master change detected:', payload.eventType, (payload.new as any)?.uid || (payload.old as any)?.uid)
            console.log('🔄 [Real-time] Lead status change:', {
              old_status: (payload.old as any)?.lead_status,
              new_status: (payload.new as any)?.lead_status,
              old_remark: (payload.old as any)?.lead_remark,
              new_remark: (payload.new as any)?.lead_remark
            })
            console.log('🔄 [Real-time] Refreshing leads data due to lead_master change')
          }
          setCountsUpdating(true)
          // Immediate refresh for status changes
          fetchAssignedLeads(true)
          // Also trigger a delayed refresh to catch any propagation lag
          setTimeout(() => {
            fetchAssignedLeads(true)
            setCountsUpdating(false)
          }, 1000)
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('📡 [Real-time] Lead master subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ [Real-time] Lead master subscription active')
          }
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Real-time] Lead master subscription error')
        }
      })
    
    // Subscribe to qualified_leads changes (no server-side filter to avoid case-sensitivity issues)
    const qualifiedSubscription = supabase
      .channel(`qualified_leads_changes_${user.username}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qualified_leads'
        },
        (payload) => {
          const newCre = ((payload.new as any)?.cre_name || '').toLowerCase()
          const oldCre = ((payload.old as any)?.cre_name || '').toLowerCase()
          const usernameLower = user.username.toLowerCase()

          if (newCre !== usernameLower && oldCre !== usernameLower) {
            return
          }

          // Qualified leads changes always affect counts, so refresh immediately
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [Real-time] Qualified leads change detected:', payload.eventType, (payload.new as any)?.lead_uid || (payload.old as any)?.lead_uid)
            console.log('🔄 [Real-time] Qualified leads status change:', {
              old_status: (payload.old as any)?.lead_status,
              new_status: (payload.new as any)?.lead_status
            })
            console.log('🔄 [Real-time] Refreshing leads data due to qualified_leads change')
          }
          setCountsUpdating(true)
          // Immediate refresh for qualified leads changes
          fetchAssignedLeads(true)
          // Also trigger a delayed refresh to catch any propagation lag
          setTimeout(() => {
            fetchAssignedLeads(true)
            setCountsUpdating(false)
          }, 1000)
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Real-time] Qualified leads subscription error')
        }
      })
    
    // Subscribe to ps_followup_master changes (for ICROP ID updates)
    const followupSubscription = supabase
      .channel(`ps_followup_changes_${user.username}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'ps_followup_master'
        }, 
        (payload) => {
          // Refresh leads data when ICROP IDs are updated
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [Real-time] Follow-up change detected:', payload.eventType, (payload.new as any)?.lead_uid || (payload.old as any)?.lead_uid)
            console.log('🔄 [Real-time] Refreshing leads data due to follow-up change')
          }
          fetchAssignedLeads()
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Real-time] Follow-up subscription error')
        }
      })
    
    setRealtimeStatus('connected')
    
    // Return cleanup function
    return () => {
      setRealtimeStatus('disconnected')
      supabase.removeChannel(leadSubscription)
      supabase.removeChannel(qualifiedSubscription)
      supabase.removeChannel(followupSubscription)
    }
    
    } catch (error) {
      console.error('❌ [Real-time] Failed to setup subscriptions:', error)
      setRealtimeStatus('disconnected')
      
      // Fallback to polling if real-time fails
      const fallbackInterval = setInterval(() => {
        if (!isLoading && !isRefreshing) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [Fallback] Polling for updates...')
          }
          fetchAssignedLeads()
        }
      }, 30000) // 30 seconds fallback
      
      return () => clearInterval(fallbackInterval)
    }
  }

  const checkRedisWorkerStatus = async () => {
    try {
      const response = await fetch('/api/jobs/queue-stats')
      if (response.ok) {
        const stats = await response.json()
        
        const wasConnected = redisWorkerStatus === 'connected'
        const isConnected = stats.redis_connected && stats.queues?.lead_queue?.status === 'active'
        
        if (isConnected) {
          setRedisWorkerStatus('connected')
          
          // If worker just came online, refresh data
          if (!wasConnected) {
            setTimeout(() => {
              if (!isLoading && !isRefreshing) {
                fetchAssignedLeads()
              }
            }, 1000)
          }
        } else {
          setRedisWorkerStatus('disconnected')
        }
      } else {
        setRedisWorkerStatus('disconnected')
      }
    } catch (error) {
      setRedisWorkerStatus('disconnected')
    }
  }

  const fetchAssignedLeads = async (skipSpinner: boolean = false) => {
    if (!skipSpinner) setIsLoading(true)
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const username = parsed?.username || ''
      const fullName = parsed?.full_name || parsed?.name || ''
      // Use fullName for API call since database stores cre_name with proper case
      const qs = new URLSearchParams({ username: fullName || username })
      if (fullName) qs.append('name', fullName)
      // Cache-busting to avoid any intermediate caching layers
      const cacheBuster = Date.now().toString()
      qs.append('_t', cacheBuster)
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[CRE fetch] requesting /api/cre-assigned with _t=', cacheBuster)
      }
      const response = await fetch(`/api/cre-assigned?${qs.toString()}`, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
      
      if (response.ok) {
        const raw = await response.json()
        const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.leads) ? raw.leads : [])
        const before = computeCountsSnapshot(leads)
        if (process.env.NODE_ENV === 'development') {
          console.debug('[CRE fetch] received', (data || []).length, 'leads. Prev counts:', before, { sample: (data || [])[0] })
        }
        
        // Map API lead_master fields to UI fields with enhanced null safety
        const mapped = (data || []).map((l: any) => {
          // Only log critical errors in production
          if (!l.uid && process.env.NODE_ENV === 'development') {
            console.warn('[CRE fetch] Lead missing uid:', l)
          }
          if (!l.customer_name && process.env.NODE_ENV === 'development') {
            console.warn('[CRE fetch] Lead missing customer_name:', l)
          }
          
          return {
            id: l.id || l.uid || '',
            uid: l.uid || '',
            customer_name: l.customer_name || '',
            customer_mobile_number: l.customer_mobile_number || '',
            source: l.source || '',
            campaign: l.sub_source || l.model_interested || '',
            date: (l.created_at || '').slice(0,10) || '',
            lead_status: (l.lead_status || '').toString().trim(),
            final_status: (l.final_status || '').toString().trim(),
            lead_category: l.lead_category || 'Warm',
            followup_count: l.followup_count || 0,
            follow_up_date: l.follow_up_date || '',
            first_call_date: l.first_call_date || l.first_call_done_date || '',
            branch: l.branch || '',
            ps_name: l.ps_name || '',
            ps_id: l.ps_id || '',
            icrop_id: l.icrop_id || '', // Add ICROP ID mapping
            lead_remark: l.first_remark || l.lead_remark || l.pending_reason || '',
            pending_reason: l.pending_reason || '',
            // Previous call history
            second_call_date: l.second_call_date || '',
            second_remark: l.second_remark || '',
            third_call_date: l.third_call_date || '',
            third_remark: l.third_remark || '',
            fourth_call_date: l.fourth_call_date || '',
            fourth_remark: l.fourth_remark || '',
            fifth_call_date: l.fifth_call_date || '',
            fifth_remark: l.fifth_remark || '',
            // Per-step follow-up statuses
            second_call_lead_status: l.second_call_lead_status || '',
            third_call_lead_status: l.third_call_lead_status || '',
            fourth_call_lead_status: l.fourth_call_lead_status || '',
            fifth_call_lead_status: l.fifth_call_lead_status || '',
            sixth_call_lead_status: l.sixth_call_lead_status || ''
          }
        })
        
        setLeads(mapped)
        const after = computeCountsSnapshot(mapped)
        if (process.env.NODE_ENV === 'development') {
          console.debug('[CRE fetch] new counts:', after)
        }
        
        // Check for new walk-in leads and show notifications
        if (before && after) {
          const newWalkinLeads = mapped.filter((lead: any) => 
            ['Walk-in', 'Digital', 'Referral'].includes(lead.source) && 
            lead.cre_name && 
            lead.cre_name.toLowerCase() === (user?.first_name || user?.name || user?.username || '').toLowerCase()
          )
          
          if (newWalkinLeads.length > 0) {
            newWalkinLeads.forEach((lead: any) => {
              const notification = {
                id: `walkin-${lead.uid}-${Date.now()}`,
                type: 'walkin' as const,
                leadUid: lead.uid,
                timestamp: new Date(),
                message: `New walk-in lead assigned: ${lead.customer_name} (${lead.uid})`
              }
              setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep only 5 recent notifications
              
              // Show toast notification
              toast.success(`🎉 New walk-in lead assigned: ${lead.customer_name}`)
              
              // Auto-remove notification after 5 seconds
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id))
              }, 5000)
            })
          }
        }
        
        return { before, after }
      } else {
        console.error('API Error:', response.status, response.statusText)
        return null
      }
    } catch (e) {
      console.error('Failed to fetch assigned leads', e)
      return null
    } finally {
      if (!skipSpinner) setIsLoading(false)
    }
  }

  const fetchLostRequests = async () => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch('/api/leads/lost-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLostRequests(data || [])
      } else {
        console.error('Error fetching lost requests:', response.status, response.statusText)
      }
    } catch (e) {
      console.error('Failed to fetch lost requests', e)
    }
  }

  const handleUpdateLead = (leadData: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🔄 [UI Sync] Lead update initiated; syncing from lead_master", leadData)
    }
    
    // Strict server-sync: refetch from lead_master (single source of truth)
    setIsRefreshing(true)
    
    // Small delay because the PUT is triggered inside the modal after this callback
    setTimeout(() => {
      fetchAssignedLeads()
      // Second pass to guarantee consistency even if DB commit lags briefly
      setTimeout(() => {
        fetchAssignedLeads()
        setIsRefreshing(false)
      }, 1200)
    }, 600)
  }

  const openUpdateModal = (lead: Lead) => {
    setSelectedLead(lead)
    setIsUpdateModalOpen(true)
  }

  const handleAddLead = (leadData: any) => {
    // Add the new lead to the leads list
    const newLead = {
      id: leadData.uid,
      uid: leadData.uid,
      customer_name: leadData.customer_name,
      customer_mobile_number: leadData.customer_mobile_number,
      source: leadData.source,
      campaign: leadData.sub_source || '', // Map sub_source to campaign for display
      date: leadData.created_at?.slice(0,10) || new Date().toISOString().slice(0,10),
      // CRE leads are immediately qualified
      lead_status: 'Qualified',
      final_status: leadData.final_status,
      lead_category: leadData.lead_category || 'Warm',
      followup_count: 0,
      follow_up_date: leadData.follow_up_date,
      first_call_date: new Date().toISOString(), // CRE adding lead counts as first call
      lead_remark: leadData.remarks || ''
    }
    setLeads(prevLeads => [newLead, ...prevLeads])
    // Also refetch from server to ensure parity with backend
    setTimeout(() => { fetchAssignedLeads(true) }, 600)
  }

  const handleApproveLost = async (leadUid: string) => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/leads/${leadUid}/lost-approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        alert('Lost status approved successfully!')
        fetchLostRequests()
        fetchAssignedLeads() // Refresh main leads
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error || 'Failed to approve lost status'}`)
      }
    } catch (error) {
      console.error('Error approving lost status:', error)
      alert('Failed to approve lost status')
    }
  }

  const handleRejectLost = async (leadUid: string) => {
    const reason = prompt('Please provide a reason for rejection (optional):')
    if (reason === null) return // User cancelled

    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/leads/${leadUid}/lost-reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejection_reason: reason })
      })

      if (response.ok) {
        alert('Lost status rejected successfully!')
        fetchLostRequests()
        fetchAssignedLeads() // Refresh main leads
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error || 'Failed to reject lost status'}`)
      }
    } catch (error) {
      console.error('Error rejecting lost status:', error)
      alert('Failed to reject lost status')
    }
  }

  // Filter leads based on active tab and status
  const getFilteredLeads = () => {
    try {
      let filteredLeads = leads

    const todayIso = new Date().toISOString().slice(0,10)
    const startOfWeek = (() => {
      const d = new Date()
      const day = d.getDay() || 7
      if (day !== 1) d.setHours(-24 * (day - 1))
      return d.toISOString().slice(0,10)
    })()

    const withinDateFilter = (lead: any) => {
      const created = (lead.date || '').slice(0,10)
      
      // Use new date range filter if dates are set
      if (startDate) {
        return created === startDate
      }
      
      // Fallback to old date mode system
      if (dateMode === 'All Time') return true
      if (dateMode === 'Today') return created === todayIso
      if (dateMode === 'This Week') return created >= startOfWeek && created <= todayIso
      if (dateMode === 'Date Range') {
        return startDate ? created === startDate : true
      }
      return true
    }

    const isFinalizedWon = (lead: any) => {
      const fs = (lead?.final_status || '').toString().toLowerCase()
      return fs === 'booked' || fs === 'retailed'
    }

    // Filter by tab
    switch (activeTab) {
      case "fresh":
        // Fresh should exclude qualified and won leads
        // Include all non-qualified, non-won leads (including call outcomes like RNR, DND, etc.)
        filteredLeads = leads.filter(l => {
          if (isFinalizedWon(l)) return false
          const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
          return leadStatus !== "qualified"
        })
        break
      case "followup":
        {
          const today = new Date().toISOString().slice(0,10)
          filteredLeads = leads.filter(lead => {
            if (!lead.follow_up_date) return false
            const followUpDate = lead.follow_up_date.includes('T')
              ? lead.follow_up_date.slice(0,10)
              : lead.follow_up_date
            // Include due today or overdue
            return followUpDate <= today
          })
        }
        break
      case "pending":
        // Pending = final_status Pending AND first call done
        if (process.env.NODE_ENV === 'development') {
          console.log('Filtering pending leads:', leads.length, 'total leads')
        }
        const pendingCandidates = leads.filter(lead => ((lead?.final_status ?? "").toString().toLowerCase() === "pending") && !!(lead?.first_call_date) && !isFinalizedWon(lead))
        if (process.env.NODE_ENV === 'development') {
          console.log('Pending candidates:', pendingCandidates.length, pendingCandidates.map(l => ({ uid: l.uid, lead_status: l.lead_status, final_status: l.final_status, first_call_date: l.first_call_date })))
        }
        filteredLeads = pendingCandidates
        if (pendingCategory !== "all") {
          filteredLeads = filteredLeads.filter(lead => lead.lead_category === pendingCategory)
        }
        break
      case "qualified":
        // Qualified tab: lead_status = Qualified AND final_status = Pending
        if (process.env.NODE_ENV === 'development') {
          console.log('Filtering qualified leads:', leads.length, 'total leads')
        }
        const qualifiedCandidates = leads.filter(lead => (lead?.lead_status === "Qualified") && ((lead?.final_status ?? "").toString().toLowerCase() === "pending") && !isFinalizedWon(lead))
        if (process.env.NODE_ENV === 'development') {
          console.log('Qualified candidates:', qualifiedCandidates.length, qualifiedCandidates.map(l => ({ uid: l.uid, lead_status: l.lead_status, final_status: l.final_status })))
        }
        filteredLeads = qualifiedCandidates
        break
      case "wonlost":
        filteredLeads = leads.filter(lead => {
          const fs = (lead?.final_status || '').toString().toLowerCase()
          const isLost = fs === 'lost' || lead?.lead_status === 'Lost'
          const isLostRequested = fs === 'lost requested'
          const isBooked = fs === 'booked'
          const isRetailed = fs === 'retailed'
          return isLost || isLostRequested || isBooked || isRetailed
        })
        break
      case "lostconfirm":
        // Lost confirmation = leads with lost_status = "Requested" for this CRE
        filteredLeads = lostRequests.map(request => ({
          id: request.lead_uid,
          uid: request.lead_uid,
          customer_name: request.customer_name,
          customer_mobile_number: request.customer_mobile_number,
          source: request.source,
          campaign: request.model_interested || '',
          date: request.created_at ? request.created_at.slice(0,10) : '',
          lead_status: 'Lost Requested',
          final_status: 'Lost Requested',
          lead_category: request.lead_category || 'Warm',
          followup_count: 0,
          follow_up_date: '',
          first_call_date: '',
          branch: request.branch,
          ps_name: request.ps_name,
          ps_id: request.ps_id,
          icrop_id: request.icrop_id,
          lead_remark: request.lost_reason || '',
          pending_reason: '',
          // Additional fields for lost requests
          lost_reason: request.lost_reason,
          lost_requested_at: request.lost_requested_at,
          ps_requested_by: request.ps_name
        }))
        break
      case "walkin":
        // Filter to only show walk-in, digital, and referral leads
        filteredLeads = leads.filter(lead =>
          ['Walk-in', 'Digital', 'Referral'].includes(lead.source)
        )
        break
      default:
        filteredLeads = leads
    }

    filteredLeads = filteredLeads.filter(withinDateFilter)


    // Filter by status within tab using business rules
    if (activeTab === "fresh") {
      if (activeStatus === "Fresh") {
        // Untouched: lead_status is null/empty OR "Pending" (for admin-assigned leads) AND final_status is Pending
        filteredLeads = filteredLeads.filter(lead => {
          const leadStatus = (lead?.lead_status ?? "").toString().toLowerCase()
          const finalStatus = (lead?.final_status ?? "").toString().toLowerCase()
          return (leadStatus === "" || leadStatus === "pending") && finalStatus === "pending"
        })
      } else if (activeStatus === "Called") {
        // Called: any of the non-CMB call outcomes
        const calledSet = new Set(["rnr","dnd","not reachable","switched off","busy","disconnecting the call","temporary out of service","incoming call facility not available","out of network","plan postponed","interested"]) 
        filteredLeads = filteredLeads.filter(lead => calledSet.has((lead?.lead_status ?? "").toString().toLowerCase()))
      } else if (activeStatus === "Follow Up") {
        // Follow Up: explicit 'Call me back'
        filteredLeads = filteredLeads.filter(lead => (lead?.lead_status ?? "").toString().toLowerCase() === "call me back")
      } else {
        // Fallback to equality for any other status values
        filteredLeads = filteredLeads.filter(lead => lead.lead_status === activeStatus)
      }
    }

    // Filter by search term
    if (searchTerm) {
      filteredLeads = filteredLeads.filter(lead => 
        (lead.uid || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.customer_mobile_number || '').includes(searchTerm)
      )
    }

      return filteredLeads
    } catch (error) {
      console.error('Error in getFilteredLeads:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Leads data:', leads)
        console.error('Search term:', searchTerm)
        console.error('Active tab:', activeTab)
        console.error('Active status:', activeStatus)
      }
      // Return empty array to prevent crash
      return []
    }
  }

  const getTabCounts = () => {
    try {
      const today = new Date().toISOString().slice(0,10)
    const isFinalizedWon = (l: Lead) => {
      const fs = (l?.final_status || '').toString().toLowerCase()
      return fs === 'booked' || fs === 'retailed'
    }
    const isUntouched = (l: Lead) => {
      const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
      const finalStatus = (l?.final_status ?? "").toString().toLowerCase()
      return (leadStatus === "" || leadStatus === "pending") && finalStatus === "pending"
    }
    const isCalled = (l: Lead) => {
      const s = (l?.lead_status ?? "").toString().toLowerCase()
      return ["rnr","dnd","not reachable","switched off","busy","disconnecting the call","temporary out of service","incoming call facility not available","out of network","plan postponed","interested"].includes(s)
    }
    const isFollowUp = (l: Lead) => (l?.lead_status ?? "").toString().toLowerCase() === "call me back"
    return {
      fresh: leads.filter(l => {
        const leadStatus = (l?.lead_status || '').toString().toLowerCase()
        return leadStatus !== 'qualified' && !isFinalizedWon(l)
      }).length,
      followup: leads.filter(lead => {
        if (!lead.follow_up_date) return false
        const followUpDate = lead.follow_up_date.includes('T') 
          ? lead.follow_up_date.slice(0,10) 
          : lead.follow_up_date
        return followUpDate <= today && !isFinalizedWon(lead)
      }).length,
      // Pending = final_status Pending AND first call done
      pending: leads.filter(lead => ((lead?.final_status ?? "").toString().toLowerCase() === "pending") && !!(lead?.first_call_date) && !isFinalizedWon(lead)).length,
      // Qualified = lead_status Qualified AND final_status Pending
      qualified: leads.filter(lead => (lead?.lead_status === "Qualified") && ((lead?.final_status ?? "").toString().toLowerCase() === "pending") && !isFinalizedWon(lead)).length,
      wonlost: leads.filter(lead => {
        const fs = (lead?.final_status || '').toString().toLowerCase()
        const isLost = fs === 'lost' || lead?.lead_status === 'Lost'
        const isLostRequested = fs === 'lost requested'
        const isBooked = fs === 'booked'
        const isRetailed = fs === 'retailed'
        return isLost || isLostRequested || isBooked || isRetailed
      }).length,
      won: leads.filter(lead => {
        const fs = (lead?.final_status || '').toString().toLowerCase()
        return fs === 'booked' || fs === 'retailed'
      }).length,
      lost: leads.filter(lead => lead?.lead_status === 'Lost').length,
      lostRequested: leads.filter(lead => (lead?.final_status || '').toString().toLowerCase() === 'lost requested').length,
      lostconfirm: lostRequests.length,
      walkin: leads.filter(lead => ['Walk-in', 'Digital', 'Referral'].includes(lead.source)).length
    }
    } catch (error) {
      console.error('Error in getTabCounts:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Leads data:', leads)
      }
      // Return zero counts to prevent crash
      return {
        fresh: 0,
        followup: 0,
        pending: 0,
        qualified: 0,
        wonlost: 0,
        won: 0,
        lost: 0,
        lostRequested: 0,
        lostconfirm: 0,
        walkin: 0
      }
    }
  }

  const getStatusCounts = () => {
    try {
      const freshLeadsUntouched = leads.filter(l => {
      const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
      const finalStatus = (l?.final_status ?? "").toString().toLowerCase()
      return (leadStatus === "" || leadStatus === "pending") && finalStatus === "pending"
    })
    const calledSet = new Set(["rnr","dnd","not reachable","switched off","busy","disconnecting the call","temporary out of service","incoming call facility not available","out of network","plan postponed","interested"]) 
    const freshLeadsCalled = leads.filter(l => calledSet.has((l?.lead_status ?? "").toString().toLowerCase()))
      const freshLeadsFollowUp = leads.filter(l => (l?.lead_status ?? "").toString().toLowerCase() === "call me back")
      return {
        untouched: freshLeadsUntouched.length,
        called: freshLeadsCalled.length,
        followup: freshLeadsFollowUp.length
      }
    } catch (error) {
      console.error('Error in getStatusCounts:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Leads data:', leads)
      }
      // Return zero counts to prevent crash
      return {
        untouched: 0,
        called: 0,
        followup: 0
      }
    }
  }

  const userName = user?.first_name || user?.name || user?.username || "Kumari"
  
  const filteredLeads = useMemo(() => {
    try {
      return getFilteredLeads()
    } catch (error) {
      console.error('Error in filteredLeads useMemo:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Dependencies:', { leads: leads.length, activeTab, activeStatus, searchTerm, pendingCategory, startDate })
      }
      return []
    }
  }, [leads, activeTab, activeStatus, searchTerm, pendingCategory, startDate])
  
  const tabCounts = useMemo(() => {
    try {
      return getTabCounts()
    } catch (error) {
      console.error('Error in tabCounts useMemo:', error)
      return {
        fresh: 0,
        followup: 0,
        pending: 0,
        qualified: 0,
        wonlost: 0,
        won: 0,
        lost: 0,
        lostRequested: 0,
        lostconfirm: 0,
        walkin: 0
      }
    }
  }, [leads])
  
  const statusCounts = useMemo(() => {
    try {
      return getStatusCounts()
    } catch (error) {
      console.error('Error in statusCounts useMemo:', error)
      return {
        untouched: 0,
        called: 0,
        followup: 0
      }
    }
  }, [leads])

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-100 rounded-2xl">
                <User className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CRE Dashboard</h1>
                <p className="text-gray-600">Welcome back, {userName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="relative">
                <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">
                    {notifications.length} new walk-in lead{notifications.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Notification dropdown */}
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">Recent Notifications</h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className="p-3 border-b border-gray-100 hover:bg-gray-50"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              Walk-in Lead Assigned
                            </p>
                            <p className="text-sm text-gray-600">
                              {notification.message || `New walk-in lead assigned: ${notification.leadUid}`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Count Refresh Indicator */}
            {isRefreshing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">
                  Syncing counts...
                </span>
              </div>
            )}
            
            {/* Primary Button - Add Lead */}
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold shadow-sm bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-300 transition-all duration-150 min-h-[44px] min-w-[44px]"
              onClick={() => setIsAddModalOpen(true)}
              aria-label="Add new lead"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </button>
            
            {/* Secondary Button - Refresh */}
            <button 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm border bg-white text-gray-800 hover:shadow-sm focus:ring-2 focus:ring-blue-100 transition-all duration-150 min-h-[44px] min-w-[44px]" 
              onClick={() => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('🔄 [Manual] Manual refresh triggered')
                }
                fetchAssignedLeads()
                fetchLostRequests()
              }}
              aria-label="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            
            {/* Secondary Button - Analytics */}
            <button 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm border bg-white text-gray-800 hover:shadow-sm focus:ring-2 focus:ring-blue-100 transition-all duration-150 min-h-[44px] min-w-[44px]" 
              onClick={() => window.location.assign('/analytics')}
              aria-label="View analytics"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </button>
            
            {/* Ghost Button - Sign Out */}
            <button 
              className="px-2 py-1 rounded-2xl text-sm text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-100 transition-all duration-150 min-h-[44px] min-w-[44px]"
              onClick={() => { localStorage.clear(); window.location.assign('/auth/login') }}
              aria-label="Sign out"
            >
              Sign Out
            </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-100/90 to-blue-200/70 text-slate-800 border border-blue-300/30 shadow-md rounded-3xl backdrop-blur-[6px] h-40 md:h-44">
              {/* Apple-Magnus glassy effect layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
              <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
              
              <CardContent className="relative p-4 md:p-5 flex flex-col h-full items-center justify-between">
                {/* Title at top center */}
                <div className="flex items-center justify-center mb-2">
                  <p className="text-slate-700 text-sm md:text-base font-medium text-center">Fresh Leads</p>
                </div>
                
                {/* Main count in center */}
                <div className="flex items-center justify-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-800 text-center leading-none">{tabCounts.fresh}</p>
                </div>
                
                {/* Sub-values below count with Apple-Magnus glassy effect */}
                <div className="flex items-center justify-center space-x-2 mt-3">
                  <span className="relative w-7 h-7 flex items-center justify-center text-sm rounded-full font-semibold shadow-lg backdrop-blur-sm overflow-hidden">
                    {/* Blue circle with glassy effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[2px]"></div>
                    <span className="relative text-white z-10 font-bold">{statusCounts.untouched}</span>
                  </span>
                  <span className="relative w-7 h-7 flex items-center justify-center text-sm rounded-full font-semibold shadow-lg backdrop-blur-sm overflow-hidden">
                    {/* Gray circle with glassy effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-600"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[2px]"></div>
                    <span className="relative text-white z-10 font-bold">{statusCounts.called}</span>
                  </span>
                  <span className="relative w-7 h-7 flex items-center justify-center text-sm rounded-full font-semibold shadow-lg backdrop-blur-sm overflow-hidden">
                    {/* Amber circle with glassy effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[2px]"></div>
                    <span className="relative text-white z-10 font-bold">{statusCounts.followup}</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-100/90 to-yellow-200/70 text-slate-800 border border-yellow-300/30 shadow-md rounded-3xl backdrop-blur-[6px] h-40 md:h-44">
              {/* Apple-Magnus glassy effect layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-yellow-300/25"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
              <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
              
              <CardContent className="relative p-4 md:p-5 flex flex-col h-full items-center justify-between">
                {/* Title at top center */}
                <div className="flex items-center justify-center mb-2">
                  <p className="text-slate-700 text-sm md:text-base font-medium text-center">Today's Follow-ups</p>
                </div>
                
                {/* Main count in center */}
                <div className="flex items-center justify-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-800 text-center leading-none">{tabCounts.followup}</p>
                </div>
                
                {/* Icon below count */}
                <div className="flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-yellow-600/70" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-orange-100/90 to-orange-200/70 text-slate-800 border border-orange-300/30 shadow-md rounded-3xl backdrop-blur-[6px] h-40 md:h-44">
              {/* Apple-Magnus glassy effect layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-orange-300/25"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
              <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
              
              <CardContent className="relative p-4 md:p-5 flex flex-col h-full items-center justify-between">
                {/* Title at top center */}
                <div className="flex items-center justify-center mb-2">
                  <p className="text-slate-700 text-sm md:text-base font-medium text-center">Pending Leads</p>
                </div>
                
                {/* Main count in center */}
                <div className="flex items-center justify-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-800 text-center leading-none">{tabCounts.pending}</p>
                </div>
                
                {/* Icon below count */}
                <div className="flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600/70" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-green-100/90 to-green-200/70 text-slate-800 border border-green-300/30 shadow-md rounded-3xl backdrop-blur-[6px] h-40 md:h-44">
              {/* Apple-Magnus glassy effect layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-green-300/25"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
              <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
              
              <CardContent className="relative p-4 md:p-5 flex flex-col h-full items-center justify-between">
                {/* Title at top center */}
                <div className="flex items-center justify-center mb-2">
                  <p className="text-slate-700 text-sm md:text-base font-medium text-center">Qualified Leads</p>
                </div>
                
                {/* Main count in center */}
                <div className="flex items-center justify-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-800 text-center leading-none">{tabCounts.qualified}</p>
                </div>
                
                {/* Icon below count */}
                <div className="flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600/70" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-100/90 to-emerald-200/70 text-slate-800 border border-emerald-300/30 shadow-md rounded-3xl backdrop-blur-[6px] h-40 md:h-44">
              {/* Apple-Magnus glassy effect layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-emerald-300/25"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
              <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
              
              <CardContent className="relative p-4 md:p-5 flex flex-col h-full items-center justify-between">
                {/* Title at top center */}
                <div className="flex items-center justify-center mb-2">
                  <p className="text-slate-700 text-sm md:text-base font-medium text-center">Won Leads</p>
                </div>
                
                {/* Main count in center */}
                <div className="flex items-center justify-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-800 text-center leading-none">{tabCounts.won}</p>
                </div>
                
                {/* Icon below count */}
                <div className="flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-emerald-600/70" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-red-100/90 to-red-200/70 text-slate-800 border border-red-300/30 shadow-md rounded-3xl backdrop-blur-[6px] h-40 md:h-44">
              {/* Apple-Magnus glassy effect layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-red-300/25"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
              <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
              
              <CardContent className="relative p-4 md:p-5 flex flex-col h-full items-center justify-between">
                {/* Title at top center */}
                <div className="flex items-center justify-center mb-2">
                  <p className="text-slate-700 text-sm md:text-base font-medium text-center">Lost Leads</p>
                </div>
                
                {/* Main count in center */}
                <div className="flex items-center justify-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-800 text-center leading-none">{tabCounts.lost}</p>
                </div>
                
                {/* Icon below count */}
                <div className="flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600/70" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs - Consistent Styling */}
          <div className="flex flex-wrap gap-2">
            <button 
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 min-h-[44px] min-w-[44px] ${
                activeTab === "fresh" 
                  ? "bg-blue-100 text-blue-800 border-blue-300 shadow-sm" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("fresh")}
              aria-label="View fresh leads"
            >
              <Star className="h-4 w-4" />
              <div className="text-center leading-tight">
                <div>Fresh Leads</div>
                <div>({tabCounts.fresh})</div>
              </div>
            </button>
            <button 
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 min-h-[44px] min-w-[44px] ${
                activeTab === "followup" 
                  ? "bg-amber-100 text-amber-800 border-amber-300 shadow-sm" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("followup")}
              aria-label="View today's follow-ups"
            >
              <Calendar className="h-4 w-4" />
              <div className="text-center leading-tight">
                <div>Today's Follow-ups</div>
                <div>({tabCounts.followup})</div>
              </div>
            </button>
            <button 
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 min-h-[44px] min-w-[44px] ${
                activeTab === "pending" 
                  ? "bg-orange-100 text-orange-800 border-orange-300 shadow-sm" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("pending")}
              aria-label="View pending leads"
            >
              <AlertCircle className="h-4 w-4" />
              <div className="text-center leading-tight">
                <div>Pending Leads</div>
                <div>({tabCounts.pending})</div>
              </div>
            </button>
            <button 
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 min-h-[44px] min-w-[44px] ${
                activeTab === "qualified" 
                  ? "bg-green-100 text-green-800 border-green-300 shadow-sm" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("qualified")}
              aria-label="View qualified leads"
            >
              <Users className="h-4 w-4" />
              <div className="text-center leading-tight">
                <div>Qualified Leads</div>
                <div>({tabCounts.qualified})</div>
              </div>
            </button>
            <button
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 min-h-[44px] min-w-[44px] ${
                activeTab === "walkin"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg border-blue-500"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-gray-200"
              }`}
              onClick={() => setActiveTab("walkin")}
              aria-label="View walk-in leads"
            >
              <Users className="h-4 w-4" />
              <div className="text-center leading-tight">
                <div>Walk-in Leads</div>
                <div>({tabCounts.walkin || 0})</div>
              </div>
            </button>
            <button
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 min-h-[44px] min-w-[44px] ${
                activeTab === "wonlost" 
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("wonlost")}
              aria-label="View won/lost leads"
            >
              <Trophy className="h-4 w-4" />
              <div className="text-center leading-tight">
                <div>Won/Lost Leads</div>
                <div>({tabCounts.wonlost})</div>
              </div>
            </button>
            <button 
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 min-h-[44px] min-w-[44px] ${
                activeTab === "lostconfirm" 
                  ? "bg-red-100 text-red-800 border-red-300 shadow-sm" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("lostconfirm")}
              aria-label="View lost confirmation requests"
            >
              <Calendar className="h-4 w-4" />
              <div className="text-center leading-tight">
                <div>Lost Confirmation</div>
                <div>({tabCounts.lostconfirm})</div>
              </div>
            </button>
          </div>

          {/* Dynamic Leads Section */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {activeTab === "fresh" && "Fresh Leads"}
                    {activeTab === "followup" && "Today's Follow-ups"}
                    {activeTab === "pending" && "Pending Leads"}
                    {activeTab === "qualified" && "Qualified Leads"}
                    {activeTab === "walkin" && "Walk-in Leads"}
                    {activeTab === "wonlost" && "Won/Lost Leads"}
                    {activeTab === "lostconfirm" && "Lost Confirmation"}
                    {" "}({filteredLeads.length})
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative overflow-hidden rounded-2xl backdrop-blur-[6px]">
                    {/* Apple Magnus glassy effect layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    
                    <Clock className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 z-10" />
                    <select 
                      className="relative w-full sm:w-64 pl-10 pr-3 py-2 rounded-2xl border border-blue-200/30 bg-white/90 placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all duration-150 text-sm md:text-base z-10"
                      value={dateMode} 
                      onChange={(e) => setDateMode(e.target.value as any)}
                      aria-label="Select date filter"
                    >
                      <option>All Time</option>
                      <option>Today</option>
                      <option>This Week</option>
                      <option>Date Range</option>
                    </select>
                  </div>
                  
                  {/* Date input for Date Range mode */}
                  {dateMode === "Date Range" && (
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-64 px-3 py-2 rounded-2xl border border-gray-200 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all duration-150 text-sm md:text-base"
                      placeholder="Select Date"
                      aria-label="Select specific date"
                    />
                  )}
                  
                  <div className="relative overflow-hidden rounded-2xl backdrop-blur-[6px]">
                    {/* Apple Magnus glassy effect layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-300/25"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 z-10" />
                    <input 
                      type="text"
                      placeholder="Search by UID, name..." 
                      className="relative w-full sm:w-64 pl-10 pr-3 py-2 rounded-2xl border border-purple-200/30 bg-white/90 placeholder-gray-400 focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all duration-150 text-sm md:text-base z-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search leads"
                    />
                  </div>
                      <button
                    className="px-2 py-1 rounded-2xl text-sm text-gray-600 hover:bg-gray-50 focus:ring-2 focus:ring-gray-100 transition-all duration-150 min-h-[44px] min-w-[44px]"
                        onClick={() => setSearchTerm("")}
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                  
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Status Tabs - Untouched, Called, Follow Up for Fresh Leads */}
              {activeTab === "fresh" && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <button 
                    className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 min-h-[44px] ${
                      activeStatus === "Fresh" 
                        ? "bg-gradient-to-br from-blue-100/90 to-blue-200/70 text-blue-800 border border-blue-300/30 shadow-md backdrop-blur-[6px]" 
                        : "bg-gradient-to-br from-white/90 to-blue-50/70 text-blue-700 border border-blue-200/30 hover:shadow-sm backdrop-blur-[6px]"
                    }`}
                    onClick={() => setActiveStatus("Fresh")}
                    aria-label="View untouched leads"
                  >
                    {/* Apple Magnus glassy effect layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    
                    <span className="relative z-10 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Untouched <span className="ml-1 bg-blue-300/80 px-2 py-0.5 rounded-full text-xs backdrop-blur-sm">{statusCounts.untouched}</span>
                    </span>
                  </button>
                  <button 
                    className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 min-h-[44px] ${
                      activeStatus === "Called" 
                        ? "bg-gradient-to-br from-green-100/90 to-green-200/70 text-green-800 border border-green-300/30 shadow-md backdrop-blur-[6px]" 
                        : "bg-gradient-to-br from-white/90 to-green-50/70 text-green-700 border border-green-200/30 hover:shadow-sm backdrop-blur-[6px]"
                    }`}
                    onClick={() => setActiveStatus("Called")}
                    aria-label="View called leads"
                  >
                    {/* Apple Magnus glassy effect layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    
                    <span className="relative z-10 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Called <span className="ml-1 bg-green-300/80 px-2 py-0.5 rounded-full text-xs backdrop-blur-sm">{statusCounts.called}</span>
                    </span>
                  </button>
                  <button 
                    className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 min-h-[44px] ${
                      activeStatus === "Follow Up" 
                        ? "bg-gradient-to-br from-amber-100/90 to-amber-200/70 text-amber-800 border border-amber-300/30 shadow-md backdrop-blur-[6px]" 
                        : "bg-gradient-to-br from-white/90 to-amber-50/70 text-amber-700 border border-amber-200/30 hover:shadow-sm backdrop-blur-[6px]"
                    }`}
                    onClick={() => setActiveStatus("Follow Up")}
                    aria-label="View follow-up leads"
                  >
                    {/* Apple Magnus glassy effect layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    
                    <span className="relative z-10 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Follow Up <span className="ml-1 bg-amber-300/80 px-2 py-0.5 rounded-full text-xs backdrop-blur-sm">{statusCounts.followup}</span>
                    </span>
                  </button>
                </div>
              )}

              {/* Pending Filters - Hot/Warm/Cold */}
              {activeTab === "pending" && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-600" />
                    <span className="text-sm md:text-base text-gray-600">Lead Category:</span>
                  </div>
                  {(["all", "Hot", "Warm", "Cold"] as const).map(cat => {
                    const getIcon = () => {
                      switch (cat) {
                        case "all": return <Filter className="h-4 w-4" />
                        case "Hot": return <Flame className="h-4 w-4" />
                        case "Warm": return <Thermometer className="h-4 w-4" />
                        case "Cold": return <Snowflake className="h-4 w-4" />
                        default: return null
                      }
                    }
                    
                    const getButtonStyles = () => {
                      const isActive = pendingCategory === cat
                      
                      switch (cat) {
                        case "all":
                          return isActive 
                            ? "relative overflow-hidden bg-gradient-to-br from-slate-100/90 to-slate-200/70 text-slate-800 border border-slate-300/30 shadow-md backdrop-blur-[6px]"
                            : "relative overflow-hidden bg-gradient-to-br from-white/90 to-gray-50/70 text-gray-700 border border-gray-200/30 hover:shadow-sm backdrop-blur-[6px]"
                        case "Hot":
                          return isActive
                            ? "relative overflow-hidden bg-gradient-to-br from-red-100/90 to-red-200/70 text-red-800 border border-red-300/30 shadow-md backdrop-blur-[6px]"
                            : "relative overflow-hidden bg-gradient-to-br from-white/90 to-red-50/70 text-red-700 border border-red-200/30 hover:shadow-sm backdrop-blur-[6px]"
                        case "Warm":
                          return isActive
                            ? "relative overflow-hidden bg-gradient-to-br from-orange-100/90 to-orange-200/70 text-orange-800 border border-orange-300/30 shadow-md backdrop-blur-[6px]"
                            : "relative overflow-hidden bg-gradient-to-br from-white/90 to-orange-50/70 text-orange-700 border border-orange-200/30 hover:shadow-sm backdrop-blur-[6px]"
                        case "Cold":
                          return isActive
                            ? "relative overflow-hidden bg-gradient-to-br from-blue-100/90 to-blue-200/70 text-blue-800 border border-blue-300/30 shadow-md backdrop-blur-[6px]"
                            : "relative overflow-hidden bg-gradient-to-br from-white/90 to-blue-50/70 text-blue-700 border border-blue-200/30 hover:shadow-sm backdrop-blur-[6px]"
                        default:
                          return ""
                      }
                    }
                    
                    return (
                      <button
                        key={cat}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 min-h-[44px] ${getButtonStyles()}`}
                        onClick={() => setPendingCategory(cat)}
                        aria-label={`Filter by ${cat} leads`}
                      >
                        {/* Apple Magnus glassy effect layers */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                        <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                        
                        {/* Content */}
                        <span className="relative z-10 flex items-center gap-2">
                          {getIcon()}
                          {cat.toString()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {activeTab === "wonlost" && (
                <></>
              )}

              {/* Subtle Refreshing Indicator */}
              {isRefreshing && (
                <div className="mb-2 flex items-center justify-center text-sm text-blue-600 bg-blue-50 py-2 px-4 rounded-2xl">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Syncing data...
                </div>
              )}

              {/* Leads Table */}
              <div className="overflow-x-auto rounded-2xl">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-800">ACTION</th>
                      {!(activeTab === "fresh" && activeStatus === "Fresh") && activeTab !== 'wonlost' && activeTab !== 'qualified' && (
                        <th className="text-left p-3 font-semibold text-gray-800">
                          LEAD STATUS
                        </th>
                      )}
                      <th className="text-left p-3 font-semibold text-gray-800">CUSTOMER NAME</th>
                      <th className="text-left p-3 font-semibold text-gray-800">MOBILE</th>
                      <th className="text-left p-3 font-semibold text-gray-800">SOURCE</th>
                      <th className="text-left p-3 font-semibold text-gray-800">CAMPAIGN</th>
                      <th className="text-left p-3 font-semibold text-gray-800">BRANCH</th>
                      {!(activeTab === "fresh" && activeStatus === "Fresh") && (
                        <th className="text-left p-3 font-semibold text-gray-800">ICROP ID</th>
                      )}
                      <th className="text-left p-3 font-semibold text-gray-800">GEM</th>
                      {activeTab === "lostconfirm" && (
                        <th className="text-left p-3 font-semibold text-gray-800">LOST REASON</th>
                      )}
                      <th className="text-left p-3 font-semibold text-gray-800">DATE</th>
                      <th className="text-left p-3 font-semibold text-gray-800">UID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={
                          (activeTab === "fresh" && activeStatus === "Fresh") ? 7 : 
                          activeTab === 'wonlost' ? 6 : 
                          activeTab === 'qualified' ? 7 : 8
                        } className="p-8 text-center text-gray-500">
                          Loading leads...
                        </td>
                      </tr>
                    ) : filteredLeads.length > 0 ? (
                      filteredLeads.map((lead, index) => {
                        const followUpDate = lead.follow_up_date ? (lead.follow_up_date.includes('T') ? lead.follow_up_date.slice(0,10) : lead.follow_up_date) : ""
                        const overdueDays = followUpDate && followUpDate < new Date().toISOString().slice(0,10) ? Math.ceil((Date.now() - new Date(followUpDate + 'T00:00:00').getTime())/86400000) : 0
                        
                        // Zebra striping with alternating gray and white
                        const isEvenRow = index % 2 === 0
                        const baseRowClass = isEvenRow ? 'bg-white' : 'bg-gray-50'
                        const hoverClass = 'hover:bg-blue-50'
                        
                        // Special status highlighting (pastel tints for special cases)
                        let specialStatusClass = ''
                        if (overdueDays > 0) {
                          specialStatusClass = 'bg-red-50 hover:bg-red-100' // Overdue follow-ups
                        } else if (lead.lead_category === 'Hot') {
                          specialStatusClass = 'bg-orange-50 hover:bg-orange-100' // High-priority leads
                        }
                        
                        const rowColorClass = specialStatusClass || `${baseRowClass} ${hoverClass}`
                        
                        return (
                        <tr key={lead.id} className={`border-b transition-colors duration-200 ${rowColorClass}`}>
                          <td className="p-3">
                            <div className="flex gap-2">
                              {activeTab === "lostconfirm" ? (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-500 hover:bg-green-600 text-white rounded-2xl"
                                    onClick={() => handleApproveLost(lead.uid)}
                                  >
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 rounded-2xl"
                                    onClick={() => handleRejectLost(lead.uid)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    className="relative overflow-hidden inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium transition-all duration-200 min-h-[40px] transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-300 bg-gradient-to-br from-green-50/90 to-green-100/70 text-green-800 border border-green-200/30 shadow-lg backdrop-blur-[6px] hover:shadow-xl"
                                    onClick={() => openUpdateModal(lead)}
                                    aria-label={`Update lead ${lead.uid}`}
                                  >
                                    {/* Apple Magnus glassy effect layers */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-green-300/25"></div>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                                    
                                    <span className="relative z-10 flex items-center gap-2">
                                      <div className="p-1 bg-green-100/80 rounded-xl backdrop-blur-sm">
                                        <Edit3 className="h-3 w-3 text-green-600" />
                                      </div>
                                      Update
                                    </span>
                                  </button>
                                  {/* Only show History button for leads that are not fresh/untouched */}
                                  {!(activeTab === "fresh" && activeStatus === "Fresh") && (
                                    <button 
                                      className="relative overflow-hidden inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium transition-all duration-200 min-h-[40px] transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 bg-gradient-to-br from-blue-50/90 to-blue-100/70 text-blue-800 border border-blue-200/30 shadow-lg backdrop-blur-[6px] hover:shadow-xl"
                                      onClick={() => {
                                        setSelectedLead(lead)
                                        setIsRemarksSyncOpen(true)
                                      }}
                                      aria-label={`View history for lead ${lead.uid}`}
                                    >
                                      {/* Apple Magnus glassy effect layers */}
                                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
                                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                                      <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                                      
                                      <span className="relative z-10 flex items-center gap-2">
                                        <div className="p-1 bg-blue-100/80 rounded-xl backdrop-blur-sm">
                                          <Clock className="h-3 w-3 text-blue-600" />
                                        </div>
                                        History
                                      </span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          {!(activeTab === "fresh" && activeStatus === "Fresh") && activeTab !== 'wonlost' && activeTab !== 'qualified' && (
                            <td className="p-3">
                              {/* Show Qualified + latest follow-up status if available */}
                              {(() => {
                                const latestFollowUpStatus = lead.sixth_call_lead_status || lead.fifth_call_lead_status || lead.fourth_call_lead_status || lead.third_call_lead_status || lead.second_call_lead_status || ''
                                const primary = (lead.lead_status || '').toString()
                                const label = primary === 'Qualified' && latestFollowUpStatus ? `Qualified + ${latestFollowUpStatus}` : primary
                                return (
                                  <Badge 
                                    variant="outline"
                                    className={`rounded-full ${
                                      (primary === "Fresh" ? "bg-blue-100 text-blue-800" :
                                       primary === "Called" ? "bg-green-100 text-green-800" :
                                       primary === "Follow Up" ? "bg-yellow-100 text-yellow-800" :
                                       primary === "Qualified" ? "bg-purple-100 text-purple-800" :
                                       primary === "Won" ? "bg-green-100 text-green-800" :
                                       primary === "Lost" ? "bg-red-100 text-red-800" :
                                       "bg-gray-100 text-gray-800")
                                    }`}
                                  >
                                    {label}
                                  </Badge>
                                )
                              })()}
                              {activeTab === "followup" && overdueDays > 0 && (
                                <Badge variant="secondary" className="ml-2 bg-red-600 text-white rounded-full">Overdue: {overdueDays} {overdueDays === 1 ? 'day' : 'days'}</Badge>
                              )}
                            </td>
                          )}
                          <td className="p-3 font-medium text-gray-900">{lead.customer_name}</td>
                          <td className="p-3 text-gray-800">{lead.customer_mobile_number}</td>
                          <td className="p-3 text-gray-800">{lead.source}</td>
                          <td className="p-3 text-gray-800">{lead.campaign}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={`rounded-full ${lead.branch ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                              {lead.branch || 'Unassigned'}
                            </Badge>
                          </td>
                          {!(activeTab === "fresh" && activeStatus === "Fresh") && (
                            <td className="p-3">
                              <Badge variant="outline" className={`rounded-full ${lead.icrop_id ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"}`}>
                                {lead.icrop_id || 'Pending'}
                              </Badge>
                            </td>
                          )}
                          <td className="p-3">
                            <Badge variant="outline" className={`rounded-full ${lead.ps_name ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                              {lead.ps_name || 'Unassigned'}
                            </Badge>
                          </td>
                          {activeTab === "lostconfirm" && (
                            <td className="p-3">
                              <div className="text-sm text-gray-800 bg-red-50 rounded-2xl p-2 border border-red-200">
                                {lead.lost_reason || 'No reason provided'}
                              </div>
                            </td>
                          )}
                          <td className="p-3 text-sm text-gray-800">{lead.date}</td>
                          <td className="p-3 text-sm font-mono text-gray-800">{lead.uid}</td>
                        </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={
                          (activeTab === "fresh" && activeStatus === "Fresh") ? 7 : 
                          activeTab === 'wonlost' ? 6 : 
                          activeTab === 'qualified' ? 7 : 8
                        } className="p-8 text-center text-gray-500">
                          No leads found for the selected criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lead Update Modal */}
      <LeadUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        lead={selectedLead}
        onUpdate={handleUpdateLead}
      />

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddLead}
        user={user}
      />

      {/* Remarks Sync Modal */}
      <RemarksSync
        isOpen={isRemarksSyncOpen}
        onClose={() => setIsRemarksSyncOpen(false)}
        leadUid={selectedLead?.uid || ''}
        customerName={selectedLead?.customer_name || ''}
      />
    </DashboardLayout>
  )
}
