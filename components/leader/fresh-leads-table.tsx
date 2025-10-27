"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Phone,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Sparkles,
  User,
  Car,
  Calendar,
  Inbox,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useTabData } from '@/lib/hooks/useTabData'

interface FreshLead {
  id: string
  lead_uid: string
  customer_name: string
  customer_mobile_number: string
  model_interested?: string
  variant?: string
  lead_status: string
  final_status: string
  icrop_id?: string
  ps_name: string
  ps_id: string
  ps_branch?: string
  created_at: string
  assigned_at?: string
}

interface FreshLeadsTableProps {
  teamLeaderId: string
  psMembers: Array<{ id: string; full_name: string; branch: string }>
  onUpdateLead?: (lead: FreshLead) => void
  enabled?: boolean
}

export function FreshLeadsTable({ teamLeaderId, psMembers, onUpdateLead, enabled = true }: FreshLeadsTableProps) {
  // Only search filter remains local
  const [searchQuery, setSearchQuery] = useState('')

  // Use the custom hook for lazy-loaded data with pagination
  const {
    data: leads,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    totalCount,
  } = useTabData<FreshLead>({
    tabId: 'freshLeads',
    endpoint: '/api/team-leader/fresh-leads',
    teamLeaderId,
    enabled,
    pageSize: 25,
    dateField: 'ps_assigned_at',
  })

  // Apply search filter only (other filters are handled by the hook)
  const filteredLeads = useMemo(() => {
    let filtered = leads

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(lead =>
        lead.customer_name.toLowerCase().includes(query) ||
        lead.customer_mobile_number.includes(query) ||
        lead.lead_uid.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [leads, searchQuery])

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()

    if (statusLower === 'new' || statusLower === 'fresh') {
      return (
        <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-0 font-medium px-3 py-1">
          🆕 New
        </Badge>
      )
    }

    if (statusLower === 'pending') {
      return (
        <Badge className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 border-0 font-medium px-3 py-1">
          ⏳ Pending
        </Badge>
      )
    }

    if (statusLower === 'connected') {
      return (
        <Badge className="bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-0 font-medium px-3 py-1">
          ✅ Connected
        </Badge>
      )
    }

    if (statusLower === 'not connected' || statusLower === 'not_connected') {
      return (
        <Badge className="bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-0 font-medium px-3 py-1">
          ❌ Not Connected
        </Badge>
      )
    }

    return (
      <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-0 font-medium px-3 py-1">
        {status}
      </Badge>
    )
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    try {
      return format(new Date(dateString), 'dd MMM yyyy, hh:mm a')
    } catch {
      return dateString
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-600">Loading fresh leads...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Fresh Leads</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {totalCount > 0 ? (
                  <>
                    Showing {filteredLeads.length} of {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
                    {searchQuery && ` (filtered)`}
                  </>
                ) : (
                  <>No fresh leads</>
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={refresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="self-start md:self-auto"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Search Toolbar */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, mobile, or UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Active Search Filter Summary */}
          {searchQuery && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
              <Filter className="h-4 w-4" />
              <span>Search filter:</span>
              <Badge variant="secondary">Search: {searchQuery}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="h-6 text-xs"
              >
                Clear search
              </Button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Inbox className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-red-700">Error Loading Leads</h3>
              <p className="text-gray-500 text-sm">{error}</p>
              <Button onClick={refresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Data Table */}
        {!error && filteredLeads.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Inbox className="h-10 w-10 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700">No Fresh Leads</h3>
              <p className="text-gray-500 text-sm">
                No fresh leads for the selected date/PS. Try adjusting the date range or PS member filter.
              </p>
            </div>
          </div>
        ) : !error && filteredLeads.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-500 to-blue-600">
                  <th className="text-left p-3 md:p-4 font-semibold text-white text-sm md:text-base">
                    Lead Info
                  </th>
                  <th className="text-left p-3 md:p-4 font-semibold text-white text-sm md:text-base hidden lg:table-cell">
                    Assigned PS
                  </th>
                  <th className="text-left p-3 md:p-4 font-semibold text-white text-sm md:text-base hidden md:table-cell">
                    Vehicle Details
                  </th>
                  <th className="text-left p-3 md:p-4 font-semibold text-white text-sm md:text-base">
                    Status
                  </th>
                  <th className="text-left p-3 md:p-4 font-semibold text-white text-sm md:text-base hidden md:table-cell">
                    ICROP ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={cn(
                      "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    )}
                  >
                    {/* Lead Info */}
                    <td className="p-3 md:p-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-800 text-sm md:text-base">
                          {lead.customer_name}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{lead.customer_mobile_number}</span>
                        </div>
                        <div className="text-xs text-gray-500">{lead.lead_uid}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(lead.created_at)}
                        </div>

                        {/* Mobile: Show PS and Vehicle */}
                        <div className="lg:hidden mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{lead.ps_name}</span>
                          </div>
                          {lead.ps_branch && (
                            <div className="text-xs text-gray-500">{lead.ps_branch}</div>
                          )}
                        </div>

                        <div className="md:hidden mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            <span>{lead.model_interested || '—'}</span>
                          </div>
                          {lead.variant && (
                            <div className="text-xs text-gray-500">{lead.variant}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Assigned PS - Desktop Only */}
                    <td className="p-3 md:p-4 hidden lg:table-cell">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-800 text-sm flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          {lead.ps_name}
                        </div>
                        {lead.ps_branch && (
                          <div className="text-xs text-gray-500">{lead.ps_branch}</div>
                        )}
                      </div>
                    </td>

                    {/* Vehicle Details - Desktop Only */}
                    <td className="p-3 md:p-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-800 text-sm flex items-center gap-2">
                          <Car className="w-4 h-4 text-gray-600" />
                          {lead.model_interested || '—'}
                        </div>
                        {lead.variant && (
                          <div className="text-xs text-gray-500">{lead.variant}</div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3 md:p-4">
                      {getStatusBadge(lead.final_status || lead.lead_status)}

                      {/* Mobile: Show ICROP ID */}
                      {lead.icrop_id && (
                        <div className="md:hidden mt-2">
                          <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-0 font-medium px-2 py-1 text-xs">
                            {lead.icrop_id}
                          </Badge>
                        </div>
                      )}
                    </td>

                    {/* ICROP ID - Desktop Only */}
                    <td className="p-3 md:p-4 hidden md:table-cell">
                      {lead.icrop_id && (
                        <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-0 font-medium px-3 py-1">
                          {lead.icrop_id}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={loadMore}
                disabled={isLoadingMore}
                variant="outline"
                size="lg"
                className="min-w-[200px]"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Showing count */}
          {!hasMore && filteredLeads.length > 0 && (
            <div className="text-center mt-4 text-sm text-gray-500">
              Showing all {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
              {searchQuery && ` matching your search`}
            </div>
          )}
        </>
        ) : null}
      </CardContent>
    </Card>
  )
}
