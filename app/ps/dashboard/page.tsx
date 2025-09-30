"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { 
  Calendar, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Star, 
  Info, 
  Users, 
  Trophy,
  RefreshCw,
  Clock,
  AlertCircle,
  User,
  X,
  Car,
  CreditCard,
  Briefcase,
  FileText,
  ChevronRight,
  Edit3,
  Settings,
  DollarSign,
  MapPin
} from "lucide-react"

interface PSFollowUp {
  id: string
  lead_uid: string
  ps_name: string
  ps_id: string
  ps_branch: string
  customer_name: string
  customer_mobile_number: string
  alternate_mobile_number: string
  source: string
  cre_name: string
  cre_id: string
  lead_category: string
  model_interested: string
  follow_up_date: string
  lead_status: string
  first_call_date: string
  first_call_remark: string
  first_call_lead_status?: string
  second_call_date: string
  second_call_remark: string
  second_call_lead_status?: string
  third_call_date: string
  third_call_remark: string
  third_call_lead_status?: string
  fourth_call_date: string
  fourth_call_remark: string
  fourth_call_lead_status?: string
  fifth_call_date: string
  fifth_call_remark: string
  fifth_call_lead_status?: string
  sixth_call_date: string
  sixth_call_remark: string
  sixth_call_lead_status?: string
  seventh_call_date: string
  seventh_call_remark: string
  seventh_call_lead_status?: string
  eighth_call_date?: string
  eighth_call_remark?: string
  eighth_call_lead_status?: string
  ninth_call_date?: string
  ninth_call_remark?: string
  ninth_call_lead_status?: string
  tenth_call_date?: string
  tenth_call_remark?: string
  tenth_call_lead_status?: string
  final_status: string
  test_drive_done: boolean
  tat: number
  created_at: string
  icrop_id?: string
  updated_at: string
  ps_assigned_at: string
  won_timestamp: string
  lost_timestamp: string
  variant: string
  buying_plan: string
  finance_option: string
  profession?: string
  test_drive_type?: string
  trade_in?: string
  booking_id?: string
  retailed_id?: string
}

