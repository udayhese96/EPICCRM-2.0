"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Thermometer,
  Globe
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
    return fs === 'booked' || fs === 'retailed' || fs === 'won' || fs.includes('won')
  }
  const calledSet = new Set(["rnr","dnd","not reachable","switched off","busy","disconnecting the call","temporary out of service","incoming call facility not available","out of network","plan postponed","interested"]) 
  
  // Calculate individual components
  const untouched = leads.filter(l => {
    const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
    const finalStatus = (l?.final_status ?? "").toString().toLowerCase()
    return (leadStatus === "" || leadStatus === "pending") && finalStatus === "pending" && !isFinalizedWon(l)
  }).length
  
  const called = leads.filter(l => {
    const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
    return calledSet.has(leadStatus) && !isFinalizedWon(l)
  }).length
  
  const followUp = leads.filter(l => {
    const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
    return leadStatus === "call me back" && !isFinalizedWon(l)
  }).length
  
  // Fresh leads = untouched + called + followup (as requested)
  const fresh = untouched + called + followUp
  
  const qualified = leads.filter(l => (l?.lead_status === 'Qualified') && ((l?.final_status || '').toString().toLowerCase() === 'pending') && !isFinalizedWon(l)).length
  const pending = leads.filter(l => 
    ((l?.final_status || '').toString().toLowerCase() === 'pending') && 
    (!!(l?.first_call_date) || (l?.pending_reasons && l.pending_reasons.length > 0)) && 
    !isFinalizedWon(l)
  ).length
  return { total: leads.length, fresh, called, followUp, qualified, pending }
}

