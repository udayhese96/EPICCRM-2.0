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
  User
} from "lucide-react"
import { useState, useEffect, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { LeadUpdateModal } from "./components/lead-update-modal"
import { AddLeadModal } from "./components/add-lead-modal"

interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  name?: string
  role: string
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
  branch?: string
  ps_name?: string
  ps_id?: string
  icrop_id?: string
}

export default function CREDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [activeTab, setActiveTab] = useState<string>("fresh")
  const [activeStatus, setActiveStatus] = useState<string>("Fresh")
  const [searchTerm, setSearchTerm] = useState("")
  const [pendingCategory, setPendingCategory] = useState<"all" | "Hot" | "Warm" | "Cold">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateMode, setDateMode] = useState<"All Time" | "Today" | "This Week" | "Date Range">("All Time")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [wonLostFilter, setWonLostFilter] = useState<"all" | "Booked" | "Retailed" | "Lost">("all")
  const [showRangePicker, setShowRangePicker] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [redisWorkerStatus, setRedisWorkerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const [countsUpdating, setCountsUpdating] = useState(false)

  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      setUser(JSON.parse(supabaseUser))
    }
    fetchAssignedLeads()
    checkRedisWorkerStatus()
    
    // Set up real-time subscriptions instead of polling
    const cleanup = setupRealtimeSubscriptions()
    
    // Primary polling system (more reliable than real-time)
    const primaryPolling = setInterval(() => {
      if (!isLoading && !isRefreshing) {
        console.log('🔄 [Primary] Automatic refresh...')
        fetchAssignedLeads()
      }
    }, 3000) // 3 seconds - even more aggressive polling
    
    // Secondary polling for count updates
    const countPolling = setInterval(() => {
      if (!isLoading && !isRefreshing) {
        console.log('📊 [Count] Checking for count updates...')
        fetchAssignedLeads()
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
      // Cleanup polling intervals
      clearInterval(primaryPolling)
      clearInterval(countPolling)
      clearInterval(workerStatusCheck)
    }
  }, [user?.username])

  const setupRealtimeSubscriptions = () => {
    // Only setup if we have a user
    if (!user?.username) {
      console.log('⚠️ [Real-time] No user found, skipping real-time setup')
      return () => {}
    }
    
    console.log('🔌 [Real-time] Setting up Supabase real-time subscriptions for user:', user.username)
    
    try {
      const supabase = createClient()
      console.log('✅ [Real-time] Supabase client created successfully')
    
    // Subscribe to lead_master changes for this CRE user
    console.log('🔌 [Real-time] Setting up lead_master subscription with filter: cre_name=eq.' + user.username)
    const leadSubscription = supabase
      .channel(`lead_master_changes_${user.username}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'lead_master',
          filter: `cre_name=eq.${user.username}`
        }, 
        (payload) => {
          console.log('🔄 [Real-time] Lead master change detected:', payload.eventType, payload.new || payload.old)
          
          // Check if this affects pending/qualified counts
          const newRecord = payload.new as any
          const oldRecord = payload.old as any
          
          if (newRecord) {
            const affectsPending = newRecord?.final_status === 'pending' && newRecord?.first_call_date
            const affectsQualified = newRecord?.lead_status === 'Qualified' && newRecord?.final_status === 'pending'
            
            if (affectsPending || affectsQualified) {
              console.log('📊 [Real-time] Count-affecting change detected - refreshing data immediately')
              setCountsUpdating(true)
              setTimeout(() => {
                if (!isLoading && !isRefreshing) {
                  fetchAssignedLeads()
                  setTimeout(() => setCountsUpdating(false), 1000)
                }
              }, 500) // Faster refresh for count-affecting changes
            } else {
              // Regular refresh for other changes
              setTimeout(() => {
                if (!isLoading && !isRefreshing) {
                  fetchAssignedLeads()
                }
              }, 1000)
            }
          } else {
            // For deletions, always refresh
            setTimeout(() => {
              if (!isLoading && !isRefreshing) {
                fetchAssignedLeads()
              }
            }, 500)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [Real-time] Lead master subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Real-time] Lead master subscription active')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Real-time] Lead master subscription error')
        }
      })
    
    // Subscribe to qualified_leads changes for this CRE user
    const qualifiedSubscription = supabase
      .channel(`qualified_leads_changes_${user.username}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'qualified_leads',
          filter: `cre_name=eq.${user.username}`
        }, 
        (payload) => {
          console.log('🔄 [Real-time] Qualified leads change detected:', payload.eventType, payload.new || payload.old)
          
          // Qualified leads changes always affect counts, so refresh immediately
          console.log('📊 [Real-time] Qualified leads change - refreshing counts immediately')
          setCountsUpdating(true)
          setTimeout(() => {
            if (!isLoading && !isRefreshing) {
              fetchAssignedLeads()
              setTimeout(() => setCountsUpdating(false), 1000)
            }
          }, 500) // Fast refresh for qualified leads changes
        }
      )
      .subscribe((status) => {
        console.log('📡 [Real-time] Qualified leads subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Real-time] Qualified leads subscription active')
        } else if (status === 'CHANNEL_ERROR') {
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
          console.log('🔄 [Real-time] Follow-up master change detected:', payload.eventType)
          // Refresh leads data when ICROP IDs are updated
          setTimeout(() => {
            if (!isLoading && !isRefreshing) {
              fetchAssignedLeads()
            }
          }, 1000)
        }
      )
      .subscribe((status) => {
        console.log('📡 [Real-time] Follow-up subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Real-time] Follow-up subscription active')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Real-time] Follow-up subscription error')
        }
      })
    
    console.log('✅ [Real-time] All subscriptions established')
    setRealtimeStatus('connected')
    
    // Return cleanup function
    return () => {
      console.log('🔌 [Real-time] Cleaning up subscriptions...')
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
          console.log('🔄 [Fallback] Polling for updates...')
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
        console.log('🔍 [Redis Worker] Queue stats:', stats)
        
        const wasConnected = redisWorkerStatus === 'connected'
        const isConnected = stats.redis_connected && stats.queues?.lead_queue?.status === 'active'
        
        if (isConnected) {
          console.log('✅ [Redis Worker] Redis connected and lead queue active!')
          setRedisWorkerStatus('connected')
          
          // If worker just came online, refresh data
          if (!wasConnected) {
            console.log('🔄 [Worker] Worker just came online - refreshing data')
            setTimeout(() => {
              if (!isLoading && !isRefreshing) {
                fetchAssignedLeads()
              }
            }, 1000)
          }
        } else {
          console.log('⚠️ [Redis Worker] Redis connected but queues inactive')
          setRedisWorkerStatus('disconnected')
        }
      } else {
        console.log('❌ [Redis Worker] Failed to get queue stats')
        setRedisWorkerStatus('disconnected')
      }
    } catch (error) {
      console.log('⚠️ [Redis Worker] Status check failed:', error)
      setRedisWorkerStatus('disconnected')
    }
  }

  const fetchAssignedLeads = async () => {
    setIsLoading(true)
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const username = parsed?.username || ''
      const fullName = parsed?.full_name || parsed?.name || ''
      const qs = new URLSearchParams({ username })
      if (fullName) qs.append('name', fullName)
      
      console.log('📊 [CRE Dashboard] Fetching leads for:', { username, fullName })
      console.log('📊 [CRE Dashboard] Query string:', qs.toString())
      console.log('📊 [CRE Dashboard] Full URL:', `/api/cre-assigned?${qs.toString()}`)
      console.log('⚡ [Redis Worker] All lead operations will use background processing for ultra-fast UI!')
      const response = await fetch(`/api/cre-assigned?${qs.toString()}`, { headers: { 'Cache-Control': 'no-store' } })
      
      if (response.ok) {
        const data = await response.json()
        console.log('API Response:', data)
        console.log('Sample lead data:', data[0]) // Debug: log first lead
        
        // DEBUG: Check for LD000529 specifically
        const targetLead = data.find((l: any) => l.uid === 'LD000529')
        if (targetLead) {
          console.log('🎯 [DEBUG] Found target lead LD000529 in API response:')
          console.log('   - UID:', targetLead.uid)
          console.log('   - Customer:', targetLead.customer_name)
          console.log('   - Raw icrop_id:', targetLead.icrop_id)
          console.log('   - icrop_id type:', typeof targetLead.icrop_id)
          console.log('   - All keys:', Object.keys(targetLead))
        } else {
          console.log('❌ [DEBUG] Target lead LD000529 NOT found in API response')
          console.log('   - Available UIDs:', data.map((l: any) => l.uid))
        }
        
        // Map API lead_master fields to UI fields
        const mapped = (data || []).map((l: any) => ({
          id: l.id || l.uid,
          uid: l.uid,
          customer_name: l.customer_name,
          customer_mobile_number: l.customer_mobile_number,
          source: l.source,
          campaign: l.sub_source || l.model_interested || '',
          date: (l.created_at || '').slice(0,10),
          lead_status: (l.lead_status || '').trim(),
          final_status: (l.final_status || '').trim(),
          lead_category: l.lead_category || 'Warm',
          followup_count: l.followup_count || 0,
          follow_up_date: l.follow_up_date,
          first_call_date: l.first_call_date || l.first_call_done_date,
          branch: l.branch,
          ps_name: l.ps_name,
          ps_id: l.ps_id,
          icrop_id: l.icrop_id, // Add ICROP ID mapping
          lead_remark: l.first_remark || l.lead_remark || l.pending_reason || '',
          pending_reason: l.pending_reason || '',
          // Previous call history
          second_call_date: l.second_call_date,
          second_remark: l.second_remark,
          third_call_date: l.third_call_date,
          third_remark: l.third_remark,
          fourth_call_date: l.fourth_call_date,
          fourth_remark: l.fourth_remark,
          fifth_call_date: l.fifth_call_date,
          fifth_remark: l.fifth_remark
        }))
        
        // DEBUG: Check mapped data for LD000529
        const mappedTargetLead = mapped.find((l: any) => l.uid === 'LD000529')
        if (mappedTargetLead) {
          console.log('🎯 [DEBUG] Mapped target lead LD000529:')
          console.log('   - UID:', mappedTargetLead.uid)
          console.log('   - Customer:', mappedTargetLead.customer_name)
          console.log('   - Mapped icrop_id:', mappedTargetLead.icrop_id)
          console.log('   - Mapped icrop_id type:', typeof mappedTargetLead.icrop_id)
        } else {
          console.log('❌ [DEBUG] Target lead LD000529 NOT found in mapped data')
        }
        
        console.log('Mapped leads:', mapped)
        console.log('Sample lead data:', mapped[0])
        setLeads(mapped)
      } else {
        console.error('API Error:', response.status, response.statusText)
      }
    } catch (e) {
      console.error('Failed to fetch assigned leads', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateLead = (leadData: any) => {
    console.log("Updating lead:", leadData)
    
    // ⚡ OPTIMISTIC UI UPDATE - Remove lead immediately for better UX
    const shouldRemoveFromUI = leadData.status === 'qualified' || 
                              (activeTab === "fresh" && activeStatus === "Fresh") // Remove any updated fresh lead
    
    if (shouldRemoveFromUI) {
      console.log('🚀 [Optimistic] Lead updated - removing from current list instantly!')
      
      // Remove the lead from current leads list immediately
      setLeads(prevLeads => {
        const leadUid = leadData.uid || leadData.leadId // Use uid if available, fallback to leadId
        const updatedLeads = prevLeads.filter(lead => lead.uid !== leadUid)
        console.log(`✅ [Optimistic] Removed lead ${leadUid} from list. Count: ${prevLeads.length} → ${updatedLeads.length}`)
        return updatedLeads
      })
      
      // Update counts optimistically (counts will update automatically via useMemo)
      console.log('📊 [Optimistic] Counts will update automatically via useMemo')
    } else {
      // For other updates (like follow-ups in pending section), just refresh normally
      fetchAssignedLeads()
      
      // Also schedule a refresh after background processing completes
      setTimeout(() => {
        console.log('🔄 [Post-Update] Refreshing data after background processing')
        fetchAssignedLeads()
      }, 3000) // Wait 3 seconds for background worker to complete
      
      // Additional count-specific refresh
      setTimeout(() => {
        console.log('📊 [Count-Update] Force refreshing counts after qualification')
        fetchAssignedLeads()
      }, 6000) // Wait 6 seconds for counts to update
    }
    
    // Show a subtle success indicator - real-time updates will handle the rest
    if (shouldRemoveFromUI) {
      // For leads being removed from UI (qualifications, fresh updates), show brief success
      setIsRefreshing(true)
      setTimeout(() => setIsRefreshing(false), 1000) // Hide after 1 second
      console.log('✅ [Optimistic] Lead removed from UI - real-time updates will sync counts')
    } else {
      // For leads staying in UI (follow-ups), show brief success
      setIsRefreshing(true)
      setTimeout(() => setIsRefreshing(false), 1000) // Hide after 1 second
      console.log('✅ [Optimistic] Lead updated - real-time updates will sync data')
    }

    // Removed automatic navigation - user stays on current tab
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
      campaign: leadData.campaign || '',
      date: leadData.created_at?.slice(0,10) || new Date().toISOString().slice(0,10),
      lead_status: leadData.lead_status,
      final_status: leadData.final_status,
      lead_category: leadData.lead_category || 'Warm',
      followup_count: 0,
      follow_up_date: leadData.follow_up_date,
      lead_remark: leadData.remarks || ''
    }
    setLeads(prevLeads => [newLead, ...prevLeads])
  }

  // Filter leads based on active tab and status
  const getFilteredLeads = () => {
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
      if (startDate || endDate) {
        if (startDate && !endDate) return created >= startDate
        if (!startDate && endDate) return created <= endDate
        if (startDate && endDate) return created >= startDate && created <= endDate
      }
      
      // Fallback to old date mode system
      if (dateMode === 'All Time') return true
      if (dateMode === 'Today') return created === todayIso
      if (dateMode === 'This Week') return created >= startOfWeek && created <= todayIso
      if (dateMode === 'Date Range') {
        if (!dateFrom && !dateTo) return true
        if (dateFrom && !dateTo) return created >= dateFrom
        if (!dateFrom && dateTo) return created <= dateTo
        return created >= dateFrom && created <= dateTo
      }
      return true
    }

    const isFinalizedWon = (lead: any) => {
      const fs = (lead.final_status || '').toLowerCase()
      return fs === 'booked' || fs === 'retailed'
    }

    // Filter by tab
    switch (activeTab) {
      case "fresh":
        // Fresh view base is all leads; sub-filters below handle subsets
        filteredLeads = leads.filter(l => !isFinalizedWon(l))
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
        console.log('Filtering pending leads:', leads.length, 'total leads')
        const pendingCandidates = leads.filter(lead => ((lead.final_status ?? "").toLowerCase() === "pending") && !!(lead.first_call_date) && !isFinalizedWon(lead))
        console.log('Pending candidates:', pendingCandidates.length, pendingCandidates.map(l => ({ uid: l.uid, lead_status: l.lead_status, final_status: l.final_status, first_call_date: l.first_call_date })))
        filteredLeads = pendingCandidates
        if (pendingCategory !== "all") {
          filteredLeads = filteredLeads.filter(lead => lead.lead_category === pendingCategory)
        }
        break
      case "qualified":
        // Qualified tab: lead_status = Qualified AND final_status = Pending
        console.log('Filtering qualified leads:', leads.length, 'total leads')
        const qualifiedCandidates = leads.filter(lead => (lead.lead_status === "Qualified") && ((lead.final_status ?? "").toLowerCase() === "pending") && !isFinalizedWon(lead))
        console.log('Qualified candidates:', qualifiedCandidates.length, qualifiedCandidates.map(l => ({ uid: l.uid, lead_status: l.lead_status, final_status: l.final_status })))
        filteredLeads = qualifiedCandidates
        break
      case "wonlost":
        filteredLeads = leads.filter(lead => {
          const isLost = lead.lead_status === 'Lost'
          const isBooked = (lead.final_status || '').toLowerCase() === 'booked'
          const isRetailed = (lead.final_status || '').toLowerCase() === 'retailed'
          let ok = isLost || isBooked || isRetailed
          if (!ok) return false
          if (wonLostFilter === 'Booked') return isBooked
          if (wonLostFilter === 'Retailed') return isRetailed
          if (wonLostFilter === 'Lost') return isLost
          return true
        })
        break
      case "lostconfirm":
        filteredLeads = []
        break
      case "walkin":
        filteredLeads = []
        break
      default:
        filteredLeads = leads
    }

    filteredLeads = filteredLeads.filter(withinDateFilter)

    // Filter by status within tab using business rules
    if (activeTab === "fresh") {
      if (activeStatus === "Fresh") {
        // Untouched: lead_status is null/empty AND final_status is Pending
        filteredLeads = filteredLeads.filter(lead => (lead.lead_status ?? "") === "" && (lead.final_status ?? "").toLowerCase() === "pending")
      } else if (activeStatus === "Called") {
        // Called: any of the non-CMB call outcomes
        const calledSet = new Set(["rnr","dnd","not reachable","switched off","busy","disconnecting the call","temporary out of service"]) 
        filteredLeads = filteredLeads.filter(lead => calledSet.has((lead.lead_status ?? "").toLowerCase()))
      } else if (activeStatus === "Follow Up") {
        // Follow Up: explicit 'Call me back'
        filteredLeads = filteredLeads.filter(lead => (lead.lead_status ?? "").toLowerCase() === "call me back")
      } else {
        // Fallback to equality for any other status values
        filteredLeads = filteredLeads.filter(lead => lead.lead_status === activeStatus)
      }
    }

    // Filter by search term
    if (searchTerm) {
      filteredLeads = filteredLeads.filter(lead => 
        lead.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_mobile_number.includes(searchTerm)
      )
    }

    return filteredLeads
  }

  const getTabCounts = () => {
    const today = new Date().toISOString().slice(0,10)
    const isFinalizedWon = (l: Lead) => {
      const fs = (l.final_status || '').toLowerCase()
      return fs === 'booked' || fs === 'retailed'
    }
    const isUntouched = (l: Lead) => (l.lead_status ?? "") === "" && (l.final_status ?? "").toLowerCase() === "pending"
    const isCalled = (l: Lead) => {
      const s = (l.lead_status ?? "").toLowerCase()
      return ["rnr","dnd","not reachable","switched off","busy","disconnecting the call","temporary out of service"].includes(s)
    }
    const isFollowUp = (l: Lead) => (l.lead_status ?? "").toLowerCase() === "call me back"
    return {
      fresh: leads.filter(l => (isUntouched(l) || isCalled(l) || isFollowUp(l)) && !isFinalizedWon(l)).length,
      followup: leads.filter(lead => {
        if (!lead.follow_up_date) return false
        const followUpDate = lead.follow_up_date.includes('T') 
          ? lead.follow_up_date.slice(0,10) 
          : lead.follow_up_date
        return followUpDate <= today && !isFinalizedWon(lead)
      }).length,
      // Pending = final_status Pending AND first call done
      pending: leads.filter(lead => ((lead.final_status ?? "").toLowerCase() === "pending") && !!(lead.first_call_date) && !isFinalizedWon(lead)).length,
      // Qualified = lead_status Qualified AND final_status Pending
      qualified: leads.filter(lead => (lead.lead_status === "Qualified") && ((lead.final_status ?? "").toLowerCase() === "pending") && !isFinalizedWon(lead)).length,
      wonlost: leads.filter(lead => {
        const isLost = lead.lead_status === 'Lost'
        const fs = (lead.final_status || '').toLowerCase()
        return isLost || fs === 'booked' || fs === 'retailed'
      }).length,
      won: leads.filter(lead => {
        const fs = (lead.final_status || '').toLowerCase()
        return fs === 'booked' || fs === 'retailed'
      }).length,
      lost: leads.filter(lead => lead.lead_status === 'Lost').length,
      lostconfirm: 0,
      walkin: 0
    }
  }

  const getStatusCounts = () => {
    const freshLeadsUntouched = leads.filter(l => (l.lead_status ?? "") === "" && (l.final_status ?? "").toLowerCase() === "pending")
    const calledSet = new Set(["rnr","dnd","not reachable","switched off","busy","disconnecting the call","temporary out of service"]) 
    const freshLeadsCalled = leads.filter(l => calledSet.has((l.lead_status ?? "").toLowerCase()))
    const freshLeadsFollowUp = leads.filter(l => (l.lead_status ?? "").toLowerCase() === "call me back")
    return {
      untouched: freshLeadsUntouched.length,
      called: freshLeadsCalled.length,
      followup: freshLeadsFollowUp.length
    }
  }

  const userName = user?.first_name || user?.name || user?.username || "Kumari"
  
  const filteredLeads = useMemo(() => {
    return getFilteredLeads()
  }, [leads, activeTab, activeStatus, searchTerm, pendingCategory, startDate, endDate])
  
  const tabCounts = useMemo(() => getTabCounts(), [leads])
  const statusCounts = useMemo(() => getStatusCounts(), [leads])

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <User className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>CRE Dashboard</h1>
                <p className="text-gray-600" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>Welcome back, {userName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
            {/* Count Refresh Indicator */}
            {isRefreshing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                  Syncing counts...
                </span>
              </div>
            )}
            
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsAddModalOpen(true)} style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
            <Button variant="outline" onClick={() => {
              console.log('🔄 [Manual] Manual refresh triggered')
              fetchAssignedLeads()
            }} style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>
              <Search className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button variant="outline" onClick={() => window.location.assign('/analytics')} style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="ghost" className="text-red-600" onClick={() => { localStorage.clear(); window.location.assign('/auth/login') }} style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>Sign Out</Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="bg-blue-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>Fresh Leads</p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>{tabCounts.fresh}</p>
                    <div className="flex items-center space-x-1 mt-2">
                      <Badge variant="secondary" className="bg-blue-600 text-white text-xs">{statusCounts.untouched}</Badge>
                      <Badge variant="secondary" className="bg-blue-400 text-white text-xs">{statusCounts.called}</Badge>
                      <Badge variant="secondary" className="bg-blue-600 text-white text-xs">{statusCounts.followup}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-amber-100 text-sm">Today's Follow-ups</p>
                  <p className="text-3xl font-bold">{tabCounts.followup}</p>
                  <Calendar className="h-6 w-6 mx-auto mt-2 text-amber-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-teal-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-teal-100 text-sm">Pending Leads</p>
                  <p className="text-3xl font-bold">{tabCounts.pending}</p>
                  <AlertCircle className="h-6 w-6 mx-auto mt-2 text-teal-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-600 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-emerald-100 text-sm">Qualified Leads</p>
                  <p className="text-3xl font-bold">{tabCounts.qualified}</p>
                  <Users className="h-6 w-6 mx-auto mt-2 text-emerald-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-600 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-green-100 text-sm">Won Leads</p>
                  <p className="text-3xl font-bold">{tabCounts.won}</p>
                  <Trophy className="h-6 w-6 mx-auto mt-2 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-red-100 text-sm">Lost Leads</p>
                  <p className="text-3xl font-bold">{tabCounts.lost}</p>
                  <X className="h-6 w-6 mx-auto mt-2 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs (compact) */}
          <div className="flex flex-wrap gap-2 text-sm">
            <Button 
              variant={activeTab === "fresh" ? "default" : "outline"}
              className={`${activeTab === "fresh" ? "bg-gray-900 text-white" : ""} h-8 px-3`}
              onClick={() => setActiveTab("fresh")}
            >
              <Star className="h-4 w-4 mr-2" />
              Fresh Leads ({tabCounts.fresh})
            </Button>
            <Button 
              variant={activeTab === "followup" ? "default" : "outline"}
              className={`${activeTab === "followup" ? "bg-gray-900 text-white" : ""} h-8 px-3`}
              onClick={() => setActiveTab("followup")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Today's Follow-ups ({tabCounts.followup})
            </Button>
            <Button 
              variant={activeTab === "pending" ? "default" : "outline"}
              className={`${activeTab === "pending" ? "bg-gray-900 text-white" : ""} h-8 px-3`}
              onClick={() => setActiveTab("pending")}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Pending Leads ({tabCounts.pending})
            </Button>
            <Button 
              variant={activeTab === "qualified" ? "default" : "outline"}
              className={`${activeTab === "qualified" ? "bg-gray-900 text-white" : ""} h-8 px-3`}
              onClick={() => setActiveTab("qualified")}
            >
              <Users className="h-4 w-4 mr-2" />
              Qualified Leads ({tabCounts.qualified})
            </Button>
            <Button 
              variant={activeTab === "wonlost" ? "default" : "outline"}
              className={`${activeTab === "wonlost" ? "bg-gray-900 text-white" : ""} h-8 px-3`}
              onClick={() => setActiveTab("wonlost")}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Won/Lost Leads ({tabCounts.wonlost})
            </Button>
            <Button 
              variant={activeTab === "lostconfirm" ? "default" : "outline"}
              className={`${activeTab === "lostconfirm" ? "bg-gray-900 text-white" : ""} h-8 px-3`}
              onClick={() => setActiveTab("lostconfirm")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Lost Confirmation ({tabCounts.lostconfirm})
            </Button>
            <Button 
              variant={activeTab === "walkin" ? "default" : "outline"}
              className={`${activeTab === "walkin" ? "bg-gray-900 text-white" : ""} h-8 px-3`}
              onClick={() => setActiveTab("walkin")}
            >
              <User className="h-4 w-4 mr-2" />
              Walk-in Leads ({tabCounts.walkin})
            </Button>
          </div>

          {/* Dynamic Leads Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {activeTab === "fresh" && "Fresh Leads"}
                    {activeTab === "followup" && "Today's Follow-ups"}
                    {activeTab === "pending" && "Pending Leads"}
                    {activeTab === "qualified" && "Qualified Leads"}
                    {activeTab === "wonlost" && "Won/Lost Leads"}
                    {activeTab === "lostconfirm" && "Lost Confirmation"}
                    {activeTab === "walkin" && "Walk-in Leads"}
                    {" "}({filteredLeads.length})
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-3">
                  <select className="border border-gray-300 rounded px-3 py-1 text-sm" value={dateMode} onChange={(e) => setDateMode(e.target.value as any)}>
                    <option>All Time</option>
                    <option>Today</option>
                    <option>This Week</option>
                    <option>Date Range</option>
                  </select>
                  {dateMode === "Date Range" && (
                    <div className="relative">
                      <Button variant="outline" size="sm" onClick={() => setShowRangePicker(v => !v)} className="h-8">
                        {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : 'Select date range'}
                      </Button>
                      {showRangePicker && (
                        <div className="absolute right-0 mt-2 z-20 bg-white border rounded shadow-lg p-3">
                          <div className="flex gap-2">
                            <div className="space-y-1">
                              <label className="text-xs text-gray-500">From</label>
                              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-500">To</label>
                              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-3">
                            <Button size="sm" variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
                            <Button size="sm" onClick={() => setShowRangePicker(false)} className="bg-blue-600 hover:bg-blue-700 text-white">Apply</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input 
                      placeholder="Search by UID, name..." 
                      className="pl-10 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  {/* Date Range Filter */}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Date Range:</span>
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
                    {(startDate || endDate) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStartDate('')
                          setEndDate('')
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Status Tabs - Untouched, Called, Follow Up for Fresh Leads */}
              {activeTab === "fresh" && (
                <div className="flex space-x-2 mb-4">
                  <Badge 
                    variant="secondary" 
                    className={`cursor-pointer ${activeStatus === "Fresh" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                    onClick={() => setActiveStatus("Fresh")}
                  >
                    Untouched <span className="ml-1 bg-gray-300 px-1 rounded">{statusCounts.untouched}</span>
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={`cursor-pointer ${activeStatus === "Called" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                    onClick={() => setActiveStatus("Called")}
                  >
                    Called <span className="ml-1 bg-gray-300 px-1 rounded">{statusCounts.called}</span>
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={`cursor-pointer ${activeStatus === "Follow Up" ? "bg-amber-900 text-white" : "bg-amber-100 text-amber-800"}`}
                    onClick={() => setActiveStatus("Follow Up")}
                  >
                    Follow Up <span className="ml-1 bg-amber-300 px-1 rounded">{statusCounts.followup}</span>
                  </Badge>
                </div>
              )}

              {/* Pending Filters - Hot/Warm/Cold */}
              {activeTab === "pending" && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-600">Lead Category:</span>
                  {(["all", "Hot", "Warm", "Cold"] as const).map(cat => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className={`cursor-pointer ${pendingCategory === cat ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                      onClick={() => setPendingCategory(cat)}
                    >
                      {cat.toString()}
                    </Badge>
                  ))}
                </div>
              )}

              {activeTab === "wonlost" && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-600">Filter:</span>
                  {(["all", "Booked", "Retailed", "Lost"] as const).map(cat => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className={`cursor-pointer ${wonLostFilter === cat ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                      onClick={() => setWonLostFilter(cat)}
                    >
                      {cat.toString()}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Subtle Refreshing Indicator */}
              {isRefreshing && (
                <div className="mb-2 flex items-center justify-center text-sm text-blue-600 bg-blue-50 py-2 px-4 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Syncing data...
                </div>
              )}

              {/* Leads Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-teal-50 via-blue-50 to-indigo-50">
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>ACTION</th>
                      {!(activeTab === "fresh" && activeStatus === "Fresh") && (
                        <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>LEAD STATUS</th>
                      )}
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>CALL STATS</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>CUSTOMER NAME</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>MOBILE</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>SOURCE</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>CAMPAIGN</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>BRANCH</th>
                      {!(activeTab === "fresh" && activeStatus === "Fresh") && (
                        <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>ICROP ID</th>
                      )}
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>GEM</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>DATE</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>UID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={(activeTab === "fresh" && activeStatus === "Fresh") ? 8 : 9} className="p-8 text-center text-gray-500">
                          Loading leads...
                        </td>
                      </tr>
                    ) : filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => {
                        const followUpDate = lead.follow_up_date ? (lead.follow_up_date.includes('T') ? lead.follow_up_date.slice(0,10) : lead.follow_up_date) : ""
                        const overdueDays = followUpDate && followUpDate < new Date().toISOString().slice(0,10) ? Math.ceil((Date.now() - new Date(followUpDate + 'T00:00:00').getTime())/86400000) : 0
                        return (
                        <tr key={lead.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <Button 
                              size="sm" 
                              className="bg-red-500 hover:bg-red-600 text-white"
                              onClick={() => openUpdateModal(lead)}
                              style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}
                            >
                              Update
                            </Button>
                          </td>
                          {!(activeTab === "fresh" && activeStatus === "Fresh") && (
                            <td className="p-3">
                              <Badge 
                                variant="outline"
                                className={
                                  lead.lead_status === "Fresh" ? "bg-blue-100 text-blue-800" :
                                  lead.lead_status === "Called" ? "bg-green-100 text-green-800" :
                                  lead.lead_status === "Follow Up" ? "bg-yellow-100 text-yellow-800" :
                                  lead.lead_status === "Qualified" ? "bg-purple-100 text-purple-800" :
                                  lead.lead_status === "Won" ? "bg-green-100 text-green-800" :
                                  lead.lead_status === "Lost" ? "bg-red-100 text-red-800" :
                                  "bg-gray-100 text-gray-800"
                                }
                              >
                                {lead.lead_status}
                              </Badge>
                              {activeTab === "followup" && overdueDays > 0 && (
                                <Badge variant="secondary" className="ml-2 bg-red-600 text-white">Overdue: {overdueDays} {overdueDays === 1 ? 'day' : 'days'}</Badge>
                              )}
                            </td>
                          )}
                          <td className="p-3 text-sm text-gray-600">
                            {lead.lead_status === "Called" ? "1 call" : "No calls"}
                          </td>
                          <td className="p-3 font-medium">{lead.customer_name}</td>
                          <td className="p-3">{lead.customer_mobile_number}</td>
                          <td className="p-3">{lead.source}</td>
                          <td className="p-3">{lead.campaign}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={lead.branch ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}>
                              {lead.branch || 'Unassigned'}
                            </Badge>
                          </td>
                          {!(activeTab === "fresh" && activeStatus === "Fresh") && (
                            <td className="p-3">
                              <Badge variant="outline" className={lead.icrop_id ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"}>
                                {lead.icrop_id || 'Pending'}
                              </Badge>
                            </td>
                          )}
                          <td className="p-3">
                            <Badge variant="outline" className={lead.ps_name ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                              {lead.ps_name || 'Unassigned'}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{lead.date}</td>
                          <td className="p-3 text-sm font-mono">{lead.uid}</td>
                        </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={(activeTab === "fresh" && activeStatus === "Fresh") ? 8 : 9} className="p-8 text-center text-gray-500">
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
    </DashboardLayout>
  )
}
