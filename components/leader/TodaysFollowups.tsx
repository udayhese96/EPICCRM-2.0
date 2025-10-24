"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Phone,
  Search,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Target,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  AlertTriangle
} from 'lucide-react'

interface FollowupLead {
  id: string
  lead_uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  vehicle_make?: string
  vehicle_model?: string
  vehicle_variant?: string
  lead_status: string
  icrop_id?: string
  next_followup_date: string
  followup_count: number
  assigned_ps_name: string
  created_at: string
  is_overdue: boolean
  days_overdue?: number
}

interface KPIData {
  total_due_today: number
  overdue: number
  completed_today: number
  pending: number
}

interface TodaysFollowupsProps {
  teamLeaderId: string
}

export function TodaysFollowups({ teamLeaderId }: TodaysFollowupsProps) {
  const [leads, setLeads] = useState<FollowupLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<FollowupLead[]>([])
  const [kpis, setKpis] = useState<KPIData>({
    total_due_today: 0,
    overdue: 0,
    completed_today: 0,
    pending: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [memberFilter, setMemberFilter] = useState('all')
  const [psMembers, setPsMembers] = useState<string[]>([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (teamLeaderId) {
      fetchFollowups()
    }
  }, [teamLeaderId, dateFilter, memberFilter])

  useEffect(() => {
    // Apply search filter
    let filtered = leads

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(lead =>
        lead.customer_name.toLowerCase().includes(query) ||
        lead.customer_mobile_number.includes(query) ||
        lead.lead_uid.toLowerCase().includes(query)
      )
    }

    setFilteredLeads(filtered)
    setCurrentPage(1) // Reset to first page on filter change
  }, [searchQuery, leads])

  const fetchFollowups = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        team_leader_id: teamLeaderId,
        date: dateFilter,
        ps_member: memberFilter
      })

      const response = await fetch(`/api/team-leader/todays-followups?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch follow-ups')
      }

      const data = await response.json()
      setLeads(data.leads || [])
      setFilteredLeads(data.leads || [])
      setKpis(data.kpis || {
        total_due_today: 0,
        overdue: 0,
        completed_today: 0,
        pending: 0
      })

      // Extract unique PS members
      const uniquePS = Array.from(new Set(data.leads?.map((lead: FollowupLead) => lead.assigned_ps_name) || []))
      setPsMembers(uniquePS as string[])

    } catch (error) {
      console.error('Error fetching follow-ups:', error)
      setLeads([])
      setFilteredLeads([])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('connected')) return 'bg-green-100 text-green-800 border-green-300'
    if (statusLower.includes('not connected')) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (statusLower.includes('closed won')) return 'bg-blue-100 text-blue-800 border-blue-300'
    if (statusLower.includes('closed lost')) return 'bg-red-100 text-red-800 border-red-300'
    return 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('connected')) return <CheckCircle2 className="h-3 w-3" />
    if (statusLower.includes('not connected')) return <XCircle className="h-3 w-3" />
    if (statusLower.includes('closed won')) return <Target className="h-3 w-3" />
    if (statusLower.includes('closed lost')) return <AlertCircle className="h-3 w-3" />
    return <Clock className="h-3 w-3" />
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
          <CardTitle className="text-xl flex items-center">
            <CalendarDays className="h-5 w-5 mr-2 text-orange-600" />
            Today's Follow-ups
          </CardTitle>
          <CardDescription>Loading follow-up data...</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
            <p className="text-gray-500">Loading follow-ups...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg rounded-2xl">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
        <CardTitle className="text-xl flex items-center">
          <CalendarDays className="h-5 w-5 mr-2 text-orange-600" />
          Today's Follow-ups
        </CardTitle>
        <CardDescription>Track and manage today's scheduled follow-up calls</CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        {/* KPI Chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{kpis.total_due_today}</p>
              <p className="text-xs text-blue-700">Total Due Today</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-900">{kpis.overdue}</p>
              <p className="text-xs text-red-700">Overdue</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">{kpis.completed_today}</p>
              <p className="text-xs text-green-700">Completed Today</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-900">{kpis.pending}</p>
              <p className="text-xs text-yellow-700">Pending</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, mobile, or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full md:w-48 bg-white border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={memberFilter} onValueChange={setMemberFilter}>
            <SelectTrigger className="w-full md:w-52 bg-white border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PS Members</SelectItem>
              {psMembers.map((member) => (
                <SelectItem key={member} value={member}>
                  {member}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 sticky top-0 z-10">
              <tr className="text-sm text-gray-700 border-b border-gray-300">
                <th className="px-4 py-3 text-left font-semibold">Lead Info</th>
                <th className="px-4 py-3 text-left font-semibold">Vehicle Details</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">ICROP ID</th>
                <th className="px-4 py-3 text-left font-semibold">Next Call</th>
                <th className="px-4 py-3 text-left font-semibold">Assigned PS</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedLeads.length > 0 ? (
                paginatedLeads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-orange-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    {/* Lead Info */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 text-base">{lead.customer_name}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="h-3 w-3 text-orange-500" />
                          <span>{lead.customer_mobile_number}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700">
                            {lead.source}
                          </Badge>
                          <span className="text-xs text-gray-500">{lead.lead_uid}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Created: {formatDate(lead.created_at)} at {formatTime(lead.created_at)}
                        </p>
                      </div>
                    </td>

                    {/* Vehicle Details */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {lead.vehicle_make && lead.vehicle_model ? (
                          <>
                            <p className="font-medium text-gray-900 text-sm">
                              {lead.vehicle_make} {lead.vehicle_model}
                            </p>
                            {lead.vehicle_variant && (
                              <p className="text-xs text-gray-600">{lead.vehicle_variant}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">Not specified</p>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <Badge className={`${getStatusColor(lead.lead_status)} border`}>
                        {getStatusIcon(lead.lead_status)}
                        <span className="ml-1 text-xs">{lead.lead_status}</span>
                      </Badge>
                    </td>

                    {/* ICROP ID */}
                    <td className="px-4 py-4">
                      {lead.icrop_id ? (
                        <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
                          {lead.icrop_id}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>

                    {/* Next Call */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">Call #{lead.followup_count}</p>
                        <p className="text-xs text-gray-600">
                          {formatDate(lead.next_followup_date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTime(lead.next_followup_date)}
                        </p>
                        {lead.is_overdue && (
                          <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue: {lead.days_overdue}d
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Assigned PS */}
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{lead.assigned_ps_name}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        Update
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                        <CalendarDays className="h-10 w-10 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-600">No follow-ups for today</p>
                        <p className="text-sm text-gray-400 mt-1">
                          All clear! Your team is up to date.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {paginatedLeads.length > 0 ? (
            paginatedLeads.map((lead) => (
              <Card key={lead.id} className="shadow-md rounded-2xl border border-gray-200 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Lead Info */}
                  <div className="space-y-2">
                    <p className="font-semibold text-lg text-gray-900">{lead.customer_name}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 text-orange-500" />
                      <span>{lead.customer_mobile_number}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700">
                        {lead.source}
                      </Badge>
                      <span className="text-xs text-gray-500">{lead.lead_uid}</span>
                    </div>
                  </div>

                  {/* Next Call / Overdue */}
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600">Next Call: Call #{lead.followup_count}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(lead.next_followup_date)} at {formatTime(lead.next_followup_date)}
                      </p>
                    </div>
                    {lead.is_overdue && (
                      <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {lead.days_overdue}d
                      </Badge>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Status</p>
                    <Badge className={`${getStatusColor(lead.lead_status)} border`}>
                      {getStatusIcon(lead.lead_status)}
                      <span className="ml-1 text-xs">{lead.lead_status}</span>
                    </Badge>
                  </div>

                  {/* Assigned PS */}
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{lead.assigned_ps_name}</span>
                  </div>

                  {/* Vehicle */}
                  {lead.vehicle_make && lead.vehicle_model && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Vehicle</p>
                      <p className="text-sm font-medium text-gray-900">
                        {lead.vehicle_make} {lead.vehicle_model}
                        {lead.vehicle_variant && ` - ${lead.vehicle_variant}`}
                      </p>
                    </div>
                  )}

                  {/* ICROP */}
                  {lead.icrop_id && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">ICROP ID</p>
                      <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
                        {lead.icrop_id}
                      </Badge>
                    </div>
                  )}

                  {/* Action */}
                  <div className="pt-2 border-t border-gray-200 flex justify-end">
                    <Button
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Update
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="shadow-md rounded-2xl border border-gray-200">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="h-10 w-10 text-gray-300" />
                </div>
                <p className="text-lg font-medium text-gray-600">No follow-ups for today</p>
                <p className="text-sm text-gray-400 mt-1">
                  All clear! Your team is up to date.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pagination */}
        {filteredLeads.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} results
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-gray-300"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={currentPage === pageNum ? "bg-orange-500 hover:bg-orange-600" : "border-gray-300"}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-300"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
