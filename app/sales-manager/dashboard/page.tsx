'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  Calendar,
  AlertCircle,
  Check,
  X,
  Eye,
  RefreshCw,
  Sparkles,
  Activity,
  Award,
  Zap
} from 'lucide-react'

interface ApprovalRequest {
  id: string
  lead_uid: string
  request_type: 'booking' | 'retailed'
  booking_id?: string
  retailed_id?: string
  ps_name: string
  cre_name: string
  customer_name: string
  customer_mobile_number: string
  model_interested: string
  request_status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  created_at: string
}

interface LeadDetails {
  lead_uid: string
  customer_name: string
  customer_mobile_number: string
  model_interested: string
  variant: string
  buying_plan: string
  finance_option: string
  profession: string
  test_drive_type: string
  trade_in: string
  source: string
  cre_name: string
  ps_name: string
  ps_branch: string
}

const SalesManagerDashboard = () => {
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [approvalDialog, setApprovalDialog] = useState(false)
  const [rejectionDialog, setRejectionDialog] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'booking' | 'retail'>('booking')
  const [userBranch, setUserBranch] = useState<string | null>(null)

  // Get user's branch from localStorage on mount
  React.useEffect(() => {
    const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
    const parsed = session ? JSON.parse(session) : null
    const branch = parsed?.branch || null
    setUserBranch(branch)
    console.log('🏢 [Sales Manager] User branch:', branch)
  }, [])

  // Load approval requests - FILTERED BY BRANCH
  const loadApprovalRequests = async () => {
    try {
      setLoading(true)
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      const branch = parsed?.branch || ''

      if (!branch) {
        console.warn('⚠️ Sales Manager has no branch assigned!')
        setLoading(false)
        return
      }

      // Pass branch filter to API
      const response = await fetch(`/api/qualified-leads/pending-approvals?branch=${encodeURIComponent(branch)}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setApprovalRequests(data)
        console.log(`✅ [Sales Manager] Loaded ${data.length} approval requests for branch: ${branch}`, data)
      } else {
        console.error('❌ Failed to load approval requests')
      }
    } catch (error) {
      console.error('❌ Error loading approval requests:', error)
    } finally {
      setLoading(false)
    }
  }


  // Approve request
  const approveRequest = async () => {
    if (!selectedRequest) return

    try {
      setProcessing(true)
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/qualified-leads/approve?lead_uid=${selectedRequest.lead_uid}&approval_type=${selectedRequest.request_type}&_t=${Date.now()}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Request approved successfully')
        // Optimistically update local state so the item disappears immediately from Pending
        setApprovalRequests(prev => prev.map(r => 
          (r.lead_uid === selectedRequest.lead_uid && r.request_type === selectedRequest.request_type)
            ? { ...r, request_status: 'approved' }
            : r
        ))
        setApprovalDialog(false)
        setApprovalNotes('')
        setSelectedRequest(null)
        // Safety refresh after short delay to ensure backend propagation
        setTimeout(() => loadApprovalRequests(), 800)
      } else {
        console.error('❌ Failed to approve request')
      }
    } catch (error) {
      console.error('❌ Error approving request:', error)
    } finally {
      setProcessing(false)
    }
  }

  // Reject request
  const rejectRequest = async () => {
    if (!selectedRequest) return

    try {
      setProcessing(true)
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/qualified-leads/reject?lead_uid=${selectedRequest.lead_uid}&approval_type=${selectedRequest.request_type}&_t=${Date.now()}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Request rejected successfully')
        // Optimistic local update
        setApprovalRequests(prev => prev.map(r => 
          (r.lead_uid === selectedRequest.lead_uid && r.request_type === selectedRequest.request_type)
            ? { ...r, request_status: 'rejected' }
            : r
        ))
        setRejectionDialog(false)
        setRejectionReason('')
        setSelectedRequest(null)
        setTimeout(() => loadApprovalRequests(), 800)
      } else {
        console.error('❌ Failed to reject request')
      }
    } catch (error) {
      console.error('❌ Error rejecting request:', error)
    } finally {
      setProcessing(false)
    }
  }

  // Calculate stats
  const stats = {
    pending: approvalRequests.filter(r => r.request_status === 'pending').length,
    approved: approvalRequests.filter(r => r.request_status === 'approved').length,
    rejected: approvalRequests.filter(r => r.request_status === 'rejected').length,
    total: approvalRequests.length
  }

  // Separate booking and retail requests
  const bookingRequests = approvalRequests.filter(r => r.request_type === 'booking')
  const retailRequests = approvalRequests.filter(r => r.request_type === 'retailed')

  // Calculate stats for each section
  const bookingStats = {
    pending: bookingRequests.filter(r => r.request_status === 'pending').length,
    approved: bookingRequests.filter(r => r.request_status === 'approved').length,
    rejected: bookingRequests.filter(r => r.request_status === 'rejected').length,
    total: bookingRequests.length
  }

  const retailStats = {
    pending: retailRequests.filter(r => r.request_status === 'pending').length,
    approved: retailRequests.filter(r => r.request_status === 'approved').length,
    rejected: retailRequests.filter(r => r.request_status === 'rejected').length,
    total: retailRequests.length
  }

  useEffect(() => {
    loadApprovalRequests()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'booked':
        return <Badge className="bg-blue-100 text-blue-800">📋 Booked</Badge>
      case 'retailed':
        return <Badge className="bg-purple-100 text-purple-800">🚗 Retailed</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-orange-200/10 to-orange-300/10 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-to-br from-orange-100/15 to-orange-200/15 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-gradient-to-br from-blue-200/10 to-blue-300/10 rounded-full blur-lg"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-8">
          {/* Header */}
          <Card className="bg-white shadow-xl rounded-xl sm:rounded-2xl overflow-hidden border-0 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 opacity-90"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
            <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-8 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white drop-shadow-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg sm:text-3xl font-bold text-white truncate drop-shadow-sm">Sales Manager Dashboard</h1>
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 animate-pulse" />
                    </div>
                    <p className="text-xs sm:text-base text-orange-100 mt-0.5 sm:mt-1 hidden sm:block drop-shadow-sm">
                      Approve booking and retail requests from PS/GEM team {userBranch ? `at ${userBranch}` : ''}
                    </p>
                    <p className="text-xs text-orange-100 mt-0.5 sm:hidden drop-shadow-sm">
                      Approve requests {userBranch ? `at ${userBranch}` : ''}
                    </p>
                    {userBranch && (
                      <Badge className="bg-white/20 text-white px-2 py-1 text-xs mt-1 backdrop-blur-sm">
                        📍 {userBranch}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <Button 
                    onClick={loadApprovalRequests}
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-2 sm:px-4 backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
            <Card className="bg-white shadow-lg rounded-2xl overflow-hidden border-0 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Pending</p>
                    <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.pending}</p>
                    <p className="text-xs text-gray-500 hidden sm:block">Awaiting approval</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                    <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl overflow-hidden border-0 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Approved</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.approved}</p>
                    <p className="text-xs text-gray-500 hidden sm:block">Successfully approved</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl overflow-hidden border-0 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Rejected</p>
                    <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.rejected}</p>
                    <p className="text-xs text-gray-500 hidden sm:block">Requests rejected</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center">
                    <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl overflow-hidden border-0 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.total}</p>
                    <p className="text-xs text-gray-500 hidden sm:block">All requests</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              onClick={() => setActiveTab('booking')}
              size="sm"
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 shadow-md hover:shadow-lg ${
                activeTab === 'booking'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:border-orange-300'
              }`}
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Booking ({bookingStats.total})</span>
              <span className="sm:hidden ml-1">Booking</span>
            </Button>
            <Button
              onClick={() => setActiveTab('retail')}
              size="sm"
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 shadow-md hover:shadow-lg ${
                activeTab === 'retail'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:border-orange-300'
              }`}
            >
              <Award className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Retail ({retailStats.total})</span>
              <span className="sm:hidden ml-1">Retail</span>
            </Button>
          </div>

          {/* Requests Section */}
          <Card className="bg-white shadow-xl rounded-xl sm:rounded-2xl overflow-hidden border-0">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-8 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    {activeTab === 'booking' ? (
                      <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-white drop-shadow-sm" />
                    ) : (
                      <Award className="w-4 h-4 sm:w-6 sm:h-6 text-white drop-shadow-sm" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-2xl font-bold text-white truncate drop-shadow-sm">
                        {activeTab === 'booking' ? 'Booking Requests' : 'Retail Requests'}
                      </h2>
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 animate-pulse" />
                    </div>
                    <p className="text-xs sm:text-base text-orange-100 mt-0.5 sm:mt-1 hidden sm:block drop-shadow-sm">
                      {activeTab === 'booking' 
                        ? 'Review and approve booking requests from PS/GEM team'
                        : 'Review and approve retail requests from PS/GEM team'
                      }
                    </p>
                    <p className="text-xs text-orange-100 mt-0.5 sm:hidden drop-shadow-sm">
                      {activeTab === 'booking' ? 'Booking requests' : 'Retail requests'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <div className="bg-white/20 px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                    <span className="text-white">Pending: {activeTab === 'booking' ? bookingStats.pending : retailStats.pending}</span>
                  </div>
                  <div className="bg-green-500/20 px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                    <span className="text-white">Approved: {activeTab === 'booking' ? bookingStats.approved : retailStats.approved}</span>
                  </div>
                  <div className="bg-red-500/20 px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                    <span className="text-white">Rejected: {activeTab === 'booking' ? bookingStats.rejected : retailStats.rejected}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
            {loading ? (
              <div className="p-4 sm:p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 mx-auto border-orange-600"></div>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                  Loading {activeTab === 'booking' ? 'booking' : 'retail'} requests...
                </p>
              </div>
            ) : (activeTab === 'booking' ? bookingRequests : retailRequests).length === 0 ? (
              <div className="p-4 sm:p-8 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                  No {activeTab === 'booking' ? 'booking' : 'retail'} requests
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  No {activeTab === 'booking' ? 'booking' : 'retail'} requests found!
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="space-y-4 p-4 sm:p-6 md:hidden">
                  {(activeTab === 'booking' ? bookingRequests : retailRequests).map((request) => (
                    <Card key={request.id} className="bg-white shadow-md rounded-xl border-0 hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4 sm:p-6">
                        {/* Customer Information Section */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{request.customer_name}</h3>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm">{request.customer_mobile_number}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(request.request_status)}
                          </div>
                        </div>

                        {/* Vehicle Details Section */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Award className="w-4 h-4 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{request.model_interested}</h4>
                              <div className="text-xs text-gray-600 mt-1">
                                {activeTab === 'booking' ? (
                                  <>
                                    {request.booking_id && (
                                      <div className="mb-1">
                                        <span className="font-medium">Order No:</span> {request.booking_id}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {request.retailed_id && (
                                      <div className="mb-1">
                                        <span className="font-medium">DN No:</span> {request.retailed_id}
                                      </div>
                                    )}
                                  </>
                                )}
                                <div>Request Type: {activeTab === 'booking' ? 'Booking' : 'Retail'}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PS/GEM Details */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-sm text-gray-600">
                            <div>CRE: <span className="font-medium">{request.cre_name}</span></div>
                            <div>PS: <span className="font-medium">{request.ps_name}</span></div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(request.requested_at)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 justify-end">
                          {request.request_status === 'pending' && (
                            <>
                              <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request)
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Approve
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Approve {activeTab === 'booking' ? 'Booking' : 'Retail'} Request
                                    </DialogTitle>
                                    <DialogDescription>
                                      Approve the {activeTab === 'booking' ? 'booking' : 'retail'} request for lead {request.lead_uid}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                                      <Textarea
                                        id="approval-notes"
                                        value={approvalNotes}
                                        onChange={(e) => setApprovalNotes(e.target.value)}
                                        placeholder="Add any notes about this approval..."
                                        className="mt-1"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setApprovalDialog(false)
                                          setApprovalNotes('')
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={approveRequest}
                                        disabled={processing}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        {processing ? 'Processing...' : 'Approve Request'}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Dialog open={rejectionDialog} onOpenChange={setRejectionDialog}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedRequest(request)
                                    }}
                                    className="px-4 py-2"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Reject
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Reject {activeTab === 'booking' ? 'Booking' : 'Retail'} Request
                                    </DialogTitle>
                                    <DialogDescription>
                                      Reject the {activeTab === 'booking' ? 'booking' : 'retail'} request for lead {request.lead_uid}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                                      <Textarea
                                        id="rejection-reason"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Please provide a reason for rejection..."
                                        className="mt-1"
                                        required
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setRejectionDialog(false)
                                          setRejectionReason('')
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={rejectRequest}
                                        disabled={processing || !rejectionReason.trim()}
                                        variant="destructive"
                                      >
                                        {processing ? 'Processing...' : 'Reject Request'}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                          
                          {request.request_status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => console.log('View lead:', request.lead_uid)}
                              className="px-4 py-2"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          )}
                        </div>

                        {/* ICROP ID */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">ICROP:</span>
                            <Badge className="bg-purple-100 text-purple-800 text-xs px-2 py-1">
                              {request.lead_uid}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left p-4 font-semibold text-gray-700">Request Details</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Lead Info</th>
                        <th className="text-left p-4 font-semibold text-gray-700">PS/GEM Details</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Requested</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeTab === 'booking' ? bookingRequests : retailRequests).map((request) => (
                        <tr key={request.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-800">{request.lead_uid}</div>
                              {activeTab === 'booking' ? (
                                <>
                                  <Badge className="bg-orange-100 text-orange-800 text-xs">📋 Booking</Badge>
                                  {request.booking_id && (
                                    <div className="text-xs text-gray-600">
                                      <span className="font-medium">Order No:</span> {request.booking_id}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Badge className="bg-orange-100 text-orange-800 text-xs">🚗 Retail</Badge>
                                  {request.retailed_id && (
                                    <div className="text-xs text-gray-600">
                                      <span className="font-medium">DN No:</span> {request.retailed_id}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-800">{request.customer_name}</div>
                              <div className="text-sm text-gray-600">{request.customer_mobile_number}</div>
                              <div className="text-xs text-gray-500">{request.model_interested}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="text-sm text-gray-600">CRE: {request.cre_name}</div>
                              <div className="text-sm text-gray-600">PS: {request.ps_name}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(request.request_status)}
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-gray-700">{formatDate(request.requested_at)}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {request.request_status === 'pending' && (
                                <>
                                  <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setSelectedRequest(request)
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <Check className="w-3 h-3 mr-1" />
                                        Approve
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Approve {activeTab === 'booking' ? 'Booking' : 'Retail'} Request
                                        </DialogTitle>
                                        <DialogDescription>
                                          Approve the {activeTab === 'booking' ? 'booking' : 'retail'} request for lead {request.lead_uid}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                                          <Textarea
                                            id="approval-notes"
                                            value={approvalNotes}
                                            onChange={(e) => setApprovalNotes(e.target.value)}
                                            placeholder="Add any notes about this approval..."
                                            className="mt-1"
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              setApprovalDialog(false)
                                              setApprovalNotes('')
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            onClick={approveRequest}
                                            disabled={processing}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            {processing ? 'Processing...' : 'Approve Request'}
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                  <Dialog open={rejectionDialog} onOpenChange={setRejectionDialog}>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          setSelectedRequest(request)
                                        }}
                                      >
                                        <X className="w-3 h-3 mr-1" />
                                        Reject
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Reject {activeTab === 'booking' ? 'Booking' : 'Retail'} Request
                                        </DialogTitle>
                                        <DialogDescription>
                                          Reject the {activeTab === 'booking' ? 'booking' : 'retail'} request for lead {request.lead_uid}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                                          <Textarea
                                            id="rejection-reason"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Please provide a reason for rejection..."
                                            className="mt-1"
                                            required
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              setRejectionDialog(false)
                                              setRejectionReason('')
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            onClick={rejectRequest}
                                            disabled={processing || !rejectionReason.trim()}
                                            variant="destructive"
                                          >
                                            {processing ? 'Processing...' : 'Reject Request'}
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </>
                              )}
                              
                              {request.request_status !== 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => console.log('View lead:', request.lead_uid)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default SalesManagerDashboard
