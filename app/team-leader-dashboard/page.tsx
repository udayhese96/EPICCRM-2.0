"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { RoleGuard } from '@/components/auth/role-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Phone, 
  Target,
  Activity,
  UserCheck,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PhoneCall,
  Mail,
  MapPin,
  Building,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MessageSquare,
  TrendingUpDown,
  RefreshCw,
  Info,
  Pencil,
  Search,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface PSUser {
  id: string
  username: string
  full_name: string
  email: string
  branch: string
  team_leader_id?: string
}

interface Lead {
  id: string
  lead_uid: string
  customer_name: string
  customer_mobile_number: string
  customer_email?: string
  source: string
  subsource?: string
  lead_status: string
  final_status?: string
  created_at: string
  updated_at?: string
  assigned_cre_id?: string
  city?: string
  state?: string
  budget?: number
  remarks?: string
  model_interested?: string
  follow_up_date?: string
  ps_assigned_at?: string
  icrop_id?: string
}

interface TeamPerformanceData {
  total_leads: number
  new_leads: number
  qualified_leads: number
  closed_won: number
  closed_lost: number
  conversion_rate: number
  call_volume: number
  avg_response_time: number
}

interface PSIndividualPerformance {
  ps_user: PSUser
  metrics: TeamPerformanceData
  leads?: Lead[]
  recent_activities: Array<{
    id: string
    type: string
    description: string
    created_at: string
  }>
}

interface LeadSourceData {
  source: string
  count: number
  percentage: number
}

interface LeadStatusData {
  status: string
  count: number
  percentage: number
  color: string
}


// Tab-specific data cache interface
interface TabDataCache {
  [tabId: string]: {
    data: any[]
    lastFetched: number
    filters: {
      dateRange: string
      selectedPS: string
    }
    isLoading: boolean
    isLoadingMore: boolean
    hasMore: boolean
    totalCount: number
    currentPage: number
    searchTerm?: string
    scrollPosition?: number
  }
}

export default function TeamLeaderDashboard() {
  const [assignedPS, setAssignedPS] = useState<PSUser[]>([])
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceData | null>(null)
  const [individualPerformance, setIndividualPerformance] = useState<PSIndividualPerformance[]>([])
  const [selectedPS, setSelectedPS] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>('analytics')
  
  // Tab-specific data cache
  const [tabDataCache, setTabDataCache] = useState<TabDataCache>({})
  
  // Modal states
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false)
  const [selectedPSDetail, setSelectedPSDetail] = useState<PSIndividualPerformance | null>(null)
  const [isPSDetailOpen, setIsPSDetailOpen] = useState(false)
  
  // Chart data
  const [leadSourceData, setLeadSourceData] = useState<LeadSourceData[]>([])
  const [leadStatusData, setLeadStatusData] = useState<LeadStatusData[]>([])
  
  // Analytics KPI data
  const [analyticsData, setAnalyticsData] = useState<{
    totalLeadsAssigned: number
    openLeads: number
    wonLeads: number
    lostLeads: number
  }>({
    totalLeadsAssigned: 0,
    openLeads: 0,
    wonLeads: 0,
    lostLeads: 0
  })
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Read current user id (sales TL) from localStorage once on mount
  useEffect(() => {
    try {
      const supabaseUserRaw = typeof window !== 'undefined' ? localStorage.getItem('supabase_user') : null
      
      if (supabaseUserRaw) {
        const u = JSON.parse(supabaseUserRaw)
        if (u?.id) {
          setCurrentUserId(u.id as string)
        } else {
          console.warn('[TL-Dashboard] supabase_user found but no id field:', u)
          setIsLoading(false) // Stop loading if no valid user found
        }
      } else {
        const legacyUserRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (legacyUserRaw) {
          const u = JSON.parse(legacyUserRaw)
          if (u?.id) {
            setCurrentUserId(u.id as string)
          } else {
            console.warn('[TL-Dashboard] legacy user found but no id field:', u)
            setIsLoading(false) // Stop loading if no valid user found
          }
        } else {
          console.warn('[TL-Dashboard] No user found in localStorage')
          setIsLoading(false) // Stop loading if no user found
        }
      }
    } catch (err) {
      console.error('[TL-Dashboard] Error loading user from localStorage:', err)
      setIsLoading(false) // Stop loading on error
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!currentUserId) {
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        // Fetch PS users filtered by team_leader_id
        const resp = await fetch(`/api/users?role=ps&_=${Date.now()}`, { 
          cache: 'no-store' as any 
        })
        
        if (!resp.ok) {
          console.error('[TL-Dashboard] /api/users?role=ps failed', resp.status)
          throw new Error('Failed to fetch PS users')
        }
        
        const data = await resp.json()
        const users: PSUser[] = data?.users || []
        setAssignedPS(users)

        if (users.length === 0) {
          console.warn('[TL-Dashboard] No PS users assigned to this TL')
          setTeamPerformance({
            total_leads: 0, new_leads: 0, qualified_leads: 0, closed_won: 0,
            closed_lost: 0, conversion_rate: 0, call_volume: 0,  avg_response_time: 0
          })
          setIsLoading(false)
          return
        }

        // Stop loading
        setIsLoading(false)
        return

      } catch (e) {
        console.error('[TL-Dashboard] Error loading dashboard:', e)
        setTeamPerformance({
          total_leads: 0, new_leads: 0, qualified_leads: 0, closed_won: 0,
          closed_lost: 0, conversion_rate: 0, call_volume: 0,  avg_response_time: 0
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    if (currentUserId) {
      load()
    }
  }, [currentUserId, dateRange])

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[TL-Dashboard] Loading timeout reached, stopping loading')
        setIsLoading(false)
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading])

  const filteredPerformance = selectedPS === 'all' 
    ? individualPerformance 
    : individualPerformance.filter(p => p.ps_user.id === selectedPS)

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setIsLeadDetailOpen(true)
  }

  const handleViewPSDetail = (psPerf: PSIndividualPerformance) => {
    setSelectedPSDetail(psPerf)
    setIsPSDetailOpen(true)
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('won') || statusLower.includes('closed won')) return 'bg-green-100 text-green-800 border-green-200'
    if (statusLower.includes('lost') || statusLower.includes('closed lost')) return 'bg-red-100 text-red-800 border-red-200'
    if (statusLower.includes('qualified') || statusLower.includes('interested')) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (statusLower.includes('new') || statusLower.includes('fresh')) return 'bg-purple-100 text-purple-800 border-purple-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusColorForChart = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('won') || statusLower.includes('closed won')) return '#10b981' // green-500
    if (statusLower.includes('lost') || statusLower.includes('closed lost')) return '#ef4444' // red-500
    if (statusLower.includes('qualified') || statusLower.includes('interested')) return '#3b82f6' // blue-500
    if (statusLower.includes('new') || statusLower.includes('fresh')) return '#8b5cf6' // purple-500
    return '#6b7280' // gray-500
  }

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('won')) return <CheckCircle2 className="h-4 w-4" />
    if (statusLower.includes('lost')) return <XCircle className="h-4 w-4" />
    if (statusLower.includes('qualified')) return <Target className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  // Tab-specific data fetching functions
  const fetchTabData = useCallback(async (tabId: string, forceRefresh = false) => {
    if (!currentUserId) return

    const currentFilters = { dateRange, selectedPS }
    const cachedData = tabDataCache[tabId]
    
    // Check if we need to fetch data
    const shouldFetch = forceRefresh || 
      !cachedData || 
      cachedData.filters.dateRange !== dateRange || 
      cachedData.filters.selectedPS !== selectedPS ||
      (Date.now() - cachedData.lastFetched) > 300000 // 5 minutes cache

    if (!shouldFetch) return cachedData.data

    // Set loading state for this tab
    setTabDataCache(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        isLoading: true,
        isLoadingMore: false,
        hasMore: true,
        currentPage: 0,
        filters: currentFilters
      }
    }))

    try {
      let data = null
      
      switch (tabId) {
        case 'fresh-leads':
          data = await fetchFreshLeadsData()
          break
        case 'todays-followup':
          data = await fetchTodaysFollowupData()
          break
        case 'open-leads':
          data = await fetchOpenLeadsData()
          break
        case 'waiting-approval':
          data = await fetchWaitingApprovalData()
          break
        case 'booked':
          data = await fetchBookedData()
          break
        case 'retailed':
          data = await fetchRetailedData()
          break
        case 'lost':
          data = await fetchLostData()
          break
        default:
          return null
      }

      // Update cache with fresh data
      setTabDataCache(prev => ({
        ...prev,
        [tabId]: {
          data: data?.leads || [],
          isLoading: false,
          isLoadingMore: false,
          hasMore: (data?.leads || []).length < (data?.total || 0),
          totalCount: data?.total || 0,
          currentPage: 0,
          lastFetched: Date.now(),
          filters: currentFilters,
          searchTerm: prev[tabId]?.searchTerm || '',
          scrollPosition: prev[tabId]?.scrollPosition || 0
        }
      }))

      return data?.leads || []
    } catch (error) {
      console.error(`Error fetching ${tabId} data:`, error)
      setTabDataCache(prev => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          isLoading: false
        }
      }))
      return null
    }
  }, [currentUserId, dateRange, selectedPS])

  // Fetch Analytics KPI Data
  const fetchAnalyticsData = useCallback(async () => {
    if (!currentUserId) return

    setAnalyticsLoading(true)
    try {
      const params = new URLSearchParams({
        team_leader_id: currentUserId,
        date_range: dateRange,
        ps_member: selectedPS
      })

      // Get the access token from localStorage
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      const accessToken = userData ? JSON.parse(userData).access_token : null

      const response = await fetch(`/api/team-leader/analytics-summary?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalyticsData({
          totalLeadsAssigned: data.total_assigned || 0,
          openLeads: data.open_leads || 0,
          wonLeads: data.won_leads || 0,
          lostLeads: data.lost_leads || 0
        })
      } else {
        console.error('Failed to fetch analytics data')
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [currentUserId, dateRange, selectedPS])

  // Individual tab data fetchers
  const fetchFreshLeadsData = useCallback(async (offset = 0, limit = 100) => {
    const params = new URLSearchParams({
      team_leader_id: currentUserId!,
      search: '',
      ps_member: selectedPS,
      date_range: dateRange,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    const response = await fetch(`/api/team-leader/fresh-leads?${params.toString()}`, {
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      return data
    }
    return { leads: [], total: 0 }
  }, [currentUserId, selectedPS, dateRange])

  const fetchTodaysFollowupData = useCallback(async (offset = 0, limit = 200) => {
    const params = new URLSearchParams({
      team_leader_id: currentUserId!,
      search: '',
      ps_member: selectedPS,
      date_range: dateRange,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    const response = await fetch(`/api/team-leader/todays-followup?${params.toString()}`, {
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      return data
    }
    return { leads: [], total: 0 }
  }, [currentUserId, selectedPS, dateRange])

  const fetchOpenLeadsData = useCallback(async (offset = 0, limit = 200) => {
    const params = new URLSearchParams({
      team_leader_id: currentUserId!,
      search: '',
      ps_member: selectedPS,
      date_range: dateRange,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    const response = await fetch(`/api/team-leader/open-leads?${params.toString()}`, {
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      return data
    }
    return { leads: [], total: 0 }
  }, [currentUserId, selectedPS, dateRange])

  const fetchWaitingApprovalData = useCallback(async (offset = 0, limit = 200) => {
    const params = new URLSearchParams({
      team_leader_id: currentUserId!,
      search: '',
      ps_member: selectedPS,
      date_range: dateRange,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    const response = await fetch(`/api/team-leader/waiting-approval?${params.toString()}`, {
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      return data
    }
    return { leads: [], total: 0 }
  }, [currentUserId, selectedPS, dateRange])

  const fetchBookedData = useCallback(async (offset = 0, limit = 200) => {
    const params = new URLSearchParams({
      team_leader_id: currentUserId!,
      search: '',
      ps_member: selectedPS,
      date_range: dateRange,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    const response = await fetch(`/api/team-leader/booked?${params.toString()}`, {
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      return data
    }
    return { leads: [], total: 0 }
  }, [currentUserId, selectedPS, dateRange])

  const fetchRetailedData = useCallback(async (offset = 0, limit = 200) => {
    const params = new URLSearchParams({
      team_leader_id: currentUserId!,
      search: '',
      ps_member: selectedPS,
      date_range: dateRange,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    const response = await fetch(`/api/team-leader/retailed?${params.toString()}`, {
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      return data
    }
    return { leads: [], total: 0 }
  }, [currentUserId, selectedPS, dateRange])

  const fetchLostData = useCallback(async (offset = 0, limit = 200) => {
    const params = new URLSearchParams({
      team_leader_id: currentUserId!,
      search: '',
      ps_member: selectedPS,
      date_range: dateRange,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    const response = await fetch(`/api/team-leader/lost?${params.toString()}`, {
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      return data
    }
    return { leads: [], total: 0 }
  }, [currentUserId, selectedPS, dateRange])

  // Refresh function for individual tabs
  const refreshTabData = useCallback(async (tabId: string) => {
    if (!currentUserId) return

    const currentFilters = { dateRange, selectedPS }
    
    // Set loading state for this tab
    setTabDataCache(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        isLoading: true,
        filters: currentFilters
      }
    }))

    try {
      let data = null
      
      switch (tabId) {
        case 'fresh-leads':
          data = await fetchFreshLeadsData()
          break
        case 'todays-followup':
          data = await fetchTodaysFollowupData()
          break
        case 'open-leads':
          data = await fetchOpenLeadsData()
          break
        case 'waiting-approval':
          data = await fetchWaitingApprovalData()
          break
        case 'booked':
          data = await fetchBookedData()
          break
        case 'retailed':
          data = await fetchRetailedData()
          break
        case 'lost':
          data = await fetchLostData()
          break
        default:
          return null
      }

      // Update cache with fresh data
      setTabDataCache(prev => ({
        ...prev,
        [tabId]: {
          data: (data?.leads || data || []),
          isLoading: false,
          isLoadingMore: false,
          hasMore: true,
          totalCount: 0,
          currentPage: 0,
          lastFetched: Date.now(),
          filters: currentFilters,
          searchTerm: prev[tabId]?.searchTerm || '',
          scrollPosition: prev[tabId]?.scrollPosition || 0
        }
      }))

      return data
    } catch (error) {
      console.error(`Error refreshing ${tabId} data:`, error)
      setTabDataCache(prev => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          isLoading: false
        }
      }))
      return null
    }
  }, [currentUserId, dateRange, selectedPS, fetchFreshLeadsData, fetchTodaysFollowupData, fetchOpenLeadsData, fetchWaitingApprovalData, fetchBookedData, fetchRetailedData, fetchLostData])

  // Load more data for pagination
  const loadMoreData = useCallback(async (tabId: string) => {
    if (!currentUserId) return

    const cachedData = tabDataCache[tabId]
    if (!cachedData || cachedData.isLoadingMore || !cachedData.hasMore) return

    // Set loading more state
    setTabDataCache(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        isLoadingMore: true
      }
    }))

    try {
      const nextPage = cachedData.currentPage + 1
      const offset = nextPage * 50
      let data = null
      
      switch (tabId) {
        case 'fresh-leads':
          data = await fetchFreshLeadsData(offset, 50)
          break
        case 'todays-followup':
          data = await fetchTodaysFollowupData(offset, 50)
          break
        case 'open-leads':
          data = await fetchOpenLeadsData(offset, 50)
          break
        case 'waiting-approval':
          data = await fetchWaitingApprovalData(offset, 50)
          break
        case 'booked':
          data = await fetchBookedData(offset, 50)
          break
        case 'retailed':
          data = await fetchRetailedData(offset, 50)
          break
        case 'lost':
          data = await fetchLostData(offset, 50)
          break
        default:
          return
      }

      // Append new data to existing data
      const newLeads = data?.leads || []
      const existingData = cachedData.data || []
      const updatedData = [...existingData, ...newLeads]
      
      setTabDataCache(prev => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          data: updatedData,
          isLoadingMore: false,
          hasMore: updatedData.length < cachedData.totalCount,
          currentPage: nextPage
        }
      }))
    } catch (error) {
      console.error(`Error loading more ${tabId} data:`, error)
      setTabDataCache(prev => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          isLoadingMore: false
        }
      }))
    }
  }, [currentUserId, tabDataCache, fetchFreshLeadsData, fetchTodaysFollowupData, fetchOpenLeadsData, fetchWaitingApprovalData, fetchBookedData, fetchRetailedData, fetchLostData])

  // Infinite scroll hook
  const useInfiniteScroll = (callback: () => void, hasMore: boolean, isLoadingMore: boolean) => {
    useEffect(() => {
      const handleScroll = () => {
        if (isLoadingMore || !hasMore) return

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight

        // Load more when user is 200px from bottom
        if (scrollTop + windowHeight >= documentHeight - 200) {
          callback()
        }
      }

      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }, [callback, hasMore, isLoadingMore])
  }

  // Tab switching with lazy loading
  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId)
      await fetchTabData(tabId)
  }

  // Get current tab data
  const getCurrentTabData = (tabId: string) => {
    return tabDataCache[tabId]?.data || []
  }

  // Get current tab loading state
  const getCurrentTabLoading = (tabId: string) => {
    return tabDataCache[tabId]?.isLoading || false
  }

  // Effect to refetch data when filters change for active tab
  useEffect(() => {
    if (currentUserId) {
      if (activeTab === 'analytics') {
        fetchAnalyticsData()
      } else {
      fetchTabData(activeTab, true) // Force refresh when filters change
    }
    }
  }, [activeTab, dateRange, selectedPS, currentUserId, fetchAnalyticsData, fetchTabData])

  // Tab configuration
  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'fresh-leads', label: 'Fresh Leads', icon: Target },
    { id: 'todays-followup', label: "Today's Follow Up", icon: Calendar },
    { id: 'open-leads', label: 'Open Leads', icon: Eye },
    { id: 'waiting-approval', label: 'Waiting for Approval', icon: Clock },
    { id: 'booked', label: 'Booked', icon: CheckCircle2 },
    { id: 'retailed', label: 'Retailed', icon: Award },
    { id: 'lost', label: 'Lost', icon: XCircle }
  ]

  // Placeholder component for empty tabs
  const EmptyStateCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">{title}</h3>
          <p className="text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  )

  // Lightweight skeleton component for loading states
  const TabSkeleton = () => (
    <div className="space-y-6">
      {/* Search Bar Skeleton */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <div className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
      </div>

      {/* Table Header Skeleton */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table Skeleton */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <th key={i} className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Skeleton */}
          <div className="lg:hidden space-y-4 p-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="space-y-2">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Fresh Leads Tab Component
  const FreshLeadsTab = () => {
    const [searchTerm, setSearchTerm] = useState('')
    
    // Get data from cache
    const freshLeads = getCurrentTabData('fresh-leads')
    const isLoading = getCurrentTabLoading('fresh-leads')
    const cachedData = tabDataCache['fresh-leads']
    const isLoadingMore = cachedData?.isLoadingMore || false
    const hasMore = cachedData?.hasMore || false

    // Infinite scroll for loading more data
    useInfiniteScroll(() => {
      if (hasMore && !isLoadingMore) {
        loadMoreData('fresh-leads')
      }
    }, hasMore, isLoadingMore)

    // Filter leads by search term
    const filteredLeads = useMemo(() => {
      if (!searchTerm) return freshLeads
      const searchLower = searchTerm.toLowerCase()
      return freshLeads.filter((lead: any) => 
        lead.customer_name?.toLowerCase().includes(searchLower) ||
        lead.customer_mobile_number?.includes(searchTerm) ||
        lead.lead_uid?.toLowerCase().includes(searchLower)
      )
    }, [freshLeads, searchTerm])

    const getStatusColor = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('new') || statusLower.includes('fresh')) return 'bg-purple-100 text-purple-800 border-purple-200'
      if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      if (statusLower.includes('connected')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('not connected')) return 'bg-red-100 text-red-800 border-red-200'
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const getStatusIcon = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('new') || statusLower.includes('fresh')) return <Target className="h-3 w-3" />
      if (statusLower.includes('pending')) return <Clock className="h-3 w-3" />
      if (statusLower.includes('connected')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('not connected')) return <XCircle className="h-3 w-3" />
      return <AlertCircle className="h-3 w-3" />
    }

    if (isLoading) {
      return <TabSkeleton />
    }

    return (
      <div className="space-y-6">
        {/* Search Toolbar */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, mobile, or UID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fresh Leads Table */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <Target className="h-5 w-5 mr-2 text-orange-600" />
                  Fresh Leads
                </CardTitle>
                <CardDescription className="mt-1">
                  Newly assigned leads requiring immediate attention
                </CardDescription>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshTabData('fresh-leads')}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
                <Badge className="bg-orange-500 text-white">
                  {filteredLeads.length} Leads
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Target className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Fresh Leads</h3>
                    <p className="text-gray-500">No fresh leads for the selected date/PS.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Info</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Details</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ICROP ID</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned PS</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeads.map((lead: any, index: number) => (
                        <tr key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {/* Lead Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {lead.lead_uid}
                                </Badge>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <PhoneCall className="h-4 w-4 mr-1.5 text-orange-500" />
                                {lead.customer_mobile_number}
                              </div>
                              {lead.source && (
                                <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                  <span className="font-medium text-blue-700">Source:</span> {lead.source}
                                </div>
                              )}
                              {lead.sub_source && (
                                <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                  <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(lead.ps_assigned_at || lead.created_at).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </td>

                          {/* Vehicle Details */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.make} {lead.model}
                              </div>
                              {lead.variant && (
                                <div className="text-sm text-gray-600">
                                  {lead.variant}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                              {getStatusIcon(lead.lead_status)}
                              <span className="ml-1">{lead.lead_status}</span>
                            </Badge>
                          </td>

                                {/* ICROP ID */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {lead.icrop_id ? (
                                    <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                      {lead.icrop_id}
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>

                          {/* Assigned PS */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredLeads.map((lead: any, index: number) => (
                    <Card key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`shadow-sm hover:shadow-md transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <CardContent className="p-4 space-y-4">
                        {/* Lead Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold text-gray-900">{lead.customer_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {lead.lead_uid}
                            </Badge>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <PhoneCall className="h-4 w-4 mr-2 text-orange-500" />
                            {lead.customer_mobile_number}
                          </div>
                                {lead.source && (
                                  <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                    <span className="font-medium text-blue-700">Source:</span> {lead.source}
                                  </div>
                                )}
                                {lead.sub_source && (
                                  <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                    <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500">
                                  Assigned: {new Date(lead.ps_assigned_at || lead.created_at).toLocaleString('en-IN')}
                                </div>
                        </div>

                        {/* Assigned PS */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Assigned PS</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {lead.ps_name || 'Unassigned'}
                          </div>
                          {lead.ps_branch && (
                            <div className="text-xs text-gray-500">
                              {lead.ps_branch}
                            </div>
                          )}
                        </div>

                        {/* Vehicle Details */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Vehicle Details</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {lead.make} {lead.model}
                          </div>
                          {lead.variant && (
                            <div className="text-sm text-gray-600">
                              {lead.variant}
                            </div>
                          )}
                        </div>

                        {/* Status and ICROP */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Status</div>
                            <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                              {getStatusIcon(lead.lead_status)}
                              <span className="ml-1">{lead.lead_status}</span>
                            </Badge>
                          </div>
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-gray-700">ICROP ID</div>
                                  {lead.icrop_id ? (
                                    <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                      {lead.icrop_id}
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </div>
                        </div>

                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Loading More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Loading more leads...</span>
                    </div>
                  </div>
                )}
                
                {/* End of Data Indicator */}
                {!hasMore && filteredLeads.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-sm text-gray-500">No more leads to load</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Today's Follow-Up Tab Component
  const TodaysFollowupTab = () => {
    const [searchTerm, setSearchTerm] = useState('')
    
    // Get data from cache
    const todaysFollowup = getCurrentTabData('todays-followup')
    const isLoading = getCurrentTabLoading('todays-followup')

    // Filter leads by search term
    const filteredLeads = useMemo(() => {
      if (!searchTerm) return todaysFollowup
      const searchLower = searchTerm.toLowerCase()
      return todaysFollowup.filter((lead: any) => 
        lead.customer_name?.toLowerCase().includes(searchLower) ||
        lead.customer_mobile_number?.includes(searchTerm) ||
        lead.lead_uid?.toLowerCase().includes(searchLower)
      )
    }, [todaysFollowup, searchTerm])

    // Infinite scroll for Today's Follow-Up
    const cachedData = tabDataCache['todays-followup']
    const isLoadingMore = cachedData?.isLoadingMore || false
    const hasMore = cachedData?.hasMore || false

    useInfiniteScroll(() => {
      if (hasMore && !isLoadingMore) {
        loadMoreData('todays-followup')
      }
    }, hasMore, isLoadingMore)

    const getStatusColor = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('won') || statusLower.includes('closed won')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('lost') || statusLower.includes('closed lost')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('connected')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('not connected')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const getStatusIcon = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('won')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('lost')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('connected')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('not connected')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('pending')) return <Clock className="h-3 w-3" />
      return <AlertCircle className="h-3 w-3" />
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-gray-600">Loading today's follow-up...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Search Toolbar */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search: Name, mobile or UID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Follow-Up Table */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-orange-600" />
                  Today's Follow-Up
                </CardTitle>
                <CardDescription className="mt-1">
                  Follow-up leads scheduled for today or overdue
                </CardDescription>
              </div>
              <Badge className="bg-orange-500 text-white">
                {filteredLeads.length} Follow-ups
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Follow-ups for Today</h3>
                    <p className="text-gray-500">No follow-up data available for today.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Info</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned PS</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Details</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Call</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ICROP ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeads.map((lead: any, index: number) => (
                        <tr key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {/* Lead Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {lead.lead_uid}
                                </Badge>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <PhoneCall className="h-4 w-4 mr-1.5 text-orange-500" />
                                {lead.customer_mobile_number}
                              </div>
                              {lead.source && (
                                <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                  <span className="font-medium text-blue-700">Source:</span> {lead.source}
                                </div>
                              )}
                              {lead.sub_source && (
                                <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                  <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(lead.created_at).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </td>

                          {/* Assigned PS */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </td>

                          {/* Vehicle Details */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.make} {lead.model}
                              </div>
                              {lead.variant && (
                                <div className="text-sm text-gray-600">
                                  {lead.variant}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                                {getStatusIcon(lead.lead_status)}
                                <span className="ml-1">{lead.lead_status}</span>
                              </Badge>
                              <div className="mt-1">
                                {lead.final_status === 'Waiting for Approval' && (
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs px-2 py-1">
                                    Waiting for Sales Manager Approval
                                  </Badge>
                                )}
                                {lead.final_status === 'Lost Requested' && (
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs px-2 py-1">
                                    Waiting for CRE Approval
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Next Call */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                Call #{lead.next_call_number || 1}
                              </div>
                              {lead.follow_up_date && (
                                <div className="text-xs text-gray-500">
                                  {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                                </div>
                              )}
                              {lead.is_overdue && (
                                <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                                  Overdue: {lead.overdue_days} days
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* ICROP ID */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {lead.icrop_id ? (
                              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredLeads.map((lead: any, index: number) => (
                    <Card key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`shadow-sm hover:shadow-md transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <CardContent className="p-4 space-y-4">
                        {/* Lead Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold text-gray-900">{lead.customer_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {lead.lead_uid}
                            </Badge>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <PhoneCall className="h-4 w-4 mr-2 text-orange-500" />
                            {lead.customer_mobile_number}
                          </div>
                          {lead.source && (
                            <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                              <span className="font-medium text-blue-700">Source:</span> {lead.source}
                            </div>
                          )}
                          {lead.sub_source && (
                            <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                              <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {new Date(lead.created_at).toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Next Call/Overdue */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Next Call</div>
                          <div className="text-sm font-semibold text-gray-900">
                            Call #{lead.next_call_number || 1}
                          </div>
                          {lead.follow_up_date && (
                            <div className="text-xs text-gray-500">
                              {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                            </div>
                          )}
                          {lead.is_overdue && (
                            <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                              Overdue: {lead.overdue_days} days
                            </Badge>
                          )}
                        </div>

                        {/* Status */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Status</div>
                          <div className="space-y-1">
                            <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                              {getStatusIcon(lead.lead_status)}
                              <span className="ml-1">{lead.lead_status}</span>
                            </Badge>
                            <div className="mt-1">
                              {lead.final_status === 'Waiting for Approval' && (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs px-2 py-1">
                                  Waiting for Sales Manager Approval
                                </Badge>
                              )}
                              {lead.final_status === 'Lost Requested' && (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs px-2 py-1">
                                  Waiting for CRE Approval
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Assigned PS */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Assigned PS</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {lead.ps_name || 'Unassigned'}
                          </div>
                          {lead.ps_branch && (
                            <div className="text-xs text-gray-500">
                              {lead.ps_branch}
                            </div>
                          )}
                        </div>

                        {/* Vehicle Details */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Vehicle Details</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {lead.make} {lead.model}
                          </div>
                          {lead.variant && (
                            <div className="text-sm text-gray-600">
                              {lead.variant}
                            </div>
                          )}
                        </div>

                        {/* ICROP ID */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">ICROP ID</div>
                          {lead.icrop_id ? (
                            <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                              {lead.icrop_id}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Loading More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Loading more leads...</span>
                    </div>
                  </div>
                )}
                
                {/* End of Data Indicator */}
                {!hasMore && filteredLeads.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-sm text-gray-500">No more leads to load</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Open Leads Tab Component
  const OpenLeadsTab = () => {
    const [searchTerm, setSearchTerm] = useState('')
    
    // Get data from cache
    const openLeads = getCurrentTabData('open-leads')
    const isLoading = getCurrentTabLoading('open-leads')

    // Filter leads by search term
    const filteredLeads = useMemo(() => {
      if (!searchTerm) return openLeads
      const searchLower = searchTerm.toLowerCase()
      return openLeads.filter((lead: any) => 
        lead.customer_name?.toLowerCase().includes(searchLower) ||
        lead.customer_mobile_number?.includes(searchTerm) ||
        lead.lead_uid?.toLowerCase().includes(searchLower)
      )
    }, [openLeads, searchTerm])

    // Infinite scroll for Open Leads
    const cachedData = tabDataCache['open-leads']
    const isLoadingMore = cachedData?.isLoadingMore || false
    const hasMore = cachedData?.hasMore || false

    useInfiniteScroll(() => {
      if (hasMore && !isLoadingMore) {
        loadMoreData('open-leads')
      }
    }, hasMore, isLoadingMore)

    const getStatusColor = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('won') || statusLower.includes('closed won')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('lost') || statusLower.includes('closed lost')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('connected')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('not connected')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      if (statusLower.includes('rnr')) return 'bg-gray-100 text-gray-800 border-gray-200'
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const getStatusIcon = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('won')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('lost')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('connected')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('not connected')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('pending')) return <Clock className="h-3 w-3" />
      if (statusLower.includes('rnr')) return <Clock className="h-3 w-3" />
      return <AlertCircle className="h-3 w-3" />
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-gray-600">Loading open leads...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Search Toolbar */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search: Name, mobile or UID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Open Leads Table */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-orange-600" />
                  Open Leads
                </CardTitle>
                <CardDescription className="mt-1">
                  All pending leads assigned to your team members
                </CardDescription>
              </div>
              <Badge className="bg-orange-500 text-white">
                {filteredLeads.length} Leads
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Eye className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Open Leads</h3>
                    <p className="text-gray-500">No pending leads for the selected date/PS.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Info</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned PS</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Details</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Call</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ICROP ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeads.map((lead: any, index: number) => (
                        <tr key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {/* Lead Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {lead.lead_uid}
                                </Badge>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <PhoneCall className="h-4 w-4 mr-1.5 text-orange-500" />
                                {lead.customer_mobile_number}
                              </div>
                              {lead.source && (
                                <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                  <span className="font-medium text-blue-700">Source:</span> {lead.source}
                                </div>
                              )}
                              {lead.sub_source && (
                                <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                  <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(lead.created_at).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </td>

                          {/* Assigned PS */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </td>

                          {/* Vehicle Details */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.make} {lead.model}
                              </div>
                              {lead.variant && (
                                <div className="text-sm text-gray-600">
                                  {lead.variant}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                                {getStatusIcon(lead.lead_status)}
                                <span className="ml-1">{lead.lead_status}</span>
                              </Badge>
                              {lead.awaiting_cre_approval && (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs px-2 py-1">
                                  Awaiting CRE Approval
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Next Call */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                Call #{lead.next_call_number || 1}
                              </div>
                              {lead.follow_up_date && (
                                <div className="text-xs text-gray-500">
                                  {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* ICROP ID */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {lead.icrop_id ? (
                              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredLeads.map((lead: any, index: number) => (
                    <Card key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`shadow-sm hover:shadow-md transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <CardContent className="p-4 space-y-4">
                        {/* Lead Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold text-gray-900">{lead.customer_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {lead.lead_uid}
                            </Badge>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <PhoneCall className="h-4 w-4 mr-2 text-orange-500" />
                            {lead.customer_mobile_number}
                          </div>
                          {lead.source && (
                            <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                              <span className="font-medium text-blue-700">Source:</span> {lead.source}
                            </div>
                          )}
                          {lead.sub_source && (
                            <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                              <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {new Date(lead.created_at).toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Next Call */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Next Call</div>
                          <div className="text-sm font-semibold text-gray-900">
                            Call #{lead.next_call_number || 1}
                          </div>
                          {lead.follow_up_date && (
                            <div className="text-xs text-gray-500">
                              {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Status</div>
                          <div className="space-y-1">
                            <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                              {getStatusIcon(lead.lead_status)}
                              <span className="ml-1">{lead.lead_status}</span>
                            </Badge>
                            {lead.awaiting_cre_approval && (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs px-2 py-1">
                                Awaiting CRE Approval
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Assigned PS */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Assigned PS</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {lead.ps_name || 'Unassigned'}
                          </div>
                          {lead.ps_branch && (
                            <div className="text-xs text-gray-500">
                              {lead.ps_branch}
                            </div>
                          )}
                        </div>

                        {/* Vehicle Details */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Vehicle Details</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {lead.make} {lead.model}
                          </div>
                          {lead.variant && (
                            <div className="text-sm text-gray-600">
                              {lead.variant}
                            </div>
                          )}
                        </div>

                        {/* ICROP ID */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">ICROP ID</div>
                          {lead.icrop_id ? (
                            <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                              {lead.icrop_id}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Loading More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Loading more leads...</span>
                    </div>
                  </div>
                )}
                
                {/* End of Data Indicator */}
                {!hasMore && filteredLeads.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-sm text-gray-500">No more leads to load</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Waiting for Approval Tab Component
  const WaitingApprovalTab = () => {
    const [searchTerm, setSearchTerm] = useState('')
    
    // Get data from cache
    const waitingApprovalLeads = getCurrentTabData('waiting-approval')
    const isLoading = getCurrentTabLoading('waiting-approval')

    // Filter leads by search term
    const filteredLeads = useMemo(() => {
      if (!searchTerm) return waitingApprovalLeads
      const searchLower = searchTerm.toLowerCase()
      return waitingApprovalLeads.filter((lead: any) => 
        lead.customer_name?.toLowerCase().includes(searchLower) ||
        lead.customer_mobile_number?.includes(searchTerm) ||
        lead.lead_uid?.toLowerCase().includes(searchLower)
      )
    }, [waitingApprovalLeads, searchTerm])

    // Infinite scroll for Waiting for Approval
    const cachedData = tabDataCache['waiting-approval']
    const isLoadingMore = cachedData?.isLoadingMore || false
    const hasMore = cachedData?.hasMore || false

    useInfiniteScroll(() => {
      if (hasMore && !isLoadingMore) {
        loadMoreData('waiting-approval')
      }
    }, hasMore, isLoadingMore)

    const getStatusColor = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('won') || statusLower.includes('closed won')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('lost') || statusLower.includes('closed lost')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('connected')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('not connected')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      if (statusLower.includes('rnr')) return 'bg-gray-100 text-gray-800 border-gray-200'
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const getStatusIcon = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('won')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('lost')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('connected')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('not connected')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('pending')) return <Clock className="h-3 w-3" />
      if (statusLower.includes('rnr')) return <Clock className="h-3 w-3" />
      return <AlertCircle className="h-3 w-3" />
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-gray-600">Loading waiting approval leads...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Search Toolbar */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search: Name, mobile or UID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Waiting for Approval Table */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-orange-600" />
                  Waiting for Approval
                </CardTitle>
                <CardDescription className="mt-1">
                  Leads awaiting CRE approval from your team members
                </CardDescription>
              </div>
              <Badge className="bg-orange-500 text-white">
                {filteredLeads.length} Leads
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Leads Waiting for Approval</h3>
                    <p className="text-gray-500">No leads are currently awaiting CRE approval.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Info</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned PS</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Details</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Call</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ICROP ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeads.map((lead: any, index: number) => (
                        <tr key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {/* Lead Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {lead.lead_uid}
                                </Badge>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <PhoneCall className="h-4 w-4 mr-1.5 text-orange-500" />
                                {lead.customer_mobile_number}
                              </div>
                              {lead.source && (
                                <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                  <span className="font-medium text-blue-700">Source:</span> {lead.source}
                                </div>
                              )}
                              {lead.sub_source && (
                                <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                  <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(lead.created_at).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </td>

                          {/* Assigned PS */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </td>

                          {/* Vehicle Details */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.make} {lead.model}
                              </div>
                              {lead.variant && (
                                <div className="text-sm text-gray-600">
                                  {lead.variant}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                                {getStatusIcon(lead.lead_status)}
                                <span className="ml-1">{lead.lead_status}</span>
                              </Badge>
                            </div>
                          </td>

                          {/* Next Call */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                Call #{lead.next_call_number || 1}
                              </div>
                              {lead.follow_up_date && (
                                <div className="text-xs text-gray-500">
                                  {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                                </div>
                              )}
                              {lead.is_overdue && (
                                <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                                  Overdue: {lead.overdue_days} days
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* ICROP ID */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {lead.icrop_id ? (
                              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredLeads.map((lead: any, index: number) => (
                    <Card key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`shadow-sm hover:shadow-md transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <CardContent className="p-4 space-y-4">
                        {/* Lead Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold text-gray-900">{lead.customer_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {lead.lead_uid}
                            </Badge>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <PhoneCall className="h-4 w-4 mr-2 text-orange-500" />
                            {lead.customer_mobile_number}
                          </div>
                          {lead.source && (
                            <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                              <span className="font-medium text-blue-700">Source:</span> {lead.source}
                            </div>
                          )}
                          {lead.sub_source && (
                            <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                              <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {new Date(lead.created_at).toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Next Call/Overdue */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Next Call</div>
                          <div className="text-sm font-semibold text-gray-900">
                            Call #{lead.next_call_number || 1}
                          </div>
                          {lead.follow_up_date && (
                            <div className="text-xs text-gray-500">
                              {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                            </div>
                          )}
                          {lead.is_overdue && (
                            <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                              Overdue: {lead.overdue_days} days
                            </Badge>
                          )}
                        </div>

                        {/* Status */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Status</div>
                          <div className="space-y-1">
                            <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                              {getStatusIcon(lead.lead_status)}
                              <span className="ml-1">{lead.lead_status}</span>
                            </Badge>
                          </div>
                        </div>

                        {/* Assigned PS */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Assigned PS</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {lead.ps_name || 'Unassigned'}
                          </div>
                          {lead.ps_branch && (
                            <div className="text-xs text-gray-500">
                              {lead.ps_branch}
                            </div>
                          )}
                        </div>

                        {/* Vehicle Details */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">Vehicle Details</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {lead.make} {lead.model}
                          </div>
                          {lead.variant && (
                            <div className="text-sm text-gray-600">
                              {lead.variant}
                            </div>
                          )}
                        </div>

                        {/* ICROP ID */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">ICROP ID</div>
                          {lead.icrop_id ? (
                            <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                              {lead.icrop_id}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Loading More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Loading more leads...</span>
                    </div>
                  </div>
                )}
                
                {/* End of Data Indicator */}
                {!hasMore && filteredLeads.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-sm text-gray-500">No more leads to load</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Booked Tab Component
  const BookedTab = () => {
    const [searchTerm, setSearchTerm] = useState('')
    
    // Get data from cache
    const bookedLeads = getCurrentTabData('booked')
    const isLoading = getCurrentTabLoading('booked')

    // Filter leads by search term
    const filteredLeads = useMemo(() => {
      if (!searchTerm) return bookedLeads
      const searchLower = searchTerm.toLowerCase()
      return bookedLeads.filter((lead: any) => 
        lead.customer_name?.toLowerCase().includes(searchLower) ||
        lead.customer_mobile_number?.includes(searchTerm) ||
        lead.lead_uid?.toLowerCase().includes(searchLower)
      )
    }, [bookedLeads, searchTerm])

    // Infinite scroll for Booked
    const cachedData = tabDataCache['booked']
    const isLoadingMore = cachedData?.isLoadingMore || false
    const hasMore = cachedData?.hasMore || false

    useInfiniteScroll(() => {
      if (hasMore && !isLoadingMore) {
        loadMoreData('booked')
      }
    }, hasMore, isLoadingMore)

    const getStatusColor = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('booked')) return 'bg-blue-100 text-blue-800 border-blue-200'
      if (statusLower.includes('won') || statusLower.includes('closed won')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('lost') || statusLower.includes('closed lost')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('connected')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('not connected')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const getStatusIcon = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('booked')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('won')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('lost')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('connected')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('not connected')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('pending')) return <Clock className="h-3 w-3" />
      return <AlertCircle className="h-3 w-3" />
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-gray-600">Loading booked leads...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Search Toolbar */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search: Name, mobile or UID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booked Table */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-blue-600" />
                  Booked Leads
                </CardTitle>
                <CardDescription className="mt-1">
                  Successfully booked leads from your team members
                </CardDescription>
              </div>
              <Badge className="bg-blue-500 text-white">
                {filteredLeads.length} Leads
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Booked Leads</h3>
                    <p className="text-gray-500">No leads have been booked for the selected filters.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Info</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned PS</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Details</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Call</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ICROP ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeads.map((lead: any, index: number) => (
                        <tr key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {/* Lead Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {lead.lead_uid}
                                </Badge>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <PhoneCall className="h-4 w-4 mr-1.5 text-blue-500" />
                                {lead.customer_mobile_number}
                              </div>
                              {lead.source && (
                                <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                  <span className="font-medium text-blue-700">Source:</span> {lead.source}
                                </div>
                              )}
                              {lead.sub_source && (
                                <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                  <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(lead.created_at).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </td>

                          {/* Assigned PS */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </td>

                          {/* Vehicle Details */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.make} {lead.model}
                              </div>
                              {lead.variant && (
                                <div className="text-sm text-gray-600">
                                  {lead.variant}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                                {getStatusIcon(lead.lead_status)}
                                <span className="ml-1">{lead.lead_status}</span>
                              </Badge>
                            </div>
                          </td>

                          {/* Next Call */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                Call #{lead.next_call_number}
                              </div>
                              {lead.follow_up_date && (
                                <div className="text-sm text-gray-600">
                                  {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                                </div>
                              )}
                              {lead.is_overdue && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1">
                                  Overdue: {lead.overdue_days} days
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* ICROP ID */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {lead.icrop_id ? (
                              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredLeads.map((lead: any) => (
                    <Card key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Lead Info */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Lead Info</div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {lead.lead_uid}
                              </Badge>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <PhoneCall className="h-4 w-4 mr-1.5 text-blue-500" />
                              {lead.customer_mobile_number}
                            </div>
                            {lead.source && (
                              <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                <span className="font-medium text-blue-700">Source:</span> {lead.source}
                              </div>
                            )}
                            {lead.sub_source && (
                              <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {new Date(lead.created_at).toLocaleString('en-IN')}
                            </div>
                          </div>

                          {/* Assigned PS */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Assigned PS</div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </div>

                          {/* Vehicle Details */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Vehicle Details</div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead.make} {lead.model}
                            </div>
                            {lead.variant && (
                              <div className="text-sm text-gray-600">
                                {lead.variant}
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Status</div>
                            <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                              {getStatusIcon(lead.lead_status)}
                              <span className="ml-1">{lead.lead_status}</span>
                            </Badge>
                          </div>

                          {/* Next Call */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Next Call</div>
                            <div className="text-sm font-medium text-gray-900">
                              Call #{lead.next_call_number}
                            </div>
                            {lead.follow_up_date && (
                              <div className="text-sm text-gray-600">
                                {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                              </div>
                            )}
                            {lead.is_overdue && (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1">
                                Overdue: {lead.overdue_days} days
                              </Badge>
                            )}
                          </div>

                          {/* ICROP ID */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">ICROP ID</div>
                            {lead.icrop_id ? (
                              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Loading More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Loading more leads...</span>
                    </div>
                  </div>
                )}
                
                {/* End of Data Indicator */}
                {!hasMore && filteredLeads.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-sm text-gray-500">No more leads to load</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Retailed Tab Component
  const RetailedTab = () => {
    const [searchTerm, setSearchTerm] = useState('')
    
    // Get data from cache
    const retailedLeads = getCurrentTabData('retailed')
    const isLoading = getCurrentTabLoading('retailed')

    // Filter leads by search term
    const filteredLeads = useMemo(() => {
      if (!searchTerm) return retailedLeads
      const searchLower = searchTerm.toLowerCase()
      return retailedLeads.filter((lead: any) => 
        lead.customer_name?.toLowerCase().includes(searchLower) ||
        lead.customer_mobile_number?.includes(searchTerm) ||
        lead.lead_uid?.toLowerCase().includes(searchLower)
      )
    }, [retailedLeads, searchTerm])

    // Infinite scroll for Retailed
    const cachedData = tabDataCache['retailed']
    const isLoadingMore = cachedData?.isLoadingMore || false
    const hasMore = cachedData?.hasMore || false

    useInfiniteScroll(() => {
      if (hasMore && !isLoadingMore) {
        loadMoreData('retailed')
      }
    }, hasMore, isLoadingMore)

    const getStatusColor = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('won') || statusLower.includes('closed won')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('lost') || statusLower.includes('closed lost')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('connected')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('not connected')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const getStatusIcon = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('won')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('lost')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('connected')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('not connected')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('pending')) return <Clock className="h-3 w-3" />
      return <AlertCircle className="h-3 w-3" />
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-gray-600">Loading retailed leads...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Search Toolbar */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search: Name, mobile or UID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retailed Table */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                  Retailed Leads
                </CardTitle>
                <CardDescription className="mt-1">
                  Successfully retailed leads from your team members
                </CardDescription>
              </div>
              <Badge className="bg-green-500 text-white">
                {filteredLeads.length} Leads
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Retailed Leads</h3>
                    <p className="text-gray-500">No leads have been retailed for the selected filters.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Info</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned PS</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Details</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Call</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ICROP ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeads.map((lead: any, index: number) => (
                        <tr key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {/* Lead Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {lead.lead_uid}
                                </Badge>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <PhoneCall className="h-4 w-4 mr-1.5 text-green-500" />
                                {lead.customer_mobile_number}
                              </div>
                              {lead.source && (
                                <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                  <span className="font-medium text-blue-700">Source:</span> {lead.source}
                                </div>
                              )}
                              {lead.sub_source && (
                                <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                  <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(lead.created_at).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </td>

                          {/* Assigned PS */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </td>

                          {/* Vehicle Details */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.make} {lead.model}
                              </div>
                              {lead.variant && (
                                <div className="text-sm text-gray-600">
                                  {lead.variant}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                                {getStatusIcon(lead.lead_status)}
                                <span className="ml-1">{lead.lead_status}</span>
                              </Badge>
                            </div>
                          </td>

                          {/* Next Call */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                Call #{lead.next_call_number}
                              </div>
                              {lead.follow_up_date && (
                                <div className="text-sm text-gray-600">
                                  {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                                </div>
                              )}
                              {lead.is_overdue && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1">
                                  Overdue: {lead.overdue_days} days
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* ICROP ID */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {lead.icrop_id ? (
                              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredLeads.map((lead: any) => (
                    <Card key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Lead Info */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Lead Info</div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {lead.lead_uid}
                              </Badge>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <PhoneCall className="h-4 w-4 mr-1.5 text-green-500" />
                              {lead.customer_mobile_number}
                            </div>
                            {lead.source && (
                              <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                <span className="font-medium text-blue-700">Source:</span> {lead.source}
                              </div>
                            )}
                            {lead.sub_source && (
                              <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                <span className="font-medium text-green-700">Sub Source:</span> {lead.sub_source}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {new Date(lead.created_at).toLocaleString('en-IN')}
                            </div>
                          </div>

                          {/* Assigned PS */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Assigned PS</div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </div>

                          {/* Vehicle Details */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Vehicle Details</div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead.make} {lead.model}
                            </div>
                            {lead.variant && (
                              <div className="text-sm text-gray-600">
                                {lead.variant}
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Status</div>
                            <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                              {getStatusIcon(lead.lead_status)}
                              <span className="ml-1">{lead.lead_status}</span>
                            </Badge>
                          </div>

                          {/* Next Call */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Next Call</div>
                            <div className="text-sm font-medium text-gray-900">
                              Call #{lead.next_call_number}
                            </div>
                            {lead.follow_up_date && (
                              <div className="text-sm text-gray-600">
                                {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                              </div>
                            )}
                            {lead.is_overdue && (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1">
                                Overdue: {lead.overdue_days} days
                              </Badge>
                            )}
                          </div>

                          {/* ICROP ID */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">ICROP ID</div>
                            {lead.icrop_id ? (
                              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Loading More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Loading more leads...</span>
                    </div>
                  </div>
                )}
                
                {/* End of Data Indicator */}
                {!hasMore && filteredLeads.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-sm text-gray-500">No more leads to load</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Lost Tab Component
  const LostTab = () => {
    const [searchTerm, setSearchTerm] = useState('')
    
    // Get data from cache
    const lostLeads = getCurrentTabData('lost')
    const isLoading = getCurrentTabLoading('lost')

    // Filter leads by search term
    const filteredLeads = useMemo(() => {
      if (!searchTerm) return lostLeads
      const searchLower = searchTerm.toLowerCase()
      return lostLeads.filter((lead: any) => 
        lead.customer_name?.toLowerCase().includes(searchLower) ||
        lead.customer_mobile_number?.includes(searchTerm) ||
        lead.lead_uid?.toLowerCase().includes(searchLower)
      )
    }, [lostLeads, searchTerm])

    // Infinite scroll for Lost
    const cachedData = tabDataCache['lost']
    const isLoadingMore = cachedData?.isLoadingMore || false
    const hasMore = cachedData?.hasMore || false

    useInfiniteScroll(() => {
      if (hasMore && !isLoadingMore) {
        loadMoreData('lost')
      }
    }, hasMore, isLoadingMore)

    const getStatusColor = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('lost') || statusLower.includes('closed lost')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('lost requested')) return 'bg-orange-100 text-orange-800 border-orange-200'
      if (statusLower.includes('lost to co-dealer')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('connected')) return 'bg-green-100 text-green-800 border-green-200'
      if (statusLower.includes('not connected')) return 'bg-red-100 text-red-800 border-red-200'
      if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const getStatusIcon = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower.includes('lost')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('connected')) return <CheckCircle2 className="h-3 w-3" />
      if (statusLower.includes('not connected')) return <XCircle className="h-3 w-3" />
      if (statusLower.includes('pending')) return <Clock className="h-3 w-3" />
      return <AlertCircle className="h-3 w-3" />
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-gray-600">Loading lost leads...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search: Name, mobile or UID"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lost Table */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <XCircle className="h-5 w-5 mr-2 text-red-600" />
                  Lost Leads
                </CardTitle>
                <CardDescription className="mt-1">
                  Lost leads from your team members
                </CardDescription>
              </div>
              <Badge className="bg-red-500 text-white">
                {filteredLeads.length} Leads
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Lost Leads</h3>
                    <p className="text-gray-500">No leads have been lost for the selected filters.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Info</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned PS</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Details</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Call</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ICROP ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeads.map((lead: any, index: number) => (
                        <tr key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {/* Lead Info */}
                          <td className="px-6 py-4 whitespace-normal break-normal">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {lead.lead_uid}
                                </Badge>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <PhoneCall className="h-4 w-4 mr-1.5 text-red-500" />
                                {lead.customer_mobile_number}
                              </div>
                              {lead.source && (
                                <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                  <span className="font-medium text-blue-700">Source:</span> {lead.source}
                                </div>
                              )}
                              {lead.sub_source && (
                                <div className="text-xs text-gray-500 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                                  <span className="font-medium text-red-700">Sub Source:</span> {lead.sub_source}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(lead.created_at).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </td>

                          {/* Assigned PS */}
                          <td className="px-6 py-4 whitespace-normal break-normal">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </td>

                          {/* Vehicle Details */}
                          <td className="px-6 py-4 whitespace-normal break-normal">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.model || '-'}
                            </div>
                            {lead.variant && (
                              <div className="text-xs text-gray-500">
                                {lead.variant}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-normal break-normal">
                            <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                              {getStatusIcon(lead.lead_status)}
                              <span className="ml-1">{lead.lead_status}</span>
                            </Badge>
                          </td>

                          {/* Next Call */}
                          <td className="px-6 py-4 whitespace-normal break-normal">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                Call #{lead.next_call_number}
                              </div>
                              {lead.follow_up_date && (
                                <div className="text-xs text-gray-500">
                                  {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                                </div>
                              )}
                              {lead.is_overdue && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1">
                                  Overdue: {lead.overdue_days} days
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* ICROP ID */}
                          <td className="px-6 py-4 whitespace-normal break-normal">
                            {lead.icrop_id ? (
                              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredLeads.map((lead: any) => (
                    <Card key={`${lead.id || lead.lead_uid}-${lead.customer_mobile_number}-${lead.ps_assigned_at || lead.created_at}`} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Lead Info */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Lead Info</div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900">{lead.customer_name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {lead.lead_uid}
                              </Badge>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <PhoneCall className="h-4 w-4 mr-1.5 text-red-500" />
                              {lead.customer_mobile_number}
                            </div>
                            {lead.source && (
                              <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                <span className="font-medium text-blue-700">Source:</span> {lead.source}
                              </div>
                            )}
                            {lead.sub_source && (
                              <div className="text-xs text-gray-500 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                                <span className="font-medium text-red-700">Sub Source:</span> {lead.sub_source}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {new Date(lead.created_at).toLocaleString('en-IN')}
                            </div>
                          </div>

                          {/* Assigned PS */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Assigned PS</div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead.ps_name || 'Unassigned'}
                            </div>
                            {lead.ps_branch && (
                              <div className="text-xs text-gray-500">
                                {lead.ps_branch}
                              </div>
                            )}
                          </div>

                          {/* Vehicle Details */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Vehicle Details</div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead.model || '-'}
                            </div>
                            {lead.variant && (
                              <div className="text-xs text-gray-500">
                                {lead.variant}
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Status</div>
                            <Badge className={`${getStatusColor(lead.lead_status)} text-xs px-2 py-1`}>
                              {getStatusIcon(lead.lead_status)}
                              <span className="ml-1">{lead.lead_status}</span>
                            </Badge>
                          </div>

                          {/* Next Call */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">Next Call</div>
                            <div className="text-sm font-medium text-gray-900">
                              Call #{lead.next_call_number}
                            </div>
                            {lead.follow_up_date && (
                              <div className="text-xs text-gray-500">
                                {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                              </div>
                            )}
                            {lead.is_overdue && (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1">
                                Overdue: {lead.overdue_days} days
                              </Badge>
                            )}
                          </div>

                          {/* ICROP ID */}
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-700">ICROP ID</div>
                            {lead.icrop_id ? (
                              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                                {lead.icrop_id}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Loading More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Loading more leads...</span>
                    </div>
                  </div>
                )}
                
                {/* End of Data Indicator */}
                {!hasMore && filteredLeads.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-sm text-gray-500">No more leads to load</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-gray-600">Loading your team analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Show error message if no user found
  if (!currentUserId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access the Team Leader Dashboard.</p>
            <Button asChild>
              <Link href="/auth/login">
                Go to Login
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <RoleGuard requiredRole="team_leader">
        <div className="space-y-6 pb-8">
          {/* Header with Gradient */}
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-8 shadow-sm border border-orange-100">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Team Leader Dashboard</h1>
                <p className="text-gray-700">
                  Comprehensive analytics and performance insights for your team
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <Badge variant="outline" className="bg-white/80 border-orange-200 text-orange-800">
                    <Users className="h-3 w-3 mr-1" />
                    {assignedPS.length} PS Members
                  </Badge>
                  <Badge variant="outline" className="bg-white/80 border-orange-200 text-orange-800">
                    <Calendar className="h-3 w-3 mr-1" />
                    Last {dateRange} days
                  </Badge>
                </div>
              </div>
              <div className="flex space-x-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40 bg-white shadow-sm border-orange-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedPS} onValueChange={setSelectedPS}>
                  <SelectTrigger className="w-52 bg-white shadow-sm border-orange-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PS Members</SelectItem>
                    {assignedPS.map((ps) => (
                      <SelectItem key={ps.id} value={ps.id}>
                        {ps.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
            <div className="px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200
                        ${isActive 
                          ? 'bg-blue-500 text-white shadow-md' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Analytics Tab Content */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* Refresh Button */}
                <div className="flex justify-end">
                        <Button 
                    onClick={fetchAnalyticsData}
                    disabled={analyticsLoading}
                    variant="outline"
                          size="sm"
                        >
                    <RefreshCw className={`h-4 w-4 mr-2 ${analyticsLoading ? 'animate-spin' : ''}`} />
                    Refresh Analytics
                        </Button>
                      </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Total Leads Assigned Card */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-blue-700">
                          Total Leads Assigned
                </CardTitle>
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          title="Total unique leads assigned to your PS team within the selected date range"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
              </CardHeader>
                    <CardContent>
                      {analyticsLoading ? (
                        <div className="animate-pulse">
                          <div className="h-10 bg-blue-200 rounded w-24 mb-2"></div>
                      </div>
                      ) : (
                        <div className="text-4xl font-bold text-blue-900">
                          {analyticsData.totalLeadsAssigned.toLocaleString()}
                          </div>
                        )}
            </CardContent>
          </Card>

                  {/* Open Leads Card */}
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-orange-700">
                          Open Leads
                  </CardTitle>
                        <button
                          className="text-orange-600 hover:text-orange-800"
                          title="Leads with status 'Pending' within the selected date range"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                  </div>
                      </CardHeader>
                      <CardContent>
                      {analyticsLoading ? (
                        <div className="animate-pulse">
                          <div className="h-10 bg-orange-200 rounded w-24 mb-2"></div>
                          </div>
                        ) : (
                        <div className="text-4xl font-bold text-orange-900">
                          {analyticsData.openLeads.toLocaleString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  {/* Won Leads Card */}
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-green-700">
                          Won Leads
                        </CardTitle>
                        <button
                          className="text-green-600 hover:text-green-800"
                          title="Leads with status 'Won' filtered by won timestamp"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                      </CardHeader>
                      <CardContent>
                      {analyticsLoading ? (
                        <div className="animate-pulse">
                          <div className="h-10 bg-green-200 rounded w-24 mb-2"></div>
                          </div>
                        ) : (
                        <div className="text-4xl font-bold text-green-900">
                          {analyticsData.wonLeads.toLocaleString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  {/* Lost Leads Card */}
                  <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-red-700">
                          Lost Leads
                        </CardTitle>
                        <button
                          className="text-red-600 hover:text-red-800"
                          title="Leads with status 'Lost' filtered by lost timestamp"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        </div>
                      </CardHeader>
                      <CardContent>
                      {analyticsLoading ? (
                        <div className="animate-pulse">
                          <div className="h-10 bg-red-200 rounded w-24 mb-2"></div>
                          </div>
                        ) : (
                        <div className="text-4xl font-bold text-red-900">
                          {analyticsData.lostLeads.toLocaleString()}
                                      </div>
                      )}
                                </CardContent>
                              </Card>
                          </div>
                  </div>
            )}

            {/* Fresh Leads Tab Content */}
            {activeTab === 'fresh-leads' && (
              <FreshLeadsTab />
            )}

            {/* Other Tab Content */}
            {activeTab === 'todays-followup' && (
              getCurrentTabLoading('todays-followup') ? (
                <TabSkeleton />
              ) : (
                <TodaysFollowupTab />
              )
            )}

            {activeTab === 'open-leads' && (
              getCurrentTabLoading('open-leads') ? (
                <TabSkeleton />
              ) : (
                <OpenLeadsTab />
              )
            )}

            {activeTab === 'waiting-approval' && (
              getCurrentTabLoading('waiting-approval') ? (
                <TabSkeleton />
              ) : (
                <WaitingApprovalTab />
              )
            )}

            {activeTab === 'booked' && (
              getCurrentTabLoading('booked') ? (
                <TabSkeleton />
              ) : (
                <BookedTab />
              )
            )}

            {activeTab === 'retailed' && (
              getCurrentTabLoading('retailed') ? (
                <TabSkeleton />
              ) : (
                <RetailedTab />
              )
            )}

            {activeTab === 'lost' && (
              getCurrentTabLoading('lost') ? (
                <TabSkeleton />
              ) : (
                <LostTab />
              )
            )}
          </div>
        </div>
      </RoleGuard>
    </DashboardLayout>
  )
}