export default function PSDashboard() {
  const [followUps, setFollowUps] = useState<PSFollowUp[]>([])
  const [qualifiedLeads, setQualifiedLeads] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState<PSFollowUp | null>(null)
  const [updateDialog, setUpdateDialog] = useState(false)
  const [callNumber, setCallNumber] = useState(1)
  const [callRemark, setCallRemark] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")
  const [finalStatus, setFinalStatus] = useState("")
  const [extraLeadInfo, setExtraLeadInfo] = useState<{ profession?: string; test_drive_type?: string; trade_in?: string } | null>(null)
  const [callOutcome, setCallOutcome] = useState<string>("")
  const [tradeInOpen, setTradeInOpen] = useState(false)
  const [tradeInLoading, setTradeInLoading] = useState(false)
  const [tradeInData, setTradeInData] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'fresh'|'today'|'pending'|'booked'|'retailed'|'wonlost'>('fresh')
  const [activeSubTab, setActiveSubTab] = useState<'requested'|'approved'|'rejected'>('requested')
  const [notifications, setNotifications] = useState<Array<{id: string, type: 'approved'|'rejected', leadUid: string, requestType: 'booking'|'retailed', timestamp: Date}>>([])
  const [bookingId, setBookingId] = useState('')
  const [retailedId, setRetailedId] = useState('')
  const [showMobileRefreshButton, setShowMobileRefreshButton] = useState(true)
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<'today'|'all'|'range'>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pendingFilter, setPendingFilter] = useState<'all'|'hot'|'warm'|'cold'>('all')
  const [pendingStatusFilter, setPendingStatusFilter] = useState<'all'|'pending'|'booked'>('all')

  // Reset filters when switching tabs
  const handleTabChange = (tab: 'fresh'|'today'|'pending'|'booked'|'retailed'|'wonlost') => {
    setActiveTab(tab)
    setActiveSubTab('requested') // Reset sub-tab to 'requested' when switching main tabs
    
    // Reset filters based on tab
    if (tab === 'today' || tab === 'booked' || tab === 'retailed' || tab === 'wonlost') {
      setDateFilter('today')
      setStartDate('')
      setEndDate('')
    } else if (tab === 'pending') {
      setPendingFilter('all')
    }
  }

  // Auto-update final status when call outcome changes
  useEffect(() => {
    if (callOutcome) {
      const newFinalStatus = getFinalStatusForLeadStatus(callOutcome)
      setFinalStatus(newFinalStatus)
    }
  }, [callOutcome])

  // Small helper to render uniform label/value pairs on a single line
  const InfoLine = ({ label, value }: { label: string; value?: string }) => (
    <div className="text-[14px] text-gray-800 leading-6">
      <span className="font-medium">{label}:</span> <span>{value || '—'}</span>
    </div>
  )

  useEffect(() => {
    loadFollowUps()
    loadQualifiedLeads()

    // Set up real-time refresh every 30 seconds to catch ICROP ID updates
    const interval = setInterval(() => {
      loadFollowUps()
      loadQualifiedLeads()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Effect to handle hiding mobile refresh button after KPI cards section
  useEffect(() => {
    const handleScroll = () => {
      // Only apply this logic on mobile screens
      if (window.innerWidth >= 768) return

      // Get the KPI cards section
      const kpiSection = document.querySelector('.stats-grid')
      if (kpiSection) {
        const kpiSectionBottom = kpiSection.getBoundingClientRect().bottom
        // Hide refresh button if KPI section has passed the top of the viewport
        setShowMobileRefreshButton(kpiSectionBottom > 0)
      }
    }

    // Add scroll listener only on mobile
    if (window.innerWidth < 768) {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const loadFollowUps = async () => {
    setIsLoading(true)
    try {
      console.log('📡 [API Debug] Loading PS follow-ups...')
      
      const response = await fetch('/api/ps-followup', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for authentication
      })
      
      console.log('📡 [API Debug] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('PS Follow-ups loaded:', data.length, 'items')
        console.log('Sample follow-up data:', data[0])
        setFollowUps(data)
      } else {
        const errorData = await response.json()
        console.error('Error loading follow-ups:', errorData)
        toast.error(errorData.error || 'Failed to load follow-ups')
      }
    } catch (error) {
      console.error('Error loading follow-ups:', error)
      toast.error('Failed to load follow-ups')
    } finally {
      setIsLoading(false)
    }
  }

  const loadQualifiedLeads = async () => {
    try {
      const session = typeof window !== 'undefined' ? (localStorage.getItem('supabase_user') || localStorage.getItem('user')) : null
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch('/api/qualified-leads', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Qualified leads loaded:', data)
        // Debug logging removed
        
        // Check for status changes before updating state
        checkForStatusChanges(data)
        
        // Debug logging
        console.log('Qualified leads loaded:', data.length, 'leads')
        
        // Debug: Check for retailed leads
        const retailedLeads = data.filter((lead: any) => lead.retailed_id)
        console.log('🛍️ [Retailed Leads] Found:', retailedLeads)
        console.log('🛍️ [Retailed Leads] Count:', retailedLeads.length)
        
        // Debug: Show all leads with their retailed info
        data.forEach((lead: any, index: number) => {
          if (lead.retailed_id || lead.retailed_status) {
            console.log(`🛍️ [Lead ${index}] ${lead.lead_uid}:`, {
              ps_name: lead.ps_name,
              retailed_id: lead.retailed_id,
              retailed_status: lead.retailed_status,
              customer_name: lead.customer_name
            })
          }
        })
        
        setQualifiedLeads(data)
      } else {
        console.error('Error loading qualified leads:', await response.text())
      }
    } catch (error) {
      console.error('Error loading qualified leads:', error)
    }
  }

  // Check for status changes and show notifications
  const checkForStatusChanges = (newLeads: any[]) => {
    newLeads.forEach(newLead => {
      const oldLead = qualifiedLeads.find(old => old.lead_uid === newLead.lead_uid)
      
      if (oldLead && newLead.ps_name?.toLowerCase() === currentPSName.toLowerCase()) {
        // Check booking status changes
        if (oldLead.booking_status !== newLead.booking_status) {
          if (newLead.booking_status === 'Approved') {
            showNotification('approved', newLead.lead_uid, 'booking')
          } else if (newLead.booking_status === 'Rejected') {
            showNotification('rejected', newLead.lead_uid, 'booking')
          }
        }
        
        // Check retail status changes
        if (oldLead.retailed_status !== newLead.retailed_status) {
          if (newLead.retailed_status === 'Approved') {
            showNotification('approved', newLead.lead_uid, 'retailed')
          } else if (newLead.retailed_status === 'Rejected') {
            showNotification('rejected', newLead.lead_uid, 'retailed')
          }
        }
      }
    })
  }

  const showNotification = (type: 'approved'|'rejected', leadUid: string, requestType: 'booking'|'retailed') => {
    const notification = {
      id: `${leadUid}-${requestType}-${Date.now()}`,
      type,
      leadUid,
      requestType,
      timestamp: new Date()
    }
    
    setNotifications(prev => [...prev, notification])
    
    // Show toast notification
    if (type === 'approved') {
      toast.success(`🎉 ${requestType === 'booking' ? 'Booking' : 'Retail'} request for ${leadUid} has been approved!`)
    } else {
      toast.error(`❌ ${requestType === 'booking' ? 'Booking' : 'Retail'} request for ${leadUid} has been rejected.`)
    }
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }

  // Helper function to convert UI display names to internal storage names
  const getInternalStatusName = (uiStatus: string) => {
    switch (uiStatus) {
      case 'Booked': return 'Booking Requested'
      case 'Retailed': return 'Retail Requested'
      default: return uiStatus
    }
  }

  const handleUpdateFollowUp = async () => {
    if (!selectedFollowUp) return

    // Validate Order No. format if Booked
    if (callOutcome === 'Booked' && bookingId) {
      if (bookingId.length !== 12 || !bookingId.startsWith('ORD') || !/^ORD\d{9}$/.test(bookingId)) {
        alert('Order No. must be in format ORD followed by exactly 9 digits (e.g., ORD123456789)')
        return
      }
    }

    // Validate DN No. format if Retailed
    if (callOutcome === 'Retailed' && retailedId) {
      if (retailedId.length !== 12 || !retailedId.startsWith('DNN') || !/^DNN\d{9}$/.test(retailedId)) {
        alert('DN No. must be in format DNN followed by exactly 9 digits (e.g., DNN123456789)')
        return
      }
    }

    try {
      // Get authentication token
      const session = typeof window !== 'undefined' ? (localStorage.getItem('supabase_user') || localStorage.getItem('user')) : null
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const updateData: any = {
        id: selectedFollowUp.id,
        lead_uid: selectedFollowUp.lead_uid,
        lead_status: getInternalStatusName(callOutcome), // Convert UI name to internal name
        // ps_id and ps_name are not needed in update - backend will use current user from JWT
        follow_up_date: followUpDate ? (followUpDate.includes('T') ? followUpDate : followUpDate + 'T00:00') : selectedFollowUp.follow_up_date,
        final_status: finalStatus || selectedFollowUp.final_status,
        updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T')
      }

      // Handle booking/retailed ID for won leads
      if (isLeadWon(callOutcome)) {
        if (callOutcome === 'Booked' && bookingId) {
          updateData.booking_id = bookingId
        } else if (callOutcome === 'Retailed' && retailedId) {
          updateData.retailed_id = retailedId
        }
      }

      // Lock follow-up date and final status for won/lost leads
      if (isLeadWon(callOutcome)) {
        updateData.final_status = 'Waiting for Approval'
        // Don't update follow_up_date for won leads - keep existing date
        delete updateData.follow_up_date
      } else if (isLeadLost(callOutcome)) {
        updateData.final_status = 'Lost Requested'
        // Don't update follow_up_date for lost leads - keep existing date
        delete updateData.follow_up_date
      }

      // Add call remark based on call number
      const callFields = [
        'first_call_remark',
        'second_call_remark', 
        'third_call_remark',
        'fourth_call_remark',
        'fifth_call_remark',
        'sixth_call_remark',
        'seventh_call_remark',
        'eighth_call_remark',
        'ninth_call_remark',
        'tenth_call_remark'
      ]

      const effectiveRemark = callRemark
      const currentCallNumber = getNextCallNumber(selectedFollowUp)
      
      // Update call remark if provided
      if (effectiveRemark.trim() && currentCallNumber <= callFields.length) {
        updateData[callFields[currentCallNumber - 1]] = effectiveRemark
        updateData[`${callFields[currentCallNumber - 1].replace('_remark', '_date')}`] = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T')
      }
      
      // Update call lead status if call outcome is selected
      const callLeadStatusFields = [
        'first_call_lead_status', 'second_call_lead_status', 'third_call_lead_status',
        'fourth_call_lead_status', 'fifth_call_lead_status', 'sixth_call_lead_status', 'seventh_call_lead_status',
        'eighth_call_lead_status', 'ninth_call_lead_status', 'tenth_call_lead_status'
      ]
      
      if (callOutcome && currentCallNumber <= callLeadStatusFields.length) {
        updateData[callLeadStatusFields[currentCallNumber - 1]] = getInternalStatusName(callOutcome)
      }

      console.log('🔄 [PS Follow-up] Updating follow-up with data:', updateData)

      const response = await fetch('/api/ps-followup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        const responseData = await response.json()
        console.log('✅ [PS Follow-up] Update successful:', responseData)
        
        // Show appropriate success message based on lead status
        if (isLeadWon(callOutcome)) {
          if (callOutcome === 'Booked') {
            toast.success('Follow-up updated! Booking request sent to Sales Manager for approval')
          } else if (callOutcome === 'Retailed') {
            toast.success('Follow-up updated! Retail request sent to Sales Manager for approval')
          } else {
        toast.success('Follow-up updated successfully')
          }
        } else if (isLeadLost(callOutcome)) {
          toast.success('Lost status requested! Awaiting CRE approval')
        } else {
          toast.success('Follow-up updated successfully')
        }
        
        setUpdateDialog(false)
        setSelectedFollowUp(null)
        setCallRemark("")
        setCallOutcome("")
        setFollowUpDate("")
        setFinalStatus("")
        loadFollowUps()
        loadQualifiedLeads() // Also refresh qualified leads to get updated lost status
      } else {
        const errorData = await response.json()
        console.error('❌ [PS Follow-up] Update failed:', errorData)
        toast.error(errorData.error || 'Failed to update follow-up')
      }
    } catch (error) {
      console.error('❌ [PS Follow-up] Error updating follow-up:', error)
      toast.error('Failed to update follow-up')
    }
  }

  const openUpdateDialog = (followUp: PSFollowUp) => {
    setSelectedFollowUp(followUp)
    setUpdateDialog(true)
    setCallNumber(1)
    setCallRemark("")
    setFollowUpDate(followUp.follow_up_date)
    setFinalStatus(followUp.final_status)
    setCallOutcome("")
    setBookingId("")
    setRetailedId("")
    // Load extra info (profession, test_drive_type, trade-in) from backend
    ;(async () => {
      try {
        const res = await fetch(`/api/trade-in/${encodeURIComponent(followUp.lead_uid)}`)
        const data = await res.json()
        if (res.ok) {
          setExtraLeadInfo({
            profession: data?.profession || undefined,
            test_drive_type: data?.test_drive_type || undefined,
            trade_in: (data?.trade_in || '').toString(),
          })
        } else {
          setExtraLeadInfo(null)
        }
      } catch {
        setExtraLeadInfo(null)
      }
    })()
  }

  const getStatusBadge = (status: string, followUp?: PSFollowUp) => {
    switch (status?.toLowerCase()) {
      case 'won':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Won</Badge>
      case 'lost':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Lost</Badge>
      case 'lost requested':
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" />Lost Requested</Badge>
      case 'qualified':
        return <Badge className="bg-blue-100 text-blue-800"><Star className="w-3 h-3 mr-1" />Qualified</Badge>
      case 'pending':
        // Show temperature indicator for pending leads in pending tab
        if (activeTab === 'pending' && followUp) {
          const temperature = getPendingTemperature(followUp)
          switch (temperature) {
            case 'hot':
              return <Badge className="bg-red-100 text-red-800"><Clock className="w-3 h-3 mr-1" />🔥 Hot</Badge>
            case 'warm':
              return <Badge className="bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" />🔥 Warm</Badge>
            case 'cold':
              return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />❄️ Cold</Badge>
          }
        }
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'hot':
        return <Badge className="bg-orange-100 text-orange-800">Hot</Badge>
      case 'warm':
        return <Badge className="bg-yellow-100 text-yellow-800">Warm</Badge>
      default:
        return <Badge variant="secondary">{status || 'Pending'}</Badge>
    }
  }

  const getNextCallNumber = (followUp: PSFollowUp | null) => {
    if (!followUp) return 1
    
    const calls = [
      followUp.first_call_remark,
      followUp.second_call_remark,
      followUp.third_call_remark,
      followUp.fourth_call_remark,
      followUp.fifth_call_remark,
      followUp.sixth_call_remark,
      followUp.seventh_call_remark,
      followUp.eighth_call_remark,
      followUp.ninth_call_remark,
      followUp.tenth_call_remark
    ]
    
    for (let i = 0; i < calls.length; i++) {
      if (!calls[i]) return i + 1
    }
    return 10
  }

  // Helper function to check if lead is won (booked/retailed)
  const isLeadWon = (status: string) => {
    return status === 'Booked' || status === 'Retailed'
  }

  // Helper function to check if lead is lost
  const isLeadLost = (status: string) => {
    return status === 'Lost to Competition' || status === 'Lost to codealer' || status === 'Dropped'
  }

  // Helper function to check if lead status requires lost request
  const requiresLostRequest = (status: string) => {
    return status === 'Lost to Competition' || status === 'Lost to codealer' || status === 'Dropped'
  }

  // Helper function to check if follow-up date should be locked
  const isFollowUpDateLocked = (status: string) => {
    return isLeadWon(status) || isLeadLost(status)
  }

  // Helper function to check if final status should be locked
  const isFinalStatusLocked = (status: string) => {
    return isLeadWon(status) || isLeadLost(status)
  }

  // Helper function to get the appropriate final status based on lead status
  const getFinalStatusForLeadStatus = (leadStatus: string) => {
    if (leadStatus === 'Booked' || leadStatus === 'Retailed') {
      return 'Waiting for Approval'
    } else if (isLeadLost(leadStatus)) {
      return 'Lost'
    }
    return 'Pending'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isToday = (dateString?: string) => {
    if (!dateString) return false
    const d = new Date(dateString)
    const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }

  // Calculate stats
  const stats = {
    totalAssigned: followUps.length,
    pending: followUps.filter(f => (f.final_status || '').toLowerCase() === 'pending').length,
    won: followUps.filter(f => (f.final_status || '').toLowerCase() === 'won').length,
    lost: followUps.filter(f => (f.final_status || '').toLowerCase() === 'lost').length
  }

  // Helper function to check if a date is within range
  const isWithinDateRange = (dateString: string, start: string, end?: string) => {
    if (!dateString || !start) return false
    
    // Normalize date strings to YYYY-MM-DD format
    const normalizeDate = (dateStr: string) => {
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0]
      }
      return dateStr
    }
    
    const normalizedDate = normalizeDate(dateString)
    const normalizedStart = normalizeDate(start)
    
    // If no end date, match only the start date
    if (!end) {
      return normalizedDate === normalizedStart
    }
    
    const normalizedEnd = normalizeDate(end)
    return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd
  }

  // Helper function to check if a follow-up is overdue
  const isOverdue = (followUpDate: string) => {
    if (!followUpDate) return false
    
    const followUp = followUpDate.includes('T') ? followUpDate.slice(0,10) : followUpDate
    const today = new Date().toISOString().slice(0,10)
    return followUp < today
  }

  // Helper function to get overdue days
  const getOverdueDays = (followUpDate: string) => {
    if (!followUpDate) return 0
    
    const followUp = followUpDate.includes('T') ? followUpDate.slice(0,10) : followUpDate
    const today = new Date().toISOString().slice(0,10)
    
    if (followUp >= today) return 0
    
    const followUpTime = new Date(followUp + 'T00:00:00').getTime()
    const todayTime = new Date(today + 'T00:00:00').getTime()
    return Math.ceil((todayTime - followUpTime) / (1000 * 60 * 60 * 24))
  }

  // Helper function to get pending temperature based on lead age
  const getPendingTemperature = (followUp: PSFollowUp) => {
    const assignedDate = new Date(followUp.ps_assigned_at)
    const daysSinceAssigned = Math.ceil((Date.now() - assignedDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceAssigned <= 1) return 'hot'
    if (daysSinceAssigned <= 3) return 'warm'
    return 'cold'
  }

  // Apply date filters
  const applyDateFilter = (list: PSFollowUp[]) => {
    switch (dateFilter) {
      case 'today':
        return list.filter(f => isToday(f.follow_up_date))
      case 'all':
        return list
      case 'range':
        return list.filter(f => isWithinDateRange(f.follow_up_date, startDate))
      default:
        return list
    }
  }

  // Apply pending lead category filter
  const applyPendingFilter = (list: PSFollowUp[]) => {
    if (pendingFilter === 'all') return list
    return list.filter(f => (f.lead_category || '').toLowerCase() === pendingFilter.toLowerCase())
  }

  // Apply pending final status filter
  const applyPendingStatusFilter = (list: PSFollowUp[]) => {
    if (pendingStatusFilter === 'all') return list
    return list.filter(f => (f.final_status || '').toLowerCase() === pendingStatusFilter.toLowerCase())
  }

  // Helper function to check if a lead has been updated (has any call remarks)
  const hasBeenUpdated = (followUp: PSFollowUp) => {
    const callFields = [
      'first_call_remark', 'second_call_remark', 'third_call_remark',
      'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark',
      'eighth_call_remark', 'ninth_call_remark', 'tenth_call_remark'
    ]
    return callFields.some(field => followUp[field as keyof PSFollowUp])
  }

  // Fresh leads: Leads that have never been updated (no call remarks) and are not won/lost
  const freshList = followUps.filter(f => 
    !hasBeenUpdated(f) && 
    !['won','lost'].includes((f.final_status || '').toLowerCase()) &&
    (f.final_status || '').toLowerCase() !== 'lost'
  )
  const freshCount = freshList.length
  
  // Debug logging
  console.log('Fresh leads count:', freshCount, 'out of', followUps.length, 'total follow-ups')
  console.log('Fresh leads sample:', freshList.slice(0, 2))
  
  // Today's follow-ups: Leads with follow-up dates for today or overdue
  const todayList = applyDateFilter(followUps.filter(f => 
    !['won','lost'].includes((f.final_status || '').toLowerCase()) && 
    (isToday(f.follow_up_date) || isOverdue(f.follow_up_date))
  ))
  const todayCount = todayList.length
  
  // Pending leads: Leads with final_status = 'pending' or 'booked' (excluding fresh leads and won/lost)
  const pendingList = applyPendingFilter(applyPendingStatusFilter(applyDateFilter(followUps.filter(f => 
    !['won','lost'].includes((f.final_status || '').toLowerCase()) &&
    (['pending', 'booked', 'waiting for approval'].includes((f.final_status || '').toLowerCase())) && 
    hasBeenUpdated(f)
  ))))
  const pendingCount = pendingList.length
  
  // Get current PS user name for filtering
  const session = typeof window !== 'undefined' ? (localStorage.getItem('supabase_user') || localStorage.getItem('user')) : null
  const currentPSUser = session ? JSON.parse(session) : null
  const currentPSName = currentPSUser?.name || currentPSUser?.username || ''
  
  // Debug: Log current PS name
  // Debug logging removed

  // Booked leads: Separate by status
  const bookedRequestedList = qualifiedLeads.filter(lead => {
    // Check multiple possible PS name matches
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    const hasBookingId = !!lead.booking_id
    const isWaitingForApproval = lead.booking_status === 'Waiting for Approval'
    return psNameMatch && hasBookingId && isWaitingForApproval
  })
  const bookedApprovedList = qualifiedLeads.filter(lead => {
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    return psNameMatch && lead.booking_id && lead.booking_status === 'Approved'
  })
  const bookedRejectedList = qualifiedLeads.filter(lead => {
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    return psNameMatch && lead.booking_id && lead.booking_status === 'Rejected'
  })
  const bookedList = [...bookedRequestedList, ...bookedApprovedList, ...bookedRejectedList]
  const bookedCount = bookedList.length
  
  // Debug counts removed
  
  // Retailed leads: Separate by status
  const retailedRequestedList = qualifiedLeads.filter(lead => {
    // Check multiple possible PS name matches
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    const hasRetailedId = !!lead.retailed_id
    const isWaitingForApproval = lead.retailed_status === 'Waiting for Approval'
    
    // Debug logging removed
    
    return psNameMatch && hasRetailedId && isWaitingForApproval
  })
  const retailedApprovedList = qualifiedLeads.filter(lead => {
    // Check multiple possible PS name matches
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    const hasRetailedId = !!lead.retailed_id
    const isApproved = lead.retailed_status === 'Approved'
    return psNameMatch && hasRetailedId && isApproved
  })
  const retailedRejectedList = qualifiedLeads.filter(lead => {
    // Check multiple possible PS name matches
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    const hasRetailedId = !!lead.retailed_id
    const isRejected = lead.retailed_status === 'Rejected'
    return psNameMatch && hasRetailedId && isRejected
  })
  const retailedList = [...retailedRequestedList, ...retailedApprovedList, ...retailedRejectedList]
  const retailedCount = retailedList.length
  
  // Debug logging removed
  
  // Won/Lost leads: Leads with final_status = 'won', 'lost', or 'lost requested'
  const wonLostList = applyDateFilter(followUps.filter(f => {
    const status = (f.final_status || '').toLowerCase()
    return ['won','lost','lost requested'].includes(status)
  }))
  const wonLostCount = wonLostList.length

  const filteredFollowUps = (() => {
    switch(activeTab){
      case 'fresh': return freshList
      case 'today': return todayList
      case 'pending': return pendingList
      case 'booked': 
        switch(activeSubTab) {
          case 'requested': return bookedRequestedList
          case 'approved': return bookedApprovedList
          case 'rejected': return bookedRejectedList
          default: return bookedRequestedList
        }
      case 'retailed': 
        switch(activeSubTab) {
          case 'requested': return retailedRequestedList
          case 'approved': return retailedApprovedList
          case 'rejected': return retailedRejectedList
          default: return retailedRequestedList
        }
      case 'wonlost': return wonLostList
      default: return freshList
    }
  })()

  const StatCard = ({ title, value, description, icon: Icon, color, bgColor }: any) => (
    <div className={`${bgColor} rounded-lg pt-2 px-2 md:px-3 border-l-4 ${color} transition-all hover:shadow-lg hover:scale-105 duration-300 h-28 md:h-32`}>
      <div className="flex flex-col h-full items-center justify-between">
        {/* Title at top center - shifted upward */}
        <div className="flex items-center justify-center mb-0.5 md:mb-1">
          <Icon className={`h-3 w-3 md:h-4 md:w-4 ${color.replace('border-l-', 'text-')} mr-1`} />
          <div className="text-gray-800 font-semibold text-xs md:text-sm text-center">{title}</div>
        </div>

        {/* Main count in center - vertically centered */}
        <div className="flex items-center justify-center">
          <div className={`text-xl md:text-2xl font-extrabold ${color.replace('border-l-', 'text-')} text-center`}>
            {value}
          </div>
        </div>

        {/* Description at bottom - anchored at bottom */}
        <div className="flex items-center justify-center mb-1">
          <div className="text-gray-600 text-xs md:text-xs text-center leading-tight">{description}</div>
        </div>
      </div>
    </div>
  )

  const TabButton = ({ id, label, count, icon: Icon, isActive, onClick }: any) => (
    <button
      onClick={() => onClick(id)}
      className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2 md:px-3 md:py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap min-w-0 flex-1 ${
        isActive
          ? 'bg-white/80 backdrop-blur-md text-blue-700 shadow-lg border border-white/20'
          : 'text-gray-600 hover:text-gray-800 hover:bg-white/40 hover:backdrop-blur-sm'
      }`}
      style={isActive ? {
        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)'
      } : {}}
    >
      <Icon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
      <span className="text-xs md:text-sm font-semibold leading-tight text-center break-words max-w-full">
        {label.split(' ').map((word: string, index: number) => (
          <span key={index} className="block">
            {word}
          </span>
        ))}
      </span>
      <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold min-w-[20px] text-center ${
        isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  )

  return (
    <DashboardLayout>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg border-l-4 ${
                notification.type === 'approved' 
                  ? 'bg-green-50 border-green-500 text-green-800' 
                  : 'bg-red-50 border-red-500 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'approved' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              <div>
                  <div className="font-medium">
                    {notification.type === 'approved' ? 'Request Approved!' : 'Request Rejected'}
                  </div>
                  <div className="text-sm">
                    {notification.requestType === 'booking' ? 'Booking' : 'Retail'} request for {notification.leadUid}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-1 md:p-2">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="relative mb-2 md:mb-4">
            {/* Mobile refresh button - positioned absolutely in top right, same line as hamburger */}
            {showMobileRefreshButton && (
              <Button
                onClick={loadFollowUps}
                disabled={isLoading}
                className="md:hidden fixed top-2 right-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center z-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}

            {/* Header content with proper spacing */}
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="pl-12 pr-12 md:pl-0 md:pr-0 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">GEM Dashboard</h1>
                <p className="text-gray-600 text-sm md:text-base">Manage your assigned leads and follow-ups</p>
              </div>

              {/* Desktop refresh button */}
              <Button
                onClick={loadFollowUps}
                disabled={isLoading}
                className="hidden md:flex bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 items-center gap-2 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh Data'}
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-3 md:mb-4 px-1 md:px-0">
            <StatCard
              title="Total Assigned"
              value={stats.totalAssigned}
              description="All leads assigned to you"
              icon={User}
              color="border-l-blue-500"
              bgColor="bg-blue-50"
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              description="Awaiting follow-up"
              icon={Clock}
              color="border-l-amber-500"
              bgColor="bg-amber-50"
            />
            <StatCard
              title="Won"
              value={stats.won}
              description="Successful conversions"
              icon={Trophy}
              color="border-l-green-500"
              bgColor="bg-green-50"
            />
            <StatCard
              title="Lost"
              value={stats.lost}
              description="Unsuccessful leads"
              icon={AlertCircle}
              color="border-l-red-500"
              bgColor="bg-red-50"
            />
                </div>

          {/* Tabs */}
          <div className="relative bg-gradient-to-r from-blue-50/80 via-purple-50/80 to-pink-50/80 backdrop-blur-sm p-2 md:p-2 rounded-2xl mb-3 md:mb-4 mx-1 md:mx-0 border border-white/30 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-purple-100/20 to-pink-100/20 backdrop-blur-lg"></div>
            <div className="relative grid grid-cols-3 md:grid-cols-6 gap-1 md:gap-2">
              <TabButton
                id="fresh"
                label="Fresh Leads"
                count={freshCount}
                icon={Star}
                isActive={activeTab === 'fresh'}
                onClick={handleTabChange}
              />
              <TabButton
                id="today"
                label="Today's Follow-ups"
                count={todayCount}
                icon={Calendar}
                isActive={activeTab === 'today'}
                onClick={handleTabChange}
              />
              <TabButton
                id="pending"
                label="Pending Leads"
                count={pendingCount}
                icon={Clock}
                isActive={activeTab === 'pending'}
                onClick={handleTabChange}
              />
              <TabButton
                id="booked"
                label="Booked Approval"
                count={bookedCount}
                icon={CheckCircle}
                isActive={activeTab === 'booked'}
                onClick={handleTabChange}
              />
              <TabButton
                id="retailed"
                label="Retailed Approval"
                count={retailedCount}
                icon={CheckCircle}
                isActive={activeTab === 'retailed'}
                onClick={handleTabChange}
              />
              <TabButton
                id="wonlost"
                label="Won/Lost Leads"
                count={wonLostCount}
                icon={Trophy}
                isActive={activeTab === 'wonlost'}
                onClick={handleTabChange}
              />
                </div>
          </div>

          {/* Leads Table */}
          <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20 mx-1 md:mx-0">
            <div className="relative bg-gradient-to-r from-blue-500/90 via-indigo-600/90 to-purple-600/90 backdrop-blur-md text-white p-3 md:p-4 border-b border-white/20" style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(99, 102, 241, 0.95) 50%, rgba(168, 85, 247, 0.95) 100%)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}>
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 backdrop-blur-lg"></div>
              <div className="relative">
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-white/90" />
                  <span className="text-sm md:text-base text-white/95">
                    {activeTab === 'fresh' && 'Fresh Leads'}
                    {activeTab === 'today' && 'Today\'s Follow-ups'}
                    {activeTab === 'pending' && 'Pending Leads'}
                    {activeTab === 'booked' && 'Booked Approval'}
                    {activeTab === 'retailed' && 'Retailed Approval'}
                    {activeTab === 'wonlost' && 'Won/Lost Leads'}
                  </span>
                </h2>
                <p className="text-white/80 text-xs md:text-sm mt-1 leading-relaxed">
                  {activeTab === 'fresh' && 'Leads newly assigned to you'}
                  {activeTab === 'today' && 'Leads with follow-up scheduled for today (including overdue)'}
                  {activeTab === 'pending' && 'Leads with final status Pending'}
                  {activeTab === 'booked' && 'Booked leads approval status'}
                  {activeTab === 'retailed' && 'Retailed leads approval status'}
                  {activeTab === 'wonlost' && 'Leads that are won or lost'}
                </p>
              </div>
              
              {/* Subsection tabs for booked and retailed */}
              {(activeTab === 'booked' || activeTab === 'retailed') && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => setActiveSubTab('requested')}
                    className={`px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 backdrop-blur-sm border border-white/30 ${
                      activeSubTab === 'requested'
                        ? 'bg-white/25 text-white shadow-lg border-white/40'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    <span className="hidden md:inline">Requested</span>
                    <span className="md:hidden">Req</span>
                    <span className="ml-1">({activeTab === 'booked' ? bookedRequestedList.length : retailedRequestedList.length})</span>
          </button>
                  <button
                    onClick={() => setActiveSubTab('approved')}
                    className={`px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 backdrop-blur-sm border border-white/30 ${
                      activeSubTab === 'approved'
                        ? 'bg-green-500/30 text-white shadow-lg border-green-400/40'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    <span className="hidden md:inline">Approved</span>
                    <span className="md:hidden">App</span>
                    <span className="ml-1">({activeTab === 'booked' ? bookedApprovedList.length : retailedApprovedList.length})</span>
          </button>
                  <button
                    onClick={() => setActiveSubTab('rejected')}
                    className={`px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 backdrop-blur-sm border border-white/30 ${
                      activeSubTab === 'rejected'
                        ? 'bg-red-500/30 text-white shadow-lg border-red-400/40'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    <span className="hidden md:inline">Rejected</span>
                    <span className="md:hidden">Rej</span>
                    <span className="ml-1">({activeTab === 'booked' ? bookedRejectedList.length : retailedRejectedList.length})</span>
          </button>
                </div>
              )}
        </div>

        {/* Filters Section */}
        <div className="bg-gray-50/80 backdrop-blur-sm p-3 md:p-4 border-b border-gray-200/50">
          <div className="flex flex-wrap gap-2 md:gap-4 items-center text-xs md:text-sm">
            {/* Date Range Filters for Today, Won/Lost sections */}
            {(activeTab === 'today' || activeTab === 'wonlost') && (
              <>
                      <div className="flex items-center gap-1 md:gap-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Filter:</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as 'today'|'all'|'range')}
                    className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                  >
                    <option value="today">Today</option>
                    <option value="all">All Time</option>
                    <option value="range">Date Range</option>
                  </select>
                      </div>

                {dateFilter === 'range' && (
                      <div className="flex items-center gap-1 md:gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                      placeholder="Select Date"
                    />
                    {startDate && (
                      <button
                        onClick={() => setStartDate('')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors whitespace-nowrap"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Filters for Pending Leads */}
        {activeTab === 'pending' && (
              <>
                {/* Lead Category Filter */}
                <div className="flex items-center gap-1 md:gap-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Category:</label>
                  <select
                    value={pendingFilter}
                    onChange={(e) => setPendingFilter(e.target.value as 'all'|'hot'|'warm'|'cold')}
                    className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                  >
                    <option value="all">All</option>
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">🔥 Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>

                {/* Final Status Filter */}
                <div className="flex items-center gap-1 md:gap-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Status:</label>
                  <select
                    value={pendingStatusFilter}
                    onChange={(e) => setPendingStatusFilter(e.target.value as 'all'|'pending'|'booked')}
                    className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="booked">Booked</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className="flex items-center gap-1 md:gap-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Date:</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as 'today'|'all'|'range')}
                    className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                  >
                    <option value="today">Today</option>
                    <option value="all">All Time</option>
                    <option value="range">Date Range</option>
                  </select>
                </div>

                {dateFilter === 'range' && (
                  <div className="flex items-center gap-1 md:gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                      placeholder="Select Date"
                    />
                    {startDate && (
                      <button
                        onClick={() => setStartDate('')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors whitespace-nowrap"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Show current filter status */}
            <div className="ml-auto text-xs md:text-sm text-gray-600 hidden md:block">
              {activeTab === 'today' && dateFilter === 'range' && startDate && endDate && (
                <span>Showing: {startDate} to {endDate}</span>
              )}
              {activeTab === 'pending' && (pendingFilter !== 'all' || pendingStatusFilter !== 'all' || dateFilter !== 'today') && (
                <span>
                  Showing:
                  {pendingFilter !== 'all' && ` ${pendingFilter === 'hot' ? '🔥 Hot' : pendingFilter === 'warm' ? '🔥 Warm' : '❄️ Cold'} leads`}
                  {pendingStatusFilter !== 'all' && ` ${pendingStatusFilter} status`}
                  {dateFilter === 'range' && startDate && endDate && ` from ${startDate} to ${endDate}`}
                </span>
              )}
            </div>
          </div>
        </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="text-left p-2 md:p-4 font-semibold text-gray-700 text-xs md:text-sm">Lead Info</th>
                    <th className="text-left p-2 md:p-4 font-semibold text-gray-700 text-xs md:text-sm hidden md:table-cell">Vehicle Details</th>
                    <th className="text-left p-2 md:p-4 font-semibold text-gray-700 text-xs md:text-sm">Status</th>
                    {activeTab !== 'fresh' && (
                      <th className="text-left p-2 md:p-4 font-semibold text-gray-700 text-xs md:text-sm">Next Call</th>
                    )}
                    <th className="text-left p-2 md:p-4 font-semibold text-gray-700 text-xs md:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFollowUps.map((item, index) => {
                    // Handle both qualified leads and follow-ups
                    const isQualifiedLead = item.booking_id || item.retailed_id
                    const customerName = isQualifiedLead ? item.customer_name : item.customer_name
                    const customerMobile = isQualifiedLead ? item.customer_mobile_number : item.customer_mobile_number
                    const leadUid = isQualifiedLead ? item.lead_uid : item.lead_uid
                    const assignedDate = isQualifiedLead ? item.created_at : item.ps_assigned_at
                    
                    return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="p-2 md:p-4">
                        <div className="space-y-0.5 md:space-y-1">
                          <div className="font-semibold text-gray-800 text-xs md:text-sm leading-tight">{customerName}</div>
                          <div className="text-xs md:text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{customerMobile}</span>
                          </div>
                          {activeTab !== 'fresh' && (
                            <>
                              <div className="text-xs text-gray-500 truncate">{leadUid}</div>
                              <div className="text-xs text-gray-500">{formatDate(assignedDate)}</div>
                            </>
                          )}
                          {isQualifiedLead && item.booking_id && (
                            <div className="text-xs text-blue-600 font-medium truncate">Booking ID: {item.booking_id}</div>
                          )}
                          {isQualifiedLead && item.retailed_id && (
                            <div className="text-xs text-green-600 font-medium truncate">Retail ID: {item.retailed_id}</div>
                          )}
                          {/* Show vehicle details on mobile */}
                          <div className="md:hidden mt-1 pt-1 border-t border-gray-100">
                            <div className="text-xs text-gray-600">{item.model_interested || '—'}</div>
                            <div className="text-xs text-gray-500">{item.variant || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 md:p-4 hidden md:table-cell">
                        <div className="space-y-0.5 md:space-y-1">
                          <div className="font-medium text-gray-800 text-xs md:text-sm">{item.model_interested || '—'}</div>
                          <div className="text-xs md:text-sm text-gray-600">{item.variant || '—'}</div>
                          <div className="text-xs text-gray-500">{item.buying_plan || '—'}</div>
                          <div className="text-xs text-gray-500">{item.finance_option || '—'}</div>
                        </div>
                      </td>
                      <td className="p-2 md:p-4">
                        <div className="space-y-1 md:space-y-2">
                          {isQualifiedLead ? (
                            <div className="space-y-0.5 md:space-y-1">
                              {item.booking_status && (
                                <Badge variant={item.booking_status === 'Approved' ? 'default' : item.booking_status === 'Rejected' ? 'destructive' : 'secondary'}>
                                  Booking: {item.booking_status}
                      </Badge>
                              )}
                              {item.retailed_status && (
                                <Badge variant={item.retailed_status === 'Approved' ? 'default' : item.retailed_status === 'Rejected' ? 'destructive' : 'secondary'}>
                                  Retail: {item.retailed_status}
                                </Badge>
                              )}
                      </div>
                          ) : (
                            <>
                              {getStatusBadge(item.final_status, item)}
                              {item.icrop_id && (
                                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                                  {item.icrop_id}
                      </Badge>
                              )}
                            </>
                          )}
                      </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {isQualifiedLead ? (
                            <div className="text-sm text-gray-500">
                              {item.booking_requested_at && (
                                <div>Booking: {formatDate(item.booking_requested_at)}</div>
                              )}
                              {item.retailed_requested_at && (
                                <div>Retail: {formatDate(item.retailed_requested_at)}</div>
                              )}
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-gray-700">Call #{getNextCallNumber(item)}</span>
                              <div className="text-xs text-gray-500">{formatDate(item.follow_up_date)}</div>
                              {activeTab === 'today' && (() => {
                                const overdueDays = getOverdueDays(item.follow_up_date)
                                return overdueDays > 0 && (
                                  <Badge variant="secondary" className="bg-red-600 text-white text-xs">
                                    Overdue: {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
                                  </Badge>
                                )
                              })()}
                            </>
                          )}
                      </div>
                      </td>
                      <td className="p-2 md:p-4">
                        {isQualifiedLead ? (
                          <div className="text-xs md:text-sm text-gray-500">
                            {item.booking_status === 'Waiting for Approval' && 'Waiting for SM approval'}
                            {item.retailed_status === 'Waiting for Approval' && 'Waiting for SM approval'}
                            {item.booking_status === 'Approved' && '✅ Booking Approved'}
                            {item.retailed_status === 'Approved' && '✅ Retail Approved'}
                            {item.booking_status === 'Rejected' && '❌ Booking Rejected'}
                            {item.retailed_status === 'Rejected' && '❌ Retail Rejected'}
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row gap-1 md:gap-2">
                            <button
                              onClick={() => openUpdateDialog(item)}
                              className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 border border-gray-200 hover:border-gray-300 whitespace-nowrap flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              Update
                            </button>
                            {item.final_status === 'Lost Requested' && (
                              <div className="text-xs text-orange-600 font-medium bg-orange-50 px-1 md:px-2 py-1 rounded whitespace-nowrap">
                                Awaiting CRE Approval
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
        </div>

          {/* Update Modal */}
        <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
            <DialogContent className="max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.08)] border-t-[3px] border-t-blue-600">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-1 rounded-t-[12px] -mt-[1px]"></div>

              <DialogHeader className="pb-4 pt-6 px-6">
                <DialogTitle className="text-[20px] font-bold text-gray-900">
                  Update Follow-up
                </DialogTitle>
            </DialogHeader>

              <div className="space-y-6">
                {/* Lead Information Grid */}
                {selectedFollowUp && (
                  <div className="px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl md:max-w-2xl">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Customer Name
                        </label>
                        <div className="text-sm font-medium text-gray-900">{selectedFollowUp.customer_name}</div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Mobile
                        </label>
                        <div className="text-sm font-medium text-gray-900">{selectedFollowUp.customer_mobile_number}</div>
                      </div>

                      {selectedFollowUp.model_interested && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            Model
                          </label>
                          <div className="text-sm font-medium text-gray-900">{selectedFollowUp.model_interested}</div>
                        </div>
                      )}

                      {selectedFollowUp.variant && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Settings className="w-3 h-3" />
                            Variant
                          </label>
                          <div className="text-sm font-medium text-gray-900">{selectedFollowUp.variant}</div>
                        </div>
                      )}

                      {selectedFollowUp.buying_plan && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Buying Plan
                          </label>
                          <div className="text-sm font-medium text-gray-900">{selectedFollowUp.buying_plan}</div>
                        </div>
                      )}

                      {selectedFollowUp.finance_option && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            Finance
                          </label>
                          <div className="text-sm font-medium text-gray-900">{selectedFollowUp.finance_option}</div>
                        </div>
                      )}

                      {extraLeadInfo?.profession && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            Profession
                          </label>
                          <div className="text-sm font-medium text-gray-900">{extraLeadInfo.profession}</div>
                        </div>
                      )}

                      {extraLeadInfo?.test_drive_type && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Test Drive
                          </label>
                          <div className="text-sm font-medium text-gray-900">{extraLeadInfo.test_drive_type}</div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          Trade-in
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{(extraLeadInfo?.trade_in || selectedFollowUp.trade_in) as string || 'No'}</span>
                          {(extraLeadInfo?.trade_in || selectedFollowUp.trade_in) === 'Yes' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTradeInLoading(true)
                                setTradeInOpen(true)
                                fetch(`/api/trade-in/${encodeURIComponent(selectedFollowUp.lead_uid)}`)
                                  .then(res => res.json())
                                  .then(data => {
                                    const tradeInInfo = data.trade_in_details || {}
                                    const combinedData = {
                                      ...tradeInInfo,
                                      customer_name: data.lead_master?.customer_name,
                                      customer_mobile_number: data.lead_master?.customer_mobile_number,
                                      trade_in: data.trade_in,
                                      profession: data.profession,
                                      test_drive_type: data.test_drive_type
                                    }
                                    setTradeInData(combinedData)
                                    setTradeInLoading(false)
                                  })
                                  .catch(err => {
                                    console.error('Error fetching trade-in details:', err)
                                    setTradeInLoading(false)
                                  })
                              }}
                              className="text-xs h-6 px-2 text-blue-600 border-blue-300 hover:bg-blue-50 rounded-md"
                            >
                              <span className="text-blue-600 text-sm mr-1">👁</span>
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Previous Calls */}
                {selectedFollowUp && (
                  <div className="px-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                      Previous Calls
                    </h3>
                    <div className="bg-[#fafafa] rounded-[8px] p-3 border border-gray-100">
                      {[
                        {remark: selectedFollowUp.first_call_remark, date: selectedFollowUp.first_call_date, status: selectedFollowUp.first_call_lead_status, num: 1},
                        {remark: selectedFollowUp.second_call_remark, date: selectedFollowUp.second_call_date, status: selectedFollowUp.second_call_lead_status, num: 2},
                        {remark: selectedFollowUp.third_call_remark, date: selectedFollowUp.third_call_date, status: selectedFollowUp.third_call_lead_status, num: 3},
                        {remark: selectedFollowUp.fourth_call_remark, date: selectedFollowUp.fourth_call_date, status: selectedFollowUp.fourth_call_lead_status, num: 4},
                        {remark: selectedFollowUp.fifth_call_remark, date: selectedFollowUp.fifth_call_date, status: selectedFollowUp.fifth_call_lead_status, num: 5},
                        {remark: selectedFollowUp.sixth_call_remark, date: selectedFollowUp.sixth_call_date, status: selectedFollowUp.sixth_call_lead_status, num: 6},
                        {remark: selectedFollowUp.seventh_call_remark, date: selectedFollowUp.seventh_call_date, status: selectedFollowUp.seventh_call_lead_status, num: 7},
                        {remark: selectedFollowUp.eighth_call_remark, date: selectedFollowUp.eighth_call_date, status: selectedFollowUp.eighth_call_lead_status, num: 8},
                        {remark: selectedFollowUp.ninth_call_remark, date: selectedFollowUp.ninth_call_date, status: selectedFollowUp.ninth_call_lead_status, num: 9},
                        {remark: selectedFollowUp.tenth_call_remark, date: selectedFollowUp.tenth_call_date, status: selectedFollowUp.tenth_call_lead_status, num: 10}
                      ].filter(call => call.remark).length > 0 ?
                        [
                          {remark: selectedFollowUp.first_call_remark, date: selectedFollowUp.first_call_date, status: selectedFollowUp.first_call_lead_status, num: 1},
                          {remark: selectedFollowUp.second_call_remark, date: selectedFollowUp.second_call_date, status: selectedFollowUp.second_call_lead_status, num: 2},
                          {remark: selectedFollowUp.third_call_remark, date: selectedFollowUp.third_call_date, status: selectedFollowUp.third_call_lead_status, num: 3},
                          {remark: selectedFollowUp.fourth_call_remark, date: selectedFollowUp.fourth_call_date, status: selectedFollowUp.fourth_call_lead_status, num: 4},
                          {remark: selectedFollowUp.fifth_call_remark, date: selectedFollowUp.fifth_call_date, status: selectedFollowUp.fifth_call_lead_status, num: 5},
                          {remark: selectedFollowUp.sixth_call_remark, date: selectedFollowUp.sixth_call_date, status: selectedFollowUp.sixth_call_lead_status, num: 6},
                          {remark: selectedFollowUp.seventh_call_remark, date: selectedFollowUp.seventh_call_date, status: selectedFollowUp.seventh_call_lead_status, num: 7},
                          {remark: selectedFollowUp.eighth_call_remark, date: selectedFollowUp.eighth_call_date, status: selectedFollowUp.eighth_call_lead_status, num: 8},
                          {remark: selectedFollowUp.ninth_call_remark, date: selectedFollowUp.ninth_call_date, status: selectedFollowUp.ninth_call_lead_status, num: 9},
                          {remark: selectedFollowUp.tenth_call_remark, date: selectedFollowUp.tenth_call_date, status: selectedFollowUp.tenth_call_lead_status, num: 10}
                        ].filter(call => call.remark).map((call, index) => (
                          <div key={index} className="text-sm py-2 border-b border-gray-200 last:border-b-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <div className="flex items-center gap-3 text-gray-600 min-w-0">
                              <span className="font-medium text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">#{call.num}</span>
                              <span className="text-xs">{call.date ? new Date(call.date).toLocaleDateString('en-IN') : ''}</span>
                              <span className="text-xs font-medium text-gray-800 bg-gray-100 px-2 py-1 rounded">{call.status}</span>
                            </div>
                            <span className="text-gray-700 text-sm leading-relaxed">{call.remark && call.remark.length > 50 ? call.remark.substring(0, 50) + '...' : call.remark}</span>
                          </div>
                        )) : (
                          <div className="text-sm text-gray-500 italic py-3 text-center">No previous calls recorded</div>
                        )
                      }
                    </div>
                  </div>
                )}

                {/* Current Call Form */}
                <div className="px-6 space-y-5">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Current Call
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Call Number */}
                    <div className="space-y-2">
                      <label htmlFor="call-number" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Call Number</label>
                      <Input
                        id="call-number"
                        placeholder={`Call #${getNextCallNumber(selectedFollowUp)}`}
                        value={`Call #${getNextCallNumber(selectedFollowUp)}`}
                        disabled
                        className="h-[44px] px-3 rounded-[8px] border border-[#e6e9ee] bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                      />
                    </div>

                    {/* Final Status */}
                    <div className="space-y-2">
                      <label htmlFor="final-status" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Final Status
                        {isFinalStatusLocked(callOutcome) && (
                          <span className="text-red-500 ml-1">🔒</span>
                        )}
                      </label>
                      <Select
                        value={finalStatus}
                        onValueChange={setFinalStatus}
                        disabled={isFinalStatusLocked(callOutcome)}
                      >
                        <SelectTrigger className={`h-[44px] px-3 rounded-[8px] border border-[#e6e9ee] text-sm focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ${isFinalStatusLocked(callOutcome) ? 'bg-gray-100 text-gray-600' : ''}`}>
                          <SelectValue placeholder="Select status" className="text-gray-400" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Waiting for Approval">Waiting for Approval</SelectItem>
                          <SelectItem value="Won">Won</SelectItem>
                          <SelectItem value="Lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Lead Status / Outcome */}
                  <div className="space-y-2">
                    <label htmlFor="lead-status" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead Status / Outcome</label>
                    <div className="flex flex-wrap gap-3">
                      <Select value={callOutcome} onValueChange={setCallOutcome}>
                        <SelectTrigger className="h-[44px] px-3 rounded-[8px] border border-[#e6e9ee] text-sm focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] flex-1 min-w-[200px]">
                          <SelectValue placeholder="Select Lead Status" className="text-gray-400" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            'Call not Connected',
                            'Retailed',
                            'Discount Issue',
                            'Delayed',
                            'Booked',
                            'Booked with another number',
                            'Test Drive',
                            'Planning in Next Month',
                            'Interested',
                            'Lost to Competition',
                            'Finance Rejected',
                            'Dropped',
                            'Lost to codealer',
                            'Busy on another call',
                            'RNR',
                            'Call me Back',
                            'Not Interested'
                          ].map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Order No. (Booking ID) - Show only for Booked status */}
                      {callOutcome === 'Booked' && (
                        <Input
                          value={bookingId}
                          onChange={(e) => {
                            let value = e.target.value.toUpperCase()
                            value = value.replace(/[^A-Z0-9]/g, '')
                            if (value && !value.startsWith('ORD')) {
                              value = 'ORD' + value.replace(/^ORD/, '')
                            }
                            if (value.startsWith('ORD')) {
                              const digits = value.substring(3).replace(/\D/g, '')
                              if (digits.length <= 9) {
                                value = 'ORD' + digits
                              } else {
                                value = 'ORD' + digits.substring(0, 9)
                              }
                            }
                            setBookingId(value)
                          }}
                          placeholder="ORD123456789"
                          className={`h-[44px] px-3 rounded-[8px] border text-sm focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] w-40 ${bookingId && bookingId.length !== 12 ? 'border-red-500' : 'border-[#e6e9ee]'}`}
                          required
                        />
                      )}

                      {/* DN No. (Retailed ID) - Show only for Retailed status */}
                      {callOutcome === 'Retailed' && (
                        <Input
                          value={retailedId}
                          onChange={(e) => {
                            let value = e.target.value.toUpperCase()
                            value = value.replace(/[^A-Z0-9]/g, '')
                            if (value && !value.startsWith('DNN')) {
                              value = 'DNN' + value.replace(/^DNN/, '')
                            }
                            if (value.startsWith('DNN')) {
                              const digits = value.substring(3).replace(/\D/g, '')
                              if (digits.length <= 9) {
                                value = 'DNN' + digits
                              } else {
                                value = 'DNN' + digits.substring(0, 9)
                              }
                            }
                            setRetailedId(value)
                          }}
                          placeholder="DNN123456789"
                          className={`h-[44px] px-3 rounded-[8px] border text-sm focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] w-40 ${retailedId && retailedId.length !== 12 ? 'border-red-500' : 'border-[#e6e9ee]'}`}
                          required
                        />
                      )}
                    </div>
                  </div>

                  {/* Call Remark */}
                  <div className="space-y-2">
                    <label htmlFor="call-remark" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Call Remark</label>
                    <Textarea
                      id="call-remark"
                      placeholder="Provide detailed information about the call outcome"
                      value={callRemark}
                      onChange={(e) => setCallRemark(e.target.value)}
                      rows={3}
                      className="px-3 py-2 rounded-[8px] border border-[#e6e9ee] text-sm resize-none focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] placeholder:text-gray-400"
                    />
                  </div>

                  {/* Next Follow-up Date */}
                  <div className="space-y-2">
                    <label htmlFor="follow-up-date" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Next Follow-up Date
                      {isFollowUpDateLocked(callOutcome) && (
                        <span className="text-red-500 ml-1">🔒</span>
                      )}
                    </label>
                    <div className="relative w-40 md:w-56">
                      <Input
                        id="follow-up-date"
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className={`h-[44px] px-3 pr-10 rounded-[8px] border border-[#e6e9ee] text-sm focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ${isFollowUpDateLocked(callOutcome) ? 'bg-gray-100 text-gray-600' : ''}`}
                        disabled={isFollowUpDateLocked(callOutcome)}
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-[18px] w-[18px] text-blue-600 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 px-6 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    onClick={() => setUpdateDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-[6px] transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateFollowUp}
                    className="px-6 py-2 rounded-[6px] bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 text-sm font-medium shadow-sm hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transform hover:scale-105 active:scale-95 border border-gray-200 hover:border-gray-300 flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Update Follow-up
                  </Button>
                </div>
              </div>
          </DialogContent>
        </Dialog>

          {/* Trade-in Details Modal */}
          <Dialog open={tradeInOpen} onOpenChange={setTradeInOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Car className="w-5 h-5 text-blue-600" />
                  Trade-in Details
                </DialogTitle>
                <DialogDescription>
                  View trade-in vehicle information
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {tradeInLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 text-sm">Loading trade-in details...</span>
                  </div>
                ) : tradeInData ? (
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-sm">
                        <Car className="h-4 w-4 text-blue-600" />
                        <span>Vehicle Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700 w-20">Make:</span>
                          <span className="text-gray-800">{tradeInData.trade_in_make || '—'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700 w-20">Model:</span>
                          <span className="text-gray-800">{tradeInData.trade_in_model || '—'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700 w-20">Year:</span>
                          <span className="text-gray-800">{tradeInData.trade_in_year || '—'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700 w-20">KM:</span>
                          <span className="text-gray-800">{tradeInData.trade_in_km || '—'}</span>
                        </div>
                        {tradeInData.trade_in_ownership && (
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-700 w-20">Owner:</span>
                            <span className="text-gray-800">{tradeInData.trade_in_ownership}</span>
                          </div>
                        )}
                      </div>

                      {/* Customer Information */}
                      {(tradeInData.customer_name || tradeInData.customer_mobile_number) && (
                        <div className="pt-3 border-t">
                          <div className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1">
                            <User className="w-4 h-4" />
                            Customer Info
                          </div>
                          <div className="space-y-2">
                            {tradeInData.customer_name && (
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-700 w-20">Name:</span>
                                <span className="text-gray-800">{tradeInData.customer_name}</span>
                              </div>
                            )}
                            {tradeInData.customer_mobile_number && (
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-700 w-20">Mobile:</span>
                                <span className="text-gray-800">{tradeInData.customer_mobile_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-8">
                    <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-gray-600 mb-1">No Trade-in Details</h3>
                    <p className="text-xs text-gray-500">Trade-in information not available for this lead.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setTradeInOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  )
}