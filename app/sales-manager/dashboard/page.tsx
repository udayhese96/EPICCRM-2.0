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
  RefreshCw
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

  // Load approval requests
  const loadApprovalRequests = async () => {
    try {
      setLoading(true)
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch('http://localhost:8000/api/qualified-leads/pending-approvals', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setApprovalRequests(data)
        console.log('✅ Approval requests loaded:', data)
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

      const response = await fetch(`http://localhost:8000/api/qualified-leads/approve?lead_uid=${selectedRequest.lead_uid}&approval_type=${selectedRequest.request_type}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Request approved successfully')
        setApprovalDialog(false)
        setApprovalNotes('')
        setSelectedRequest(null)
        loadApprovalRequests()
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

      const response = await fetch(`http://localhost:8000/api/qualified-leads/reject?lead_uid=${selectedRequest.lead_uid}&approval_type=${selectedRequest.request_type}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Request rejected successfully')
        setRejectionDialog(false)
        setRejectionReason('')
        setSelectedRequest(null)
        loadApprovalRequests()
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Sales Manager Dashboard</h1>
            <p className="text-gray-600 text-lg">Approve booking and retail requests from PS/GEM team</p>
          </div>
          <Button 
            onClick={loadApprovalRequests}
            className="mt-4 md:mt-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-800 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-700">{stats.pending}</div>
              <p className="text-sm text-yellow-600">Awaiting your approval</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">{stats.approved}</div>
              <p className="text-sm text-green-600">Successfully approved</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-800 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700">{stats.rejected}</div>
              <p className="text-sm text-red-600">Requests rejected</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
              <p className="text-sm text-blue-600">All time requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('booking')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'booking'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            📋 Booking Requests ({bookingStats.total})
          </Button>
          <Button
            onClick={() => setActiveTab('retail')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'retail'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            🚗 Retail Requests ({retailStats.total})
          </Button>
        </div>

        {/* Requests Section */}
        <Card className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <CardHeader className={`text-white ${
            activeTab === 'booking' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
              : 'bg-gradient-to-r from-purple-600 to-purple-700'
          }`}>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              {activeTab === 'booking' ? '📋 Booking Requests' : '🚗 Retail Requests'}
            </CardTitle>
            <CardDescription className={`${
              activeTab === 'booking' ? 'text-blue-100' : 'text-purple-100'
            }`}>
              {activeTab === 'booking' 
                ? 'Review and approve booking requests from PS/GEM team'
                : 'Review and approve retail requests from PS/GEM team'
              }
            </CardDescription>
            <div className="flex gap-4 mt-4">
              <div className={`px-3 py-1 rounded-full text-sm ${
                activeTab === 'booking' ? 'bg-blue-500/20' : 'bg-purple-500/20'
              }`}>
                Pending: {activeTab === 'booking' ? bookingStats.pending : retailStats.pending}
              </div>
              <div className="bg-green-500/20 px-3 py-1 rounded-full text-sm">
                Approved: {activeTab === 'booking' ? bookingStats.approved : retailStats.approved}
              </div>
              <div className="bg-red-500/20 px-3 py-1 rounded-full text-sm">
                Rejected: {activeTab === 'booking' ? bookingStats.rejected : retailStats.rejected}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${
                  activeTab === 'booking' ? 'border-blue-600' : 'border-purple-600'
                }`}></div>
                <p className="mt-2 text-gray-600">
                  Loading {activeTab === 'booking' ? 'booking' : 'retail'} requests...
                </p>
              </div>
            ) : (activeTab === 'booking' ? bookingRequests : retailRequests).length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No {activeTab === 'booking' ? 'booking' : 'retail'} requests
                </h3>
                <p className="text-gray-600">
                  No {activeTab === 'booking' ? 'booking' : 'retail'} requests found!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
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
                                <Badge className="bg-blue-100 text-blue-800">📋 Booking</Badge>
                                {request.booking_id && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Order No:</span> {request.booking_id}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <Badge className="bg-purple-100 text-purple-800">🚗 Retail</Badge>
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
            )}
          </CardContent>
        </Card>

        </div>
      </div>
    </DashboardLayout>
  )
}

export default SalesManagerDashboard
