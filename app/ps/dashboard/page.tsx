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
  Edit3
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

  const loadFollowUps = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ps-followup', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      })
      if (response.ok) {
        const data = await response.json()
        console.log('PS Follow-ups loaded:', data)
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/api/qualified-leads`, {
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

  // Fresh leads: Leads that have never been updated (no call remarks)
  const freshList = followUps.filter(f => !hasBeenUpdated(f) && ((f.final_status || '').toLowerCase() !== 'lost'))
  const freshCount = freshList.length
  
  // Today's follow-ups: Leads with follow-up dates for today or overdue
  // Today's follow-ups: Leads scheduled for today (including overdue, excluding won/lost)
  const todayList = applyDateFilter(followUps.filter(f => 
    !['won','lost'].includes((f.final_status || '').toLowerCase()) && 
    (isToday(f.follow_up_date) || (() => {
      const followUpDate = f.follow_up_date ? (f.follow_up_date.includes('T') ? f.follow_up_date.slice(0,10) : f.follow_up_date) : ""
      const today = new Date().toISOString().slice(0,10)
      return followUpDate && followUpDate < today
    })())
  ))
  const todayCount = todayList.length
  
  // Pending leads: Leads with final_status = 'pending' or 'booked' (excluding fresh leads and won/lost)
  const pendingList = applyPendingFilter(applyPendingStatusFilter(applyDateFilter(followUps.filter(f => 
    !['won','lost'].includes((f.final_status || '').toLowerCase()) &&
    (['pending', 'booked'].includes((f.final_status || '').toLowerCase())) && hasBeenUpdated(f)
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
    <div className={`${bgColor} rounded-2xl p-6 border-l-4 ${color} transition-all hover:shadow-lg hover:scale-105 duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-3xl font-bold ${color.replace('border-l-', 'text-')} mb-2`}>
            {value}
          </div>
          <div className="text-gray-800 font-semibold text-lg mb-1">{title}</div>
          <div className="text-gray-600 text-sm">{description}</div>
        </div>
        <Icon className={`w-12 h-12 ${color.replace('border-l-', 'text-')} opacity-20`} />
      </div>
    </div>
  )

  const TabButton = ({ id, label, count, icon: Icon, isActive, onClick }: any) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
        isActive
          ? 'bg-white text-blue-600 shadow-md'
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <span className={`px-2 py-1 rounded-full text-xs ${
        isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
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
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
              <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">GEM Dashboard</h1>
              <p className="text-gray-600 text-lg">Manage your assigned leads and follow-ups</p>
              </div>
          <Button 
            onClick={loadFollowUps} 
            disabled={isLoading}
              className="mt-4 md:mt-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Refresh Data'}
              </Button>
        </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          <div className="bg-gray-100 p-2 rounded-xl mb-6 overflow-x-auto">
            <div className="flex gap-2">
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
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Star className="w-5 h-5" />
                {activeTab === 'fresh' && 'Fresh Leads'}
                {activeTab === 'today' && 'Today\'s Follow-ups'}
                {activeTab === 'pending' && 'Pending Leads'}
                {activeTab === 'booked' && 'Booked Approval'}
                {activeTab === 'retailed' && 'Retailed Approval'}
                {activeTab === 'wonlost' && 'Won/Lost Leads'}
              </h2>
              <p className="text-gray-300 text-sm mt-1">
                {activeTab === 'fresh' && 'Leads newly assigned to you'}
                {activeTab === 'today' && 'Leads with follow-up scheduled for today (including overdue)'}
                {activeTab === 'pending' && 'Leads with final status Pending'}
                {activeTab === 'booked' && 'Booked leads approval status'}
                {activeTab === 'retailed' && 'Retailed leads approval status'}
                {activeTab === 'wonlost' && 'Leads that are won or lost'}
              </p>
              
              {/* Subsection tabs for booked and retailed */}
              {(activeTab === 'booked' || activeTab === 'retailed') && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setActiveSubTab('requested')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeSubTab === 'requested' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Requested ({activeTab === 'booked' ? bookedRequestedList.length : retailedRequestedList.length})
          </button>
                  <button
                    onClick={() => setActiveSubTab('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeSubTab === 'approved' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Approved ({activeTab === 'booked' ? bookedApprovedList.length : retailedApprovedList.length})
          </button>
                  <button
                    onClick={() => setActiveSubTab('rejected')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeSubTab === 'rejected' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Rejected ({activeTab === 'booked' ? bookedRejectedList.length : retailedRejectedList.length})
          </button>
                </div>
              )}
        </div>

        {/* Filters Section */}
        <div className="bg-gray-50 p-4 border-b">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Date Range Filters for Today, Won/Lost sections */}
            {(activeTab === 'today' || activeTab === 'wonlost') && (
              <>
                      <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter:</label>
                  <select 
                    value={dateFilter} 
                    onChange={(e) => setDateFilter(e.target.value as 'today'|'all'|'range')}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="today">Today</option>
                    <option value="all">All Time</option>
                    <option value="range">Date Range</option>
                  </select>
                      </div>

                {dateFilter === 'range' && (
                      <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Select Date"
                    />
                    {startDate && (
                      <button
                        onClick={() => setStartDate('')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
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
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Lead Category:</label>
                  <select 
                    value={pendingFilter} 
                    onChange={(e) => setPendingFilter(e.target.value as 'all'|'hot'|'warm'|'cold')}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All</option>
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">🔥 Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>

                {/* Final Status Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Final Status:</label>
                  <select 
                    value={pendingStatusFilter} 
                    onChange={(e) => setPendingStatusFilter(e.target.value as 'all'|'pending'|'booked')}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="booked">Booked</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Date Filter:</label>
                  <select 
                    value={dateFilter} 
                    onChange={(e) => setDateFilter(e.target.value as 'today'|'all'|'range')}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="today">Today</option>
                    <option value="all">All Time</option>
                    <option value="range">Date Range</option>
                  </select>
                </div>

                {dateFilter === 'range' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Select Date"
                    />
                    {startDate && (
                      <button
                        onClick={() => setStartDate('')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Show current filter status */}
            <div className="ml-auto text-sm text-gray-600">
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
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-4 font-semibold text-gray-700">Lead Info</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Vehicle Details</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Next Call</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
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
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-800">{customerName}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customerMobile}
                          </div>
                          <div className="text-xs text-gray-500">{leadUid}</div>
                          <div className="text-xs text-gray-500">{formatDate(assignedDate)}</div>
                          {isQualifiedLead && item.booking_id && (
                            <div className="text-xs text-blue-600 font-medium">Booking ID: {item.booking_id}</div>
                          )}
                          {isQualifiedLead && item.retailed_id && (
                            <div className="text-xs text-green-600 font-medium">Retail ID: {item.retailed_id}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-800">{item.model_interested || '—'}</div>
                          <div className="text-sm text-gray-600">{item.variant || '—'}</div>
                          <div className="text-xs text-gray-500">{item.buying_plan || '—'}</div>
                          <div className="text-xs text-gray-500">{item.finance_option || '—'}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-2">
                          {isQualifiedLead ? (
                            <div className="space-y-1">
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
                              {/* Overdue badge only shows in today's follow-up section */}
                              {activeTab === 'today' && (() => {
                                const followUpDate = item.follow_up_date ? (item.follow_up_date.includes('T') ? item.follow_up_date.slice(0,10) : item.follow_up_date) : ""
                                const today = new Date().toISOString().slice(0,10)
                                const overdueDays = followUpDate && followUpDate < today ? Math.ceil((Date.now() - new Date(followUpDate + 'T00:00:00').getTime())/86400000) : 0
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
                      <td className="p-4">
                        {isQualifiedLead ? (
                          <div className="text-sm text-gray-500">
                            {item.booking_status === 'Waiting for Approval' && 'Waiting for SM approval'}
                            {item.retailed_status === 'Waiting for Approval' && 'Waiting for SM approval'}
                            {item.booking_status === 'Approved' && '✅ Booking Approved'}
                            {item.retailed_status === 'Approved' && '✅ Retail Approved'}
                            {item.booking_status === 'Rejected' && '❌ Booking Rejected'}
                            {item.retailed_status === 'Rejected' && '❌ Retail Rejected'}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openUpdateDialog(item)}
                              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-md transition-all duration-200 hover:scale-105"
                            >
                              Update
                            </button>
                            {item.final_status === 'Lost Requested' && (
                              <div className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
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
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Update Follow-up - {selectedFollowUp?.lead_uid}
                </DialogTitle>
                <DialogDescription>
                  Update follow-up information and status
                </DialogDescription>
            </DialogHeader>

              <div className="space-y-3">
                {/* Lead and Customer Information - Ultra Compact */}
              {selectedFollowUp && (
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">UID:</span>
                      <span className="text-gray-900 ml-2">{selectedFollowUp.lead_uid}</span>
                  </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Customer:</span>
                      <span className="text-gray-900 ml-2">{selectedFollowUp.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Mobile:</span>
                      <span className="text-gray-900 ml-2">{selectedFollowUp.customer_mobile_number}</span>
                    </div>
                    {selectedFollowUp.model_interested && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Model:</span>
                        <span className="text-gray-900 text-xs ml-2">{selectedFollowUp.model_interested}</span>
                      </div>
                    )}
                    {selectedFollowUp.variant && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Variant:</span>
                        <span className="text-gray-900 ml-2">{selectedFollowUp.variant}</span>
                      </div>
                    )}
                    {selectedFollowUp.buying_plan && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Plan:</span>
                        <span className="text-gray-900 ml-2">{selectedFollowUp.buying_plan}</span>
                      </div>
                    )}
                    {selectedFollowUp.finance_option && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Finance:</span>
                        <span className="text-gray-900 ml-2">{selectedFollowUp.finance_option}</span>
                      </div>
                    )}
                    {selectedFollowUp.icrop_id && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">ICROP:</span>
                        <span className="text-gray-900 ml-2">{selectedFollowUp.icrop_id}</span>
                      </div>
                    )}
                    {extraLeadInfo?.profession && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Profession:</span>
                        <span className="text-gray-900 ml-2">{extraLeadInfo.profession}</span>
                      </div>
                    )}
                    {extraLeadInfo?.test_drive_type && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Test Drive:</span>
                        <span className="text-gray-900 ml-2">{extraLeadInfo.test_drive_type}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600">Trade-in:</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-900 ml-2">{(extraLeadInfo?.trade_in || selectedFollowUp.trade_in) as string || 'No'}</span>
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
                            className="text-xs h-4 px-1 bg-gray-100 hover:bg-gray-200"
                          >
                            View
                      </Button>
                        )}
                              </div>
                    </div>
                  </div>
                )}

                {/* Previous Calls - Ultra Compact */}
                {selectedFollowUp && (
                  <div className="space-y-1 text-xs">
                    <div className="font-medium text-gray-700 mb-1">Previous Calls:</div>
                    <div className="space-y-0.5 text-gray-600">
                      {selectedFollowUp.first_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 1:</span>
                          <span>{(selectedFollowUp.first_call_date || '').slice(0,10)} · {selectedFollowUp.first_call_remark}</span>
                          </div>
                      )}
                      {selectedFollowUp.second_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 2:</span>
                          <span>{(selectedFollowUp.second_call_date || '').slice(0,10)} · {selectedFollowUp.second_call_remark}</span>
                    </div>
                  )}
                      {selectedFollowUp.third_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 3:</span>
                          <span>{(selectedFollowUp.third_call_date || '').slice(0,10)} · {selectedFollowUp.third_call_remark}</span>
                        </div>
                      )}
                      {selectedFollowUp.fourth_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 4:</span>
                          <span>{(selectedFollowUp.fourth_call_date || '').slice(0,10)} · {selectedFollowUp.fourth_call_remark}</span>
                        </div>
                      )}
                      {selectedFollowUp.fifth_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 5:</span>
                          <span>{(selectedFollowUp.fifth_call_date || '').slice(0,10)} · {selectedFollowUp.fifth_call_remark}</span>
                        </div>
                      )}
                      {selectedFollowUp.sixth_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 6:</span>
                          <span>{(selectedFollowUp.sixth_call_date || '').slice(0,10)} · {selectedFollowUp.sixth_call_remark}</span>
                        </div>
                      )}
                      {selectedFollowUp.seventh_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 7:</span>
                          <span>{(selectedFollowUp.seventh_call_date || '').slice(0,10)} · {selectedFollowUp.seventh_call_remark}</span>
                        </div>
                      )}
                      {selectedFollowUp.eighth_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 8:</span>
                          <span>{(selectedFollowUp.eighth_call_date || '').slice(0,10)} · {selectedFollowUp.eighth_call_remark}</span>
                        </div>
                      )}
                      {selectedFollowUp.ninth_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 9:</span>
                          <span>{(selectedFollowUp.ninth_call_date || '').slice(0,10)} · {selectedFollowUp.ninth_call_remark}</span>
                        </div>
                      )}
                      {selectedFollowUp.tenth_call_remark && (
                        <div className="flex justify-between">
                          <span>Call 10:</span>
                          <span>{(selectedFollowUp.tenth_call_date || '').slice(0,10)} · {selectedFollowUp.tenth_call_remark}</span>
                        </div>
                      )}
                    </div>
                </div>
              )}
              
                {/* Follow-up Entry Section - Ultra Compact */}
                <div className="space-y-2">
                  {/* Call Number */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">Call Number</Label>
                    <Input 
                      value={`Call #${getNextCallNumber(selectedFollowUp)}`}
                      disabled
                      className="bg-gray-50 h-7 text-xs"
                    />
          </div>

                  {/* Lead Status / Outcome */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">Lead Status / Outcome</Label>
                    <div className="flex gap-2">
                <Select value={callOutcome} onValueChange={setCallOutcome}>
                        <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select Lead Status" />
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
                            
                            // Remove any non-alphanumeric characters except ORD
                            value = value.replace(/[^A-Z0-9]/g, '')
                            
                            // Ensure it starts with ORD
                            if (value && !value.startsWith('ORD')) {
                              value = 'ORD' + value.replace(/^ORD/, '')
                            }
                            
                            // Limit to ORD + exactly 9 digits
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
                          className={`h-7 text-xs w-32 ${bookingId && bookingId.length !== 12 ? 'border-red-500' : ''}`}
                          required
                        />
                      )}
                      
                      {/* DN No. (Retailed ID) - Show only for Retailed status */}
                      {callOutcome === 'Retailed' && (
                        <Input 
                          value={retailedId}
                          onChange={(e) => {
                            let value = e.target.value.toUpperCase()
                            
                            // Remove any non-alphanumeric characters except DNN
                            value = value.replace(/[^A-Z0-9]/g, '')
                            
                            // Ensure it starts with DNN
                            if (value && !value.startsWith('DNN')) {
                              value = 'DNN' + value.replace(/^DNN/, '')
                            }
                            
                            // Limit to DNN + exactly 9 digits
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
                          className={`h-7 text-xs w-32 ${retailedId && retailedId.length !== 12 ? 'border-red-500' : ''}`}
                          required
                        />
                      )}
                    </div>
              </div>

                  {/* Call Remark */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">Call Remark</Label>
                <Textarea
                      placeholder="Enter call details..."
                  value={callRemark}
                  onChange={(e) => setCallRemark(e.target.value)}
                      rows={2}
                      className="text-xs resize-none"
                />
          </div>

                  {/* Next Follow-up Date */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Next Follow-up Date
                      {isFollowUpDateLocked(callOutcome) && (
                        <span className="text-red-500 ml-1">🔒</span>
                      )}
                    </Label>
                  <Input 
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                      className={`h-7 text-xs ${isFollowUpDateLocked(callOutcome) ? 'bg-gray-100 text-gray-600' : ''}`}
                      disabled={isFollowUpDateLocked(callOutcome)}
                />
              </div>


                  {/* Final Status */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Final Status
                      {isFinalStatusLocked(callOutcome) && (
                        <span className="text-red-500 ml-1">🔒</span>
                      )}
                    </Label>
                    <Select 
                      value={finalStatus} 
                      onValueChange={setFinalStatus}
                      disabled={isFinalStatusLocked(callOutcome)}
                    >
                      <SelectTrigger className={`h-7 text-xs ${isFinalStatusLocked(callOutcome) ? 'bg-gray-100 text-gray-600' : ''}`}>
                    <SelectValue placeholder="Select status" />
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

                {/* Action Buttons - Ultra Compact */}
                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setUpdateDialog(false)}
                    className="h-7 px-3 text-xs"
                  >
                  Cancel
                </Button>
                  <Button 
                    onClick={handleUpdateFollowUp}
                    className="bg-gray-900 hover:bg-black text-white h-7 px-3 text-xs"
                  >
                    Update
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