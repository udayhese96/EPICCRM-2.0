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
  MapPin,
  Zap,
  Loader2
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
  const [todaySearch, setTodaySearch] = useState('')
  const [pendingStatusFilter, setPendingStatusFilter] = useState<'all'|'pending'|'booked'>('all')

  // Reset filters when switching tabs
  const handleTabChange = (tab: 'fresh'|'today'|'pending'|'booked'|'retailed'|'wonlost') => {
    setActiveTab(tab)
    setActiveSubTab('requested') // Reset sub-tab to 'requested' when switching main tabs
    
    // Reset filters based on tab
    if (tab === 'today') {
      setDateFilter('today')
      setStartDate('')
      setEndDate('')
      setTodaySearch('')
    } else if (tab === 'wonlost') {
      setDateFilter('all')
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
        const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
        const parsed = session ? JSON.parse(session) : null
        const token = parsed?.access_token || ''
        const timestamp = Date.now()
        const res = await fetch(`/api/trade-in/${encodeURIComponent(followUp.lead_uid)}?_t=${timestamp}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Cache-Control': 'no-store'
          }
        })
        const data = await res.json()
        if (res.ok) {
          const ti = (data?.trade_in_details || {}) as any
          const normalized = {
            make: ti.make || ti.trade_in_make || ti.tradeMake || '',
            model: ti.model || ti.trade_in_model || ti.tradeModel || '',
            year: ti.year || ti.trade_in_year || ti.tradeYear || '',
            kms_driven: ti.kms_driven || ti.km || ti.trade_in_km || ti.kms || '',
            ownership: ti.ownership || ti.trade_in_ownership || ''
          }
          setTradeInData((prev: any) => ({
            ...(prev || {}),
            ...normalized,
            customer_name: data.customer_name || data.lead_master?.customer_name || (ti?.customer_name || ''),
            customer_mobile_number: data.customer_mobile_number || data.lead_master?.customer_mobile_number || (ti?.customer_mobile_number || '')
          }))
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

  // Open Trade-in modal and fetch details for a given lead UID
  const openTradeInModal = (leadUid: string) => {
    setTradeInLoading(true)
    setTradeInOpen(true)
    const timestamp = Date.now()
    const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
    const parsed = session ? JSON.parse(session) : null
    const token = parsed?.access_token || ''
    fetch(`/api/trade-in/${encodeURIComponent(leadUid)}?_t=${timestamp}`, {
      headers: { 
        'Cache-Control': 'no-store',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    })
      .then(res => res.json())
      .then(data => {
        const ti = (data.trade_in_details || {}) as any
        const normalized = {
          make: ti.make || ti.trade_in_make || ti.tradeMake || '',
          model: ti.model || ti.trade_in_model || ti.tradeModel || '',
          year: ti.year || ti.trade_in_year || ti.tradeYear || '',
          kms_driven: ti.kms_driven || ti.km || ti.trade_in_km || ti.kms || '',
          ownership: ti.ownership || ti.trade_in_ownership || ''
        }
        const combinedData = {
          ...normalized,
          customer_name: data.customer_name || data.lead_master?.customer_name,
          customer_mobile_number: data.customer_mobile_number || data.lead_master?.customer_mobile_number,
          trade_in: data.trade_in,
          profession: data.profession,
          test_drive_type: data.test_drive_type
        }
        setTradeInData(combinedData)
        setTradeInLoading(false)
      })
      .catch(err => {
        console.error('Error fetching trade-in data:', err)
        setTradeInLoading(false)
        toast.error('Failed to fetch trade-in data')
      })
  }

  const getStatusBadge = (status: string, followUp?: PSFollowUp) => {
    switch (status?.toLowerCase()) {
      case 'won':
        return <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 font-medium px-3 py-1"><CheckCircle className="w-3 h-3 mr-1" />Won</Badge>
      case 'lost':
        return <Badge className="bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-0 font-medium px-3 py-1"><XCircle className="w-3 h-3 mr-1" />Lost</Badge>
      case 'lost requested':
        return <Badge className="bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />Lost Requested</Badge>
      case 'qualified':
        return <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-0 font-medium px-3 py-1"><Star className="w-3 h-3 mr-1" />Qualified</Badge>
      case 'pending':
        // Show temperature indicator for pending leads in pending tab
        if (activeTab === 'pending' && followUp) {
          const temperature = getPendingTemperature(followUp)
          switch (temperature) {
            case 'hot':
              return <Badge className="bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />🔥 Hot</Badge>
            case 'warm':
              return <Badge className="bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />🔥 Warm</Badge>
            case 'cold':
              return <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />❄️ Cold</Badge>
          }
        }
        return <Badge className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'hot':
        return <Badge className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-0 font-medium px-3 py-1">Hot</Badge>
      case 'warm':
        return <Badge className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 border-0 font-medium px-3 py-1">Warm</Badge>
      default:
        return <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-0 font-medium px-3 py-1">{status || 'Pending'}</Badge>
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
  // Today list should ignore global dateFilter and always be today + overdue
  const todayBaseList = followUps.filter(f => 
    !['won','lost'].includes((f.final_status || '').toLowerCase()) && 
    (isToday(f.follow_up_date) || isOverdue(f.follow_up_date))
  )
  // Apply search for today's list
  const todayListSearched = todayBaseList.filter(f => {
    if (!todaySearch.trim()) return true
    const q = todaySearch.toLowerCase()
    return (
      f.customer_name?.toLowerCase().includes(q) ||
      f.customer_mobile_number?.toLowerCase().includes(q) ||
      f.lead_uid?.toLowerCase().includes(q)
    )
  })
  const todayCount = todayBaseList.length
  
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
      case 'today': return todayListSearched
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
    <Card className={`${bgColor} border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={`text-3xl font-bold ${color.replace('border-l-', 'text-')}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <div className={`w-12 h-12 bg-gradient-to-br ${color.replace('border-l-', 'from-').replace('-500', '-100')} ${color.replace('border-l-', 'to-').replace('-500', '-200')} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <Icon className={`w-6 h-6 ${color.replace('border-l-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const TabButton = ({ id, label, count, icon: Icon, isActive, onClick }: any) => (
    <button
      onClick={() => onClick(id)}
      className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2 md:px-3 md:py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap min-w-0 flex-1 ${
        isActive
          ? 'bg-white/80 backdrop-blur-md text-orange-700 shadow-lg border border-white/20'
          : 'text-gray-600 hover:text-gray-800 hover:bg-white/40 hover:backdrop-blur-sm'
      }`}
      style={isActive ? {
        boxShadow: '0 8px 32px rgba(234, 88, 12, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
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
        isActive ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  )

  return (
    <DashboardLayout>
      {/* Modern Background */}
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100/20 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-orange-200/20 to-orange-300/20 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-to-br from-orange-100/30 to-orange-200/30 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-gradient-to-br from-orange-200/25 to-orange-300/25 rounded-full blur-lg"></div>
        </div>

        <div className="relative z-10 p-1 md:p-2">
          <div className="max-w-7xl mx-auto">
            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="fixed top-4 right-4 z-50 space-y-2">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-2xl shadow-xl border-l-4 backdrop-blur-sm ${
                      notification.type === 'approved' 
                        ? 'bg-green-50/90 border-green-500 text-green-800' 
                        : 'bg-red-50/90 border-red-500 text-red-800'
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
            
            {/* Modern Header */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-white tracking-tight">
                        GEM Dashboard
                      </h1>
                      <p className="text-orange-100 mt-1 font-medium">
                        Manage your assigned leads and follow-ups
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={loadFollowUps}
                    disabled={isLoading}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm font-medium px-6 py-2 rounded-xl transition-all duration-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Modern Stats Grid */}
            <div className="stats-grid grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total Assigned"
                value={stats.totalAssigned}
                description="All leads assigned to you"
                icon={User}
                color="border-l-blue-500"
                bgColor="bg-blue-50/80"
              />
              <StatCard
                title="Pending"
                value={stats.pending}
                description="Awaiting follow-up"
                icon={Clock}
                color="border-l-amber-500"
                bgColor="bg-amber-50/80"
              />
              <StatCard
                title="Won"
                value={stats.won}
                description="Successful conversions"
                icon={Trophy}
                color="border-l-green-500"
                bgColor="bg-green-50/80"
              />
              <StatCard
                title="Lost"
                value={stats.lost}
                description="Unsuccessful leads"
                icon={AlertCircle}
                color="border-l-red-500"
                bgColor="bg-red-50/80"
              />
            </div>

            {/* Modern Tabs */}
            <div className="relative bg-gradient-to-r from-orange-50/80 via-orange-100/80 to-orange-200/80 backdrop-blur-sm p-2 md:p-2 rounded-2xl mb-6 border border-white/30 shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-100/20 via-orange-200/20 to-orange-300/20 backdrop-blur-lg"></div>
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

            {/* Modern Leads Table */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
              <div className="relative bg-gradient-to-r from-orange-500/90 via-orange-600/90 to-orange-700/90 backdrop-blur-md text-white p-3 md:p-4 border-b border-white/20" style={{
                background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.95) 0%, rgba(251, 146, 60, 0.95) 50%, rgba(254, 215, 170, 0.95) 100%)',
                boxShadow: '0 8px 32px rgba(234, 88, 12, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
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
              {(activeTab === 'wonlost') && (
                <>
                        <div className="flex items-center gap-1 md:gap-2">
                    <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Filter:</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as 'today'|'all'|'range')}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
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
                        className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
                        placeholder="Select Date"
                      />
                      {startDate && (
                        <button
                          onClick={() => setStartDate('')}
                          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'today' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Search:</label>
                  <input
                    type="text"
                    value={todaySearch}
                    onChange={(e) => setTodaySearch(e.target.value)}
                    placeholder="Name, mobile or UID"
                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-[200px]"
                  />
                </div>
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
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
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
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
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
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
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
                        className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
                        placeholder="Select Date"
                      />
                      {startDate && (
                        <button
                          onClick={() => setStartDate('')}
                          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors whitespace-nowrap"
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
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-orange-50/30 transition-colors">
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
                                  <Badge className={`${item.booking_status === 'Approved' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' : item.booking_status === 'Rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700' : 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700'} border-0 font-medium px-3 py-1`}>
                                    Booking: {item.booking_status}
                        </Badge>
                                )}
                                {item.retailed_status && (
                                  <Badge className={`${item.retailed_status === 'Approved' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' : item.retailed_status === 'Rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700' : 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700'} border-0 font-medium px-3 py-1`}>
                                    Retail: {item.retailed_status}
                                  </Badge>
                                )}
                        </div>
                            ) : (
                              <>
                                {getStatusBadge(item.final_status, item)}
                                {item.icrop_id && (
                                  <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-0 font-medium px-3 py-1">
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
                                    <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 font-medium text-xs px-2 py-1">
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
                                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-3 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                Update
                              </button>
                              {item.final_status === 'Lost Requested' && (
                                <div className="text-xs text-orange-600 font-medium bg-orange-50 px-1 md:px-2 py-1 rounded-lg whitespace-nowrap">
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
                {filteredFollowUps.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="w-6 h-6 text-orange-400" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No leads found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or refresh the data</p>
                  </div>
                )}
              </div>
          </Card>

          {/* Update Modal */}
          <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
              <DialogContent className="max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-t-2xl -mt-[1px]"></div>

                <DialogHeader className="pb-4 pt-6 px-6">
                  <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
                    <Edit3 className="w-6 h-6 mr-3 text-orange-500" />
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
                            <button
                              type="button"
                              className="text-sm font-medium text-gray-900 underline decoration-dotted underline-offset-4 hover:text-orange-600"
                              onClick={() => {
                                if ((extraLeadInfo?.trade_in || selectedFollowUp.trade_in) === 'Yes') {
                                  openTradeInModal(selectedFollowUp.lead_uid)
                                }
                              }}
                            >
                              {(extraLeadInfo?.trade_in || selectedFollowUp.trade_in) as string || 'No'}
                            </button>
                            {(extraLeadInfo?.trade_in || selectedFollowUp.trade_in) === 'Yes' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTradeInModal(selectedFollowUp.lead_uid)}
                                className="text-xs px-2 py-1 rounded-lg border-orange-200 text-orange-600 hover:bg-orange-50"
                              >
                                <Car className="w-3 h-3 mr-1" />
                                View Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Call History Section */}
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2 text-orange-500" />
                          Call History
                        </h3>
                        <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-50/50 rounded-xl p-3">
                          {[
                            { remark: selectedFollowUp.first_call_remark, date: selectedFollowUp.first_call_date, status: selectedFollowUp.first_call_lead_status },
                            { remark: selectedFollowUp.second_call_remark, date: selectedFollowUp.second_call_date, status: selectedFollowUp.second_call_lead_status },
                            { remark: selectedFollowUp.third_call_remark, date: selectedFollowUp.third_call_date, status: selectedFollowUp.third_call_lead_status },
                            { remark: selectedFollowUp.fourth_call_remark, date: selectedFollowUp.fourth_call_date, status: selectedFollowUp.fourth_call_lead_status },
                            { remark: selectedFollowUp.fifth_call_remark, date: selectedFollowUp.fifth_call_date, status: selectedFollowUp.fifth_call_lead_status },
                            { remark: selectedFollowUp.sixth_call_remark, date: selectedFollowUp.sixth_call_date, status: selectedFollowUp.sixth_call_lead_status },
                            { remark: selectedFollowUp.seventh_call_remark, date: selectedFollowUp.seventh_call_date, status: selectedFollowUp.seventh_call_lead_status },
                            { remark: selectedFollowUp.eighth_call_remark, date: selectedFollowUp.eighth_call_date, status: selectedFollowUp.eighth_call_lead_status },
                            { remark: selectedFollowUp.ninth_call_remark, date: selectedFollowUp.ninth_call_date, status: selectedFollowUp.ninth_call_lead_status },
                            { remark: selectedFollowUp.tenth_call_remark, date: selectedFollowUp.tenth_call_date, status: selectedFollowUp.tenth_call_lead_status }
                          ]
                            .filter(call => call.remark)
                            .map((call, index) => (
                              <div key={index} className="text-xs bg-white rounded-lg p-2 border border-gray-200/50">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-semibold text-gray-700">Call #{index + 1}</span>
                                  <span className="text-gray-500">{call.date ? formatDate(call.date) : ''}</span>
                                </div>
                                <div className="text-gray-600 mb-1">{call.remark}</div>
                                {call.status && (
                                  <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-0 font-medium text-xs px-2 py-0.5">
                                    {call.status}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          {![
                            selectedFollowUp.first_call_remark,
                            selectedFollowUp.second_call_remark,
                            selectedFollowUp.third_call_remark,
                            selectedFollowUp.fourth_call_remark,
                            selectedFollowUp.fifth_call_remark,
                            selectedFollowUp.sixth_call_remark,
                            selectedFollowUp.seventh_call_remark,
                            selectedFollowUp.eighth_call_remark,
                            selectedFollowUp.ninth_call_remark,
                            selectedFollowUp.tenth_call_remark
                          ].some(remark => remark) && (
                            <div className="text-center text-xs text-gray-500 py-2">
                              No call history available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Update Form */}
                  <div className="px-6 space-y-6">
                    <div>
                      <Label htmlFor="callRemark" className="text-sm font-semibold text-gray-700 mb-2 block flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Call Remark (Call #{getNextCallNumber(selectedFollowUp)})
                      </Label>
                      <Textarea
                        id="callRemark"
                        value={callRemark}
                        onChange={(e) => setCallRemark(e.target.value)}
                        placeholder="Enter your call remarks..."
                        className="min-h-[80px] rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 resize-none"
                      />
                    </div>

                    <div>
                      <Label htmlFor="callOutcome" className="text-sm font-semibold text-gray-700 mb-2 block">
                        Call Outcome
                      </Label>
                      <Select value={callOutcome} onValueChange={setCallOutcome}>
                        <SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                          <SelectValue placeholder="Select call outcome" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-0 shadow-lg">
                          <SelectItem value="Hot">🔥 Hot</SelectItem>
                          <SelectItem value="Warm">🔥 Warm</SelectItem>
                          <SelectItem value="Cold">❄️ Cold</SelectItem>
                          <SelectItem value="Booked">✅ Booked</SelectItem>
                          <SelectItem value="Retailed">🛍️ Retailed</SelectItem>
                          <SelectItem value="Lost to Competition">❌ Lost to Competition</SelectItem>
                          <SelectItem value="Lost to codealer">❌ Lost to codealer</SelectItem>
                          <SelectItem value="Dropped">❌ Dropped</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Booking/Retailed ID Input */}
                    {isLeadWon(callOutcome) && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                        {callOutcome === 'Booked' && (
                          <div>
                            <Label htmlFor="bookingId" className="text-sm font-semibold text-green-700 mb-2 block flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Order Number (ORD + 9 digits)
                            </Label>
                            <Input
                              id="bookingId"
                              value={bookingId}
                              onChange={(e) => setBookingId(e.target.value.toUpperCase())}
                              placeholder="e.g., ORD123456789"
                              className="rounded-xl border-green-200 focus:border-green-500 focus:ring-green-500/20"
                              maxLength={12}
                            />
                            <p className="text-xs text-green-600 mt-1">
                              Format: ORD followed by exactly 9 digits
                            </p>
                          </div>
                        )}

                        {callOutcome === 'Retailed' && (
                          <div>
                            <Label htmlFor="retailedId" className="text-sm font-semibold text-green-700 mb-2 block flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              DN Number (DNN + 9 digits)
                            </Label>
                            <Input
                              id="retailedId"
                              value={retailedId}
                              onChange={(e) => setRetailedId(e.target.value.toUpperCase())}
                              placeholder="e.g., DNN123456789"
                              className="rounded-xl border-green-200 focus:border-green-500 focus:ring-green-500/20"
                              maxLength={12}
                            />
                            <p className="text-xs text-green-600 mt-1">
                              Format: DNN followed by exactly 9 digits
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Follow-up Date */}
                    {!isFollowUpDateLocked(callOutcome) && (
                      <div>
                        <Label htmlFor="followUpDate" className="text-sm font-semibold text-gray-700 mb-2 block flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Next Follow-up Date
                        </Label>
                        <Input
                          id="followUpDate"
                          type="datetime-local"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                        />
                      </div>
                    )}

                    {/* Status warnings */}
                    {isLeadWon(callOutcome) && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center text-blue-700">
                          <Info className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">
                            This lead will be sent to Sales Manager for approval
                          </span>
                        </div>
                      </div>
                    )}

                    {isLeadLost(callOutcome) && (
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center text-orange-700">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">
                            Lost status request will be sent to CRE for approval
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/30">
                    <Button
                      variant="outline"
                      onClick={() => setUpdateDialog(false)}
                      className="px-6 py-2 rounded-xl border-gray-200 hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateFollowUp}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Update Follow-up
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Trade-in Details Modal */}
            <Dialog open={tradeInOpen} onOpenChange={setTradeInOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-t-2xl -mt-[1px]"></div>
                
                <DialogHeader className="pb-4 pt-6 px-6">
                  <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
                    <Car className="w-6 h-6 mr-3 text-orange-500" />
                    Trade-in Vehicle Details
                  </DialogTitle>
                </DialogHeader>

                <div className="px-6 pb-6">
                  {tradeInLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                      <span className="ml-3 text-gray-600">Loading trade-in details...</span>
                    </div>
                  ) : tradeInData ? (
                    <div className="space-y-6">
                      {/* Customer Information */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Customer Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoLine label="Customer Name" value={tradeInData.customer_name || selectedFollowUp?.customer_name} />
                          <InfoLine label="Mobile Number" value={tradeInData.customer_mobile_number || selectedFollowUp?.customer_mobile_number} />
                          <InfoLine label="Profession" value={tradeInData.profession} />
                          <InfoLine label="Test Drive Type" value={tradeInData.test_drive_type} />
                        </div>
                      </div>

                      {/* Vehicle Details */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Trade-in Vehicle</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoLine label="Make" value={tradeInData.make} />
                          <InfoLine label="Model" value={tradeInData.model} />
                          <InfoLine label="Year" value={tradeInData.year} />
                          <InfoLine label="KMs Driven" value={tradeInData.kms_driven} />
                          <InfoLine label="Ownership" value={tradeInData.ownership} />
                        </div>
                      </div>

                      {/* Additional Information */}
                      {(tradeInData.additional_info || tradeInData.condition_notes) && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Information</h3>
                          <div className="space-y-2">
                            {tradeInData.additional_info && (
                              <InfoLine label="Additional Info" value={tradeInData.additional_info} />
                            )}
                            {tradeInData.condition_notes && (
                              <InfoLine label="Condition Notes" value={tradeInData.condition_notes} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Car className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No trade-in details found</p>
                    </div>
                  )}

                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={() => setTradeInOpen(false)}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