interface Lead {
  id: string
  uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  sub_source?: string
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
  // Qualification fields
  model_interested?: string
  variant?: string
  buying_plan?: string
  finance_option?: string
  trade_in?: string
  trade_in_make?: string
  trade_in_model?: string
  trade_in_year?: string
  trade_in_km?: string
  trade_in_ownership?: string
  test_drive?: boolean
  test_drive_type?: string
  profession?: string
  // Additional fields for lost requests
  lost_reason?: string
  lost_requested_at?: string
  ps_requested_by?: string
  // Pending reasons for pending leads (JSONB array) - multiple attempts
  pending_reasons?: Array<{
    attempt: number
    reason: string
    status: string
    date: string
    user?: string
  }>
  // Existing remarks for unqualified/lost leads
  existing_remarks?: string
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
  const [wonLostSubTab, setWonLostSubTab] = useState<'all' | 'won' | 'lost'>('all')
  const [followupSubTab, setFollowupSubTab] = useState<'today' | 'overdue' | 'all'>('all')
  const [activeStatus, setActiveStatus] = useState<string>("Fresh")
  const [searchTerm, setSearchTerm] = useState("")
  const [pendingCategory, setPendingCategory] = useState<"all" | "Hot" | "Warm" | "Cold">("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [callOutcomeFilter, setCallOutcomeFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateMode, setDateMode] = useState<"All Time" | "Today" | "This Week" | "Date Range">("All Time")
  const [wonLostFilter, setWonLostFilter] = useState<"all" | "Booked" | "Retailed" | "Lost" | "Lost Requested">("all")
  const [startDate, setStartDate] = useState('')
  const [redisWorkerStatus, setRedisWorkerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const [countsUpdating, setCountsUpdating] = useState(false)
  const [notifications, setNotifications] = useState<Array<{id: string, type: 'walkin', leadUid: string, timestamp: Date, message?: string}>>([])

  // Debounced refresh to coalesce multiple triggers
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRefreshAtRef = useRef<number>(0)

  const requestRefresh = (options?: { immediate?: boolean, force?: boolean }) => {
    const now = Date.now()
    const immediate = !!options?.immediate
    const force = !!options?.force
    // Throttle: if a refresh was requested very recently, skip unless forced
    if (!force && (now - lastRefreshAtRef.current < 800)) return
    lastRefreshAtRef.current = now

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    const run = async () => {
      setIsRefreshing(true)
      await fetchAssignedLeads(true)
      fetchLostRequests()
      setTimeout(() => setIsRefreshing(false), 900)
    }

    if (immediate) {
      run()
    } else {
      refreshTimerRef.current = setTimeout(run, 300)
    }
  }

  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      setUser(JSON.parse(supabaseUser))
    }
    fetchAssignedLeads()
    fetchLostRequests()

    // Listen for CRE-specific immediate refresh events after modal submits
    const immediateRefresh = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [Event] Lead master updated event triggered (immediate hard refetch)')
      }
      try {
        setIsRefreshing(true)
        // Hard refetch both lists to reflect new insertions immediately
        await fetchAssignedLeads()
        await fetchLostRequests()
      } finally {
        setIsRefreshing(false)
      }
      // Additional staggered refetches to cover eventual consistency
      setTimeout(async () => {
        await fetchAssignedLeads()
        await fetchLostRequests()
      }, 600)
      setTimeout(async () => {
        await fetchAssignedLeads()
        await fetchLostRequests()
      }, 1500)
    }
    
    // Listen for CRE-specific lead status changes
    const handleLeadStatusChange = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [Event] Lead status change event triggered')
      }
      try {
        setIsRefreshing(true)
        await fetchAssignedLeads()
        await fetchLostRequests()
      } finally {
        setIsRefreshing(false)
      }
      setTimeout(async () => {
        await fetchAssignedLeads()
        await fetchLostRequests()
      }, 600)
    }
    
    // Listen for CRE-specific events only
    if (!user?.username) return () => {}
    
    const creSpecificEventName = `lead-master-updated-${user.username}`
    const creSpecificStatusEventName = `lead-status-changed-${user.username}`
    
    window.addEventListener(creSpecificEventName, immediateRefresh as any)
    window.addEventListener(creSpecificStatusEventName, handleLeadStatusChange as any)
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
      // Cleanup CRE-specific event listeners
      window.removeEventListener(creSpecificEventName, immediateRefresh as any)
      window.removeEventListener(creSpecificStatusEventName, handleLeadStatusChange as any)
      // Cleanup polling intervals
      clearInterval(primaryPolling)
      clearInterval(countPolling)
      clearInterval(workerStatusCheck)
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [user?.username])

  // NEW: Refetch leads when active tab changes (for backend filtering)
  useEffect(() => {
    if (user?.username && activeTab) {
      console.log(`🔄 [Tab Change] Fetching leads for tab: ${activeTab}`)
      fetchAssignedLeads()
      // Also refresh lost requests when tab changes (especially for lost confirmation tab)
      fetchLostRequests()
      // Reset status filter to "all" when tab changes
      setStatusFilter("all")
    }
  }, [activeTab])

  // Reset status filter when activeStatus changes (for Fresh tab sections)
  useEffect(() => {
    setStatusFilter("all")
    setCallOutcomeFilter("all")
    setSourceFilter("all")
  }, [activeStatus])

  // Reset call outcome filter when status filter changes
  useEffect(() => {
    setCallOutcomeFilter("all")
  }, [statusFilter])

  const setupRealtimeSubscriptions = () => {
    // Only setup if we have a user
    if (!user?.username) {
      return () => {}
    }
    
    try {
      const supabase = createClient()
    
    // Subscribe to lead_master changes with server-side filtering for efficiency
    const leadSubscription = supabase
      .channel(`lead_master_changes_${user.username}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_master',
          filter: `cre_name=eq.${user.username}`
        },
        (payload) => {
          // Server-side filtering ensures we only receive events for this CRE's leads
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [Real-time] Lead master change detected for this CRE:', payload.eventType, (payload.new as any)?.uid || (payload.old as any)?.uid)
            console.log('🔄 [Real-time] Lead status change:', {
              old_status: (payload.old as any)?.lead_status,
              new_status: (payload.new as any)?.lead_status,
              old_remark: (payload.old as any)?.lead_remark,
              new_remark: (payload.new as any)?.lead_remark
            })
            console.log('🔄 [Real-time] Refreshing leads data due to lead_master change')
          }
          setCountsUpdating(true)
          requestRefresh({ immediate: true, force: true })
          setTimeout(() => requestRefresh({ immediate: true, force: true }), 800)
          setTimeout(() => {
            setCountsUpdating(false)
          }, 1200)
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
          requestRefresh({ immediate: true, force: true })
          setTimeout(() => requestRefresh({ immediate: true, force: true }), 800)
          setTimeout(() => {
            setCountsUpdating(false)
          }, 1200)
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
          // Refresh leads data when ICROP IDs are updated or lost status changes
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [Real-time] Follow-up change detected:', payload.eventType, (payload.new as any)?.lead_uid || (payload.old as any)?.lead_uid)
            console.log('🔄 [Real-time] Old final_status:', (payload.old as any)?.final_status)
            console.log('🔄 [Real-time] New final_status:', (payload.new as any)?.final_status)
            console.log('🔄 [Real-time] Refreshing leads data due to follow-up change')
          }
          
          // Check if this is a lost status change
          const oldStatus = (payload.old as any)?.final_status
          const newStatus = (payload.new as any)?.final_status
          
          if (oldStatus === 'Lost Requested' && newStatus === 'Lost') {
            console.log('🔄 [Real-time] Lost lead approved - refreshing lost requests')
            fetchLostRequests()
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
      
      // NEW: Add tab filter for backend filtering (massive performance boost!)
      if (activeTab && activeTab !== 'all') {
        qs.append('tab', activeTab)
      }
      
      // Aggressive cache-busting to avoid any intermediate caching layers
      const cacheBuster = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      qs.append('_t', cacheBuster)
      qs.append('_r', Math.random().toString(36).substr(2, 9))
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[CRE fetch] requesting /api/cre-assigned with tab=', activeTab, '_t=', cacheBuster)
      }
      const response = await fetch(`/api/cre-assigned?${qs.toString()}`, { 
        headers: { 
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        } 
      })
      
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
            sub_source: l.sub_source || '',
            campaign: l.campaign || '',
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
            // Qualification fields
            model_interested: l.model_interested || '',
            variant: l.variant || '',
            buying_plan: l.buying_plan || '',
            finance_option: l.finance_option || '',
            trade_in: l.trade_in || '',
            trade_in_make: l.trade_in_make || '',
            trade_in_model: l.trade_in_model || '',
            trade_in_year: l.trade_in_year || '',
            trade_in_km: l.trade_in_km || '',
            trade_in_ownership: l.trade_in_ownership || '',
            test_drive: l.test_drive || false,
            test_drive_type: l.test_drive_type || '',
            profession: l.profession || '',
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
            sixth_call_lead_status: l.sixth_call_lead_status || '',
            // Pending reasons for pending leads (multiple attempts)
            pending_reasons: l.pending_reasons || [],
            // Existing remarks for unqualified/lost leads
            existing_remarks: l.existing_remarks || ''
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
      console.log('[Lost Requests] Fetching lost requests...')
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      // Add cache-busting to lost requests
      const cacheBuster = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const response = await fetch(`/api/leads/lost-requests?_t=${cacheBuster}&_r=${Math.random().toString(36).substr(2, 9)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`[Lost Requests] Fetched ${data?.length || 0} lost requests`)
        console.log(`[Lost Requests] Data:`, data)
        setLostRequests(data || [])
      } else {
        console.error('[Lost Requests] Error fetching lost requests:', response.status, response.statusText)
      }
    } catch (e) {
      console.error('[Lost Requests] Failed to fetch lost requests', e)
    }
  }

  const handleUpdateLead = (leadData: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🔄 [UI Sync] Lead update initiated; awaiting consolidated refresh", leadData)
    }
    
    // Rely on events from the modal + debounced refresh
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1200)
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
      sub_source: leadData.sub_source || '',
      campaign: leadData.campaign || '', // Use campaign column directly
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
      console.log(`[Lost Approval] Starting approval process for lead ${leadUid}`)
      
      // Show processing state
      setIsRefreshing(true)
      
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
        const result = await response.json()
        console.log(`[Lost Approval] Success response:`, result)
        alert('Lost status approved successfully!')
        
        // Immediately remove the lead from local state
        setLeads(prev => prev.filter(l => l.uid !== leadUid))
        setLostRequests(prev => prev.filter(r => r.lead_uid !== leadUid))
        
        // Force refresh all data to ensure consistency
        console.log(`[Lost Approval] Refreshing data after approval`)
        
        // Clear any cached data first
        setLeads([])
        setLostRequests([])
        
        // Immediate refresh without delay
        console.log(`[Lost Approval] Immediate refresh attempt`)
        await Promise.all([
          fetchLostRequests(),
          fetchAssignedLeads(true) // Force refresh
        ])
        
        // Wait a moment for database to be updated and refresh again
        await new Promise(resolve => setTimeout(resolve, 300))
        console.log(`[Lost Approval] Second refresh attempt`)
        await Promise.all([
          fetchLostRequests(),
          fetchAssignedLeads(true) // Force refresh
        ])
        
        // Final refresh to ensure consistency
        await new Promise(resolve => setTimeout(resolve, 500))
        console.log(`[Lost Approval] Final refresh attempt`)
        await Promise.all([
          fetchLostRequests(),
          fetchAssignedLeads(true) // Force refresh
        ])
        
        console.log(`[Lost Approval] Data refresh completed for lead ${leadUid}`)
        
        // Dispatch custom event for other components
        try {
          window.dispatchEvent(new CustomEvent('lead-status-changed', { detail: { leadUid, newStatus: 'Lost' } }))
        } catch {}
      } else {
        const errorData = await response.json()
        console.error(`[Lost Approval] Error response:`, errorData)
        alert(`Error: ${errorData.error || 'Failed to approve lost status'}`)
      }
    } catch (error) {
      console.error('[Lost Approval] Error approving lost status:', error)
      alert('Failed to approve lost status')
    } finally {
      // Always reset refreshing state
      setIsRefreshing(false)
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
        await fetchLostRequests()
        await fetchAssignedLeads() // Refresh main leads
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

    const withinFollowUpDateFilter = (lead: any) => {
      if (!lead.follow_up_date) return false
      const followUpDate = lead.follow_up_date.includes('T')
        ? lead.follow_up_date.slice(0,10)
        : lead.follow_up_date
      
      // Use new date range filter if dates are set
      if (startDate) {
        return followUpDate === startDate
      }
      
      // Fallback to old date mode system
      if (dateMode === 'All Time') return true
      // For "Today" filter in followup tab, include overdue leads (<= today)
      if (dateMode === 'Today') return followUpDate <= todayIso
      if (dateMode === 'This Week') return followUpDate >= startOfWeek && followUpDate <= todayIso
      if (dateMode === 'Date Range') {
        return startDate ? followUpDate === startDate : true
      }
      return true
    }

    const isFinalizedWon = (lead: any) => {
      const fs = (lead?.final_status || '').toString().toLowerCase()
      return fs === 'booked' || fs === 'retailed' || fs === 'won' || fs.includes('won')
    }
    
    const isLostOrUnqualified = (lead: any) => {
      const fs = (lead?.final_status || '').toString().toLowerCase()
      const ls = (lead?.lead_status || '').toString().toLowerCase()
      
      // If final_status is Lost, definitely exclude
      if (fs === 'lost' || fs === 'unqualified') return true
      
      // If lead_status is truly unqualified (no follow-up needed), exclude
      return ls === 'lost' || ls === 'not interested' || 
             ls === 'out of territory' || ls === 'duplicate lead' ||
             ls === 'invalid number' || ls === 'wrong number' ||
             ls === 'just enquired' || ls === 'service' || ls === 'insurance' ||
             ls === 'internal' || ls === 'used car' || ls === 'no response' ||
             ls === 'mock call' || ls === 'plan dropped' || ls === 'plan postponed' ||
             ls === 'dsa enq' || ls === 'bh registration' || ls === 'existing enq' ||
             ls === 'did not enquire' || ls === 'lost to co-dealer' ||
             ls === 'lost to competition' || ls === 'low budget' ||
             ls === 'not eligible' || ls === 'job enquiry'
      
      // Note: RNR, Call me back, etc. are NOT excluded - they need follow-up!
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
          // First filter for overdue/due today leads
          const overdueAndDueToday = leads.filter(lead => {
            if (!lead.follow_up_date) return false
            const followUpDate = lead.follow_up_date.includes('T')
              ? lead.follow_up_date.slice(0,10)
              : lead.follow_up_date
            // Include due today or overdue, but exclude won/lost/unqualified leads
            return followUpDate <= today && !isFinalizedWon(lead) && !isLostOrUnqualified(lead)
          })
          
          // Then apply date mode filter
          filteredLeads = overdueAndDueToday.filter(lead => {
            if (!lead.follow_up_date) return false
            const raw = lead.follow_up_date
            const followUpDate = raw.includes('T') ? raw.slice(0,10) : raw
            
            if (dateMode === 'All Time') return true
            if (dateMode === 'Today') return followUpDate <= todayIso // Include overdue
            if (dateMode === 'This Week') return followUpDate >= startOfWeek && followUpDate <= todayIso
            if (dateMode === 'Date Range') {
              return startDate ? followUpDate === startDate : true
            }
            return true
          })
          
          // Sort: Newer follow-up dates first (today at the top), then older overdue
          const getTs = (l: any) => {
            if (!l?.follow_up_date) return 0
            const d = l.follow_up_date.includes('T') ? l.follow_up_date.slice(0,10) : l.follow_up_date
            return d ? new Date(d + 'T00:00:00').getTime() : 0
          }
          filteredLeads.sort((a, b) => getTs(b) - getTs(a))
        }
        break
      case "pending":
        // Pending = final_status Pending AND (first call done OR has pending reasons)
        if (process.env.NODE_ENV === 'development') {
          console.log('Filtering pending leads:', leads.length, 'total leads')
        }
        const pendingCandidates = leads.filter(lead => {
          const fs = (lead?.final_status ?? "").toString().toLowerCase()
          const ls = (lead?.lead_status ?? "").toString().toLowerCase()
          const isLostish = fs === 'lost' || fs === 'lost requested' || ls === 'lost'
          const hasCallOrReason = !!(lead?.first_call_date) || (lead?.pending_reasons && lead.pending_reasons.length > 0)
          return fs === "pending" && hasCallOrReason && !isFinalizedWon(lead) && !isLostish
        })
        if (process.env.NODE_ENV === 'development') {
          console.log('Pending candidates:', pendingCandidates.length, pendingCandidates.map(l => ({ uid: l.uid, lead_status: l.lead_status, final_status: l.final_status, first_call_date: l.first_call_date })))
        }
        filteredLeads = pendingCandidates.filter(withinDateFilter)
        if (pendingCategory !== "all") {
          filteredLeads = filteredLeads.filter(lead => lead.lead_category === pendingCategory)
        }
        break
      case "qualified":
        // Qualified tab: lead_status = Qualified AND final_status = Pending
        if (process.env.NODE_ENV === 'development') {
          console.log('Filtering qualified leads:', leads.length, 'total leads')
        }
        const qualifiedCandidates = leads.filter(lead => {
          const fs = (lead?.final_status ?? "").toString().toLowerCase()
          const ls = (lead?.lead_status ?? "").toString().toLowerCase()
          const isLostish = fs === 'lost' || fs === 'lost requested' || ls === 'lost'
          return (lead?.lead_status === "Qualified") && fs === "pending" && !isFinalizedWon(lead) && !isLostish
        })
        if (process.env.NODE_ENV === 'development') {
          console.log('Qualified candidates:', qualifiedCandidates.length, qualifiedCandidates.map(l => ({ uid: l.uid, lead_status: l.lead_status, final_status: l.final_status })))
        }
        filteredLeads = qualifiedCandidates.filter(withinDateFilter)
        break
      case "wonlost":
        filteredLeads = leads.filter(lead => {
          const fs = (lead?.final_status || '').toString().toLowerCase()
          const isLost = fs === 'lost' || lead?.lead_status === 'Lost'
          const isLostRequested = fs === 'lost requested'
          const isBooked = fs === 'booked'
          const isRetailed = fs === 'retailed'
          const isWon = fs === 'won' || fs.includes('won') || (lead?.lead_status || '').toString().toLowerCase() === 'won'
          return isLost || isLostRequested || isBooked || isRetailed || isWon
        }).filter(withinDateFilter)
        break
      case "lostconfirm":
        // Lost confirmation = leads with lost_status = "Requested" for this CRE
        filteredLeads = lostRequests.map(request => ({
          id: request.lead_uid,
          uid: request.lead_uid,
          customer_name: request.customer_name,
          customer_mobile_number: request.customer_mobile_number,
          source: request.source,
          campaign: request.campaign || '',
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
        ).filter(withinDateFilter)
        break
      default:
        filteredLeads = leads.filter(withinDateFilter)
    }



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

    // Filter by search term (includes status search)
    if (searchTerm) {
      filteredLeads = filteredLeads.filter(lead => {
        const searchLower = searchTerm.toLowerCase()
        
        // Search in basic fields
        const basicMatch = (
          (lead.uid || '').toLowerCase().includes(searchLower) ||
          (lead.customer_name || '').toLowerCase().includes(searchLower) ||
          (lead.customer_mobile_number || '').includes(searchTerm)
        )
        
        // Search in ALL status fields (including all call statuses)
        const statusMatch = (
          (lead.lead_status || '').toLowerCase().includes(searchLower) ||
          (lead.final_status || '').toLowerCase().includes(searchLower) ||
          (lead.second_call_lead_status || '').toLowerCase().includes(searchLower) ||
          (lead.third_call_lead_status || '').toLowerCase().includes(searchLower) ||
          (lead.fourth_call_lead_status || '').toLowerCase().includes(searchLower) ||
          (lead.fifth_call_lead_status || '').toLowerCase().includes(searchLower) ||
          (lead.sixth_call_lead_status || '').toLowerCase().includes(searchLower)
        )
        
        // Search in other relevant fields
        const otherMatch = (
          (lead.source || '').toLowerCase().includes(searchLower) ||
          (lead.campaign || '').toLowerCase().includes(searchLower) ||
          (lead.branch || '').toLowerCase().includes(searchLower) ||
          (lead.icrop_id || '').toLowerCase().includes(searchLower)
        )
        
        return basicMatch || statusMatch || otherMatch
      })
    }

    // Filter by status if not "all" - check ALL call status fields
    if (statusFilter && statusFilter !== "all") {
      filteredLeads = filteredLeads.filter(lead => {
        const statusTrim = statusFilter.trim()
        return (
          (lead.lead_status || '').toString().trim() === statusTrim ||
          (lead.final_status || '').toString().trim() === statusTrim ||
          (lead.second_call_lead_status || '').toString().trim() === statusTrim ||
          (lead.third_call_lead_status || '').toString().trim() === statusTrim ||
          (lead.fourth_call_lead_status || '').toString().trim() === statusTrim ||
          (lead.fifth_call_lead_status || '').toString().trim() === statusTrim ||
          (lead.sixth_call_lead_status || '').toString().trim() === statusTrim
        )
      })
    }

    // Filter by call outcome if status is "Qualified" and call outcome is not "all"
    if (statusFilter === "Qualified" && callOutcomeFilter && callOutcomeFilter !== "all") {
      filteredLeads = filteredLeads.filter(lead => {
        // For qualified leads, check if they have the specific call outcome status
        const leadStatus = (lead.lead_status || '').toString().trim()
        const secondCallStatus = (lead.second_call_lead_status || '').toString().trim()
        const thirdCallStatus = (lead.third_call_lead_status || '').toString().trim()
        const fourthCallStatus = (lead.fourth_call_lead_status || '').toString().trim()
        const fifthCallStatus = (lead.fifth_call_lead_status || '').toString().trim()
        const sixthCallStatus = (lead.sixth_call_lead_status || '').toString().trim()
        
        return leadStatus === callOutcomeFilter ||
               secondCallStatus === callOutcomeFilter ||
               thirdCallStatus === callOutcomeFilter ||
               fourthCallStatus === callOutcomeFilter ||
               fifthCallStatus === callOutcomeFilter ||
               sixthCallStatus === callOutcomeFilter
      })
    }

    // Filter by source if not "all"
    if (sourceFilter && sourceFilter !== "all") {
      filteredLeads = filteredLeads.filter(lead => 
        (lead.source || '').toString().trim() === sourceFilter
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
      return fs === 'booked' || fs === 'retailed' || fs === 'won' || fs.includes('won')
    }
    
    const isLostOrUnqualified = (lead: any) => {
      const fs = (lead?.final_status || '').toString().toLowerCase()
      const ls = (lead?.lead_status || '').toString().toLowerCase()
      
      // If final_status is Lost, definitely exclude
      if (fs === 'lost' || fs === 'unqualified') return true
      
      // If lead_status is truly unqualified (no follow-up needed), exclude
      return ls === 'lost' || ls === 'not interested' || 
             ls === 'out of territory' || ls === 'duplicate lead' ||
             ls === 'invalid number' || ls === 'wrong number' ||
             ls === 'just enquired' || ls === 'service' || ls === 'insurance' ||
             ls === 'internal' || ls === 'used car' || ls === 'no response' ||
             ls === 'mock call' || ls === 'plan dropped' || ls === 'plan postponed' ||
             ls === 'dsa enq' || ls === 'bh registration' || ls === 'existing enq' ||
             ls === 'did not enquire' || ls === 'lost to co-dealer' ||
             ls === 'lost to competition' || ls === 'low budget' ||
             ls === 'not eligible' || ls === 'job enquiry'
      
      // Note: RNR, Call me back, etc. are NOT excluded - they need follow-up!
    }
    
    // Define call outcome statuses
    const calledSet = new Set(["rnr","dnd","not reachable","switched off","busy","disconnecting the call","temporary out of service","incoming call facility not available","out of network","plan postponed","interested"])
    
    // Calculate individual components
    const untouched = leads.filter(l => {
      const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
      const finalStatus = (l?.final_status ?? "").toString().toLowerCase()
      return (leadStatus === "" || leadStatus === "pending") && finalStatus === "pending" && !isFinalizedWon(l)
    }).length
    
    const called = leads.filter(l => {
      const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
      return calledSet.has(leadStatus) && !isFinalizedWon(l)
    }).length
    
    const followUp = leads.filter(l => {
      const leadStatus = (l?.lead_status ?? "").toString().toLowerCase()
      return leadStatus === "call me back" && !isFinalizedWon(l)
    }).length
    
    // Fresh leads = untouched + called + followup (as requested)
    const fresh = untouched + called + followUp
    
    return {
      fresh,
      followup: leads.filter(lead => {
        if (!lead.follow_up_date) return false
        const followUpDate = lead.follow_up_date.includes('T') 
          ? lead.follow_up_date.slice(0,10) 
          : lead.follow_up_date
        return followUpDate <= today && !isFinalizedWon(lead) && !isLostOrUnqualified(lead)
      }).length,
      // Pending = final_status Pending AND (first call done OR has pending reasons)
      pending: leads.filter(lead => 
        ((lead?.final_status ?? "").toString().toLowerCase() === "pending") && 
        (!!(lead?.first_call_date) || (lead?.pending_reasons && lead.pending_reasons.length > 0)) && 
        !isFinalizedWon(lead)
      ).length,
      // Qualified = lead_status Qualified AND final_status Pending
      qualified: leads.filter(lead => (lead?.lead_status === "Qualified") && ((lead?.final_status ?? "").toString().toLowerCase() === "pending") && !isFinalizedWon(lead)).length,
      wonlost: leads.filter(lead => {
        const fs = (lead?.final_status || '').toString().toLowerCase()
        const ls = (lead?.lead_status || '').toString().toLowerCase()
        const isLost = fs === 'lost' || ls === 'lost'
        const isLostRequested = fs === 'lost requested'
        const isBooked = fs === 'booked'
        const isRetailed = fs === 'retailed'
        const isWon = fs === 'won' || fs.includes('won') || ls === 'won'
        return isLost || isLostRequested || isBooked || isRetailed || isWon
      }).length,
      // Fixed: Won leads should show final_status = 'booked', 'retailed', or 'won'
      won: leads.filter(lead => {
        const fs = (lead?.final_status || '').toString().toLowerCase()
        const ls = (lead?.lead_status || '').toString().toLowerCase()
        return fs === 'booked' || fs === 'retailed' || fs === 'won' || fs.includes('won') || ls === 'won'
      }).length,
      // Fixed: Lost leads should show final_status = 'lost' (not lead_status)
      lost: leads.filter(lead => {
        const fs = (lead?.final_status || '').toString().toLowerCase()
        return fs === 'lost'
      }).length,
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
      let result = getFilteredLeads()
      if (activeTab === 'wonlost') {
        if (wonLostSubTab === 'won') {
          result = result.filter(l => {
            const fs = (l?.final_status || '').toString().toLowerCase()
            const ls = (l?.lead_status || '').toString().toLowerCase()
            return fs === 'booked' || fs === 'retailed' || fs === 'won' || fs.includes('won') || ls === 'won'
          })
        } else if (wonLostSubTab === 'lost') {
          result = result.filter(l => (l?.final_status || '').toString().toLowerCase() === 'lost')
        }
      } else if (activeTab === 'followup' && followupSubTab !== 'all') {
        const todayIso = new Date().toISOString().slice(0,10)
        result = result.filter(l => {
          const f = (l?.follow_up_date || '').toString()
          const d = f.includes('T') ? f.slice(0,10) : f
          if (!d) return false
          if (followupSubTab === 'today') return d === todayIso
          if (followupSubTab === 'overdue') return d < todayIso
          return true
        })
      }
      return result
    } catch (error) {
      console.error('Error in filteredLeads useMemo:', error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Dependencies:', { leads: leads.length, activeTab, activeStatus, searchTerm, pendingCategory, startDate })
      }
      return []
    }
  }, [leads, activeTab, activeStatus, searchTerm, pendingCategory, startDate, statusFilter, callOutcomeFilter, sourceFilter, wonLostSubTab, followupSubTab])
  
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

  // Dynamic statuses for Qualified and Pending tab filters (from lead_master)
  const [globalStatuses, setGlobalStatuses] = useState<string[]>([])
  const [loadingGlobalStatuses, setLoadingGlobalStatuses] = useState<boolean>(false)

  useEffect(() => {
    const loadStatusesOnce = async () => {
      // Load when Qualified/Pending tabs are active
      if (!['qualified', 'pending'].includes(activeTab)) return
      try {
        setLoadingGlobalStatuses(true)
        // First call: distinct statuses from lead_master (includes ALL call statuses)
        const resp1 = await fetch(`/api/leads/distinct?_t=${Date.now()}`)
        const data1 = resp1.ok ? await resp1.json() : { status: [] }
        const baseStatuses: string[] = Array.isArray(data1?.status) ? data1.status : []

        // Second call: dynamic detection (superset, merged)
        const resp2 = await fetch(`/api/analytics/dynamic-status?period=all&_t=${Date.now()}`)
        const data2 = resp2.ok ? await resp2.json() : { statusAnalysis: {} }
        const dynamicLeadStatuses: string[] = Array.isArray(data2?.statusAnalysis?.leadStatuses) ? data2.statusAnalysis.leadStatuses : []
        const dynamicFinalStatuses: string[] = Array.isArray(data2?.statusAnalysis?.finalStatuses) ? data2.statusAnalysis.finalStatuses : []

        const merged = Array.from(new Set([
          ...baseStatuses,
          ...dynamicLeadStatuses,
          ...dynamicFinalStatuses
        ].map((s: any) => (s ?? '').toString().trim()).filter(Boolean)))

        setGlobalStatuses(merged.sort())
      } catch (e) {
        console.error('Failed to load global statuses', e)
      } finally {
        setLoadingGlobalStatuses(false)
      }
    }
    loadStatusesOnce()
  }, [activeTab])

  // Get available statuses for current tab (tab-specific)
  const getAvailableStatuses = () => {
    try {
      if (!leads || leads.length === 0) return []
      // For Qualified/Pending tabs, prefer preloaded dynamic statuses list
      if ((activeTab === 'qualified' || activeTab === 'pending') && globalStatuses.length > 0) {
        return globalStatuses
      }
      
      const statusSet = new Set<string>()
      
      // Get the actual filtered leads for the current tab/view
      const currentFilteredLeads = getFilteredLeads()
      
      // Only show statuses that exist in the currently filtered leads
      currentFilteredLeads.forEach(lead => {
        const status = lead?.lead_status || ''
        const finalStatus = lead?.final_status || ''
        
        // Add non-empty statuses
        if (status && status.trim()) {
          statusSet.add(status.trim())
        }
        if (finalStatus && finalStatus.trim()) {
          statusSet.add(finalStatus.trim())
        }
      })
      
      // Convert to array and sort
      return Array.from(statusSet).sort()
    } catch (error) {
      console.error('Error getting available statuses:', error)
      return []
    }
  }

  const availableStatuses = useMemo(() => getAvailableStatuses(), [leads, activeTab, activeStatus, globalStatuses])

  // Get available call outcomes for qualified leads
  const getAvailableCallOutcomes = () => {
    try {
      if (!leads || leads.length === 0) return []
      
      const outcomeSet = new Set<string>()
      
      // Get call outcomes from leads that are in the qualified tab
      const currentFilteredLeads = getFilteredLeads()
      
      currentFilteredLeads.forEach(lead => {
        // Check all follow-up call status fields for outcomes (excluding the base lead_status)
        const followupStatusFields = [
          lead?.second_call_lead_status,
          lead?.third_call_lead_status,
          lead?.fourth_call_lead_status,
          lead?.fifth_call_lead_status,
          lead?.sixth_call_lead_status
        ]
        
        followupStatusFields.forEach(status => {
          if (status && status.trim() && status.trim().toLowerCase() !== "qualified") {
            outcomeSet.add(status.trim())
          }
        })
      })
      
      // Convert to array and sort
      return Array.from(outcomeSet).sort()
    } catch (error) {
      console.error('Error getting available call outcomes:', error)
      return []
    }
  }

  const availableCallOutcomes = useMemo(() => getAvailableCallOutcomes(), [leads, activeTab, activeStatus])

  // Get available sources for current filtered leads
  const getAvailableSources = () => {
    try {
      if (!leads || leads.length === 0) return []
      
      const sourceSet = new Set<string>()
      
      // Get the actual filtered leads for the current tab/view
      const currentFilteredLeads = getFilteredLeads()
      
      // Only show sources that exist in the currently filtered leads
      currentFilteredLeads.forEach(lead => {
        const source = lead?.source || ''
        
        // Add non-empty sources
        if (source && source.trim()) {
          sourceSet.add(source.trim())
        }
      })
      
      // Convert to array and sort
      return Array.from(sourceSet).sort()
    } catch (error) {
      console.error('Error getting available sources:', error)
      return []
    }
  }

  const availableSources = useMemo(() => getAvailableSources(), [leads, activeTab, activeStatus])

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
                requestRefresh({ immediate: true })
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
              onClick={() => {
                setActiveTab("lostconfirm")
                // Refresh lost requests when tab is clicked
                fetchLostRequests()
              }}
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
                      onChange={(e) => {
                        setDateMode(e.target.value as any)
                        // Auto-refresh when date filter changes
                        setTimeout(() => fetchAssignedLeads(), 100)
                      }}
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
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        // Auto-refresh when date changes
                        setTimeout(() => fetchAssignedLeads(), 100)
                      }}
                      className="w-full sm:w-64 px-3 py-2 rounded-2xl border border-gray-200 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all duration-150 text-sm md:text-base"
                      placeholder="Select Date"
                      aria-label="Select specific date"
                    />
                  )}
                  
                  {/* Status Filter - beside date filter */}
                  {availableStatuses.length > 0 && (
                    <div className="relative overflow-hidden rounded-2xl backdrop-blur-[6px]">
                      {/* Apple Magnus glassy effect layers */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-green-300/25"></div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                      <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                      
                      <Filter className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 z-10" />
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="relative w-full sm:w-48 pl-10 pr-3 py-2 rounded-2xl border border-green-200/30 bg-white/90 focus:ring-2 focus:ring-green-100 focus:border-green-300 transition-all duration-150 text-sm md:text-base z-10">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          {availableStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Call Outcome Filter - appears when Qualified is selected */}
                  {statusFilter === "Qualified" && availableCallOutcomes.length > 0 && (
                    <div className="relative overflow-hidden rounded-2xl backdrop-blur-[6px]">
                      {/* Apple Magnus glassy effect layers */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                      <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                      
                      <Phone className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 z-10" />
                      <Select value={callOutcomeFilter} onValueChange={setCallOutcomeFilter}>
                        <SelectTrigger className="relative w-full sm:w-48 pl-10 pr-3 py-2 rounded-2xl border border-blue-200/30 bg-white/90 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all duration-150 text-sm md:text-base z-10">
                          <SelectValue placeholder="All Call Outcomes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Call Outcomes</SelectItem>
                          {availableCallOutcomes.map((outcome) => (
                            <SelectItem key={outcome} value={outcome}>
                              {outcome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Source Filter */}
                  {availableSources.length > 0 && (
                    <div className="relative overflow-hidden rounded-2xl backdrop-blur-[6px]">
                      {/* Apple Magnus glassy effect layers */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-orange-300/25"></div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                      <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                      
                      <Globe className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500 z-10" />
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="relative w-full sm:w-48 pl-10 pr-3 py-2 rounded-2xl border border-orange-200/30 bg-white/90 focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all duration-150 text-sm md:text-base z-10">
                          <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          {availableSources.map((source) => (
                            <SelectItem key={source} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="relative overflow-hidden rounded-2xl backdrop-blur-[6px]">
                    {/* Apple Magnus glassy effect layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-300/25"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 z-10" />
                    <input 
                      type="text"
                      placeholder="Search by UID, name, status, source..." 
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
                        onClick={() => {
                          setPendingCategory(cat)
                          // Auto-refresh when category filter changes
                          setTimeout(() => fetchAssignedLeads(), 100)
                        }}
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
                <div className="flex items-center gap-2">
                  <button
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      wonLostSubTab === 'all'
                        ? 'bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setWonLostSubTab('all')}
                    aria-label="View all"
                  >
                    All
                  </button>
                  <button
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      wonLostSubTab === 'won'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setWonLostSubTab('won')}
                    aria-label="View won"
                  >
                    Won
                  </button>
                  <button
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      wonLostSubTab === 'lost'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setWonLostSubTab('lost')}
                    aria-label="View lost"
                  >
                    Lost
                  </button>
                </div>
              )}

              {activeTab === "followup" && (
                <div className="flex items-center gap-2">
                  <button
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      followupSubTab === 'all'
                        ? 'bg-gray-100 text-gray-800 border-gray-300'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setFollowupSubTab('all')}
                  >
                    All
                  </button>
                  <button
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      followupSubTab === 'today'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setFollowupSubTab('today')}
                  >
                    Today
                  </button>
                  <button
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      followupSubTab === 'overdue'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setFollowupSubTab('overdue')}
                  >
                    Overdue
                  </button>
                </div>
              )}

              {/* Subtle Refreshing Indicator */}
              {isRefreshing && (
                <div className="mb-2 flex items-center justify-center text-sm text-blue-600 bg-blue-50 py-2 px-4 rounded-2xl">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Syncing data...
                </div>
              )}

              {/* Leads Table - Optimized with Backend Filtering */}
              <div className="overflow-auto rounded-2xl max-h-[calc(100vh-300px)]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
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
                        <tr 
                          key={lead.id} 
                          className={`border-b transition-colors duration-200 ${rowColorClass}`}
                        >
                          <td className="p-3">
                            <div className="flex gap-2">
                              {activeTab === 'wonlost' ? (
                                <>
                                  <Badge
                                    variant="outline"
                                    className={`rounded-full ${
                                      ((lead?.final_status || '').toString().toLowerCase() === 'booked' || 
                                       (lead?.final_status || '').toString().toLowerCase() === 'retailed' ||
                                       (lead?.final_status || '').toString().toLowerCase() === 'won' ||
                                       (lead?.final_status || '').toString().toLowerCase().includes('won') ||
                                       (lead?.lead_status || '').toString().toLowerCase() === 'won')
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : (lead?.final_status || '').toString().toLowerCase() === 'lost'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {(lead?.final_status || lead?.lead_status || '—')}
                                  </Badge>
                                </>
                              ) : activeTab === "lostconfirm" ? (
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
                          <td className="p-3 text-gray-800">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{lead.source}</span>
                              {lead.sub_source && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {lead.sub_source}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {lead.campaign ? (
                              <span className="text-gray-800">{lead.campaign}</span>
                            ) : (
                              <Badge variant="outline" className="rounded-full bg-gray-100 text-gray-600">
                                No Campaign
                              </Badge>
                            )}
                          </td>
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
