'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, RefreshCw, ArrowLeft, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface DuplicateLead {
  uid: string
  customer_name: string
  customer_mobile_number: string
  source?: string
  sub_source?: string
  created_at?: string
  updated_at?: string
  is_dup: any // JSON data from is_dup column
  [key: string]: any // Allow other fields
}

interface DuplicateLeadsResponse {
  success: boolean
  leads: DuplicateLead[]
  count: number
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export default function ManageDuplicatesPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<DuplicateLead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<DuplicateLead | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pagination, setPagination] = useState({
    limit: 100,
    offset: 0,
    total: 0,
    has_more: false
  })

  const fetchLeads = async () => {
    try {
      setLoading(true)
      
      // Get auth token following the pattern used in other admin pages
      const getToken = () => {
        if (typeof window === 'undefined') return ''
        
        const possibleKeys = ['user', 'supabase_user', 'current_user']
        let session = null
        
        for (const key of possibleKeys) {
          const data = localStorage.getItem(key)
          if (data) {
            try {
              session = JSON.parse(data)
              if (session?.access_token) {
                return session.access_token
              }
            } catch (e) {
              // Continue to next key
            }
          }
        }
        
        // Fallback to direct token storage
        return localStorage.getItem('token') || localStorage.getItem('access_token') || ''
      }

      const token = getToken()
      
      if (!token) {
        toast.error('Authentication required. Please login again.')
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `/api/admin/leads/duplicate-is-dup?limit=${pagination.limit}&offset=${pagination.offset}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Authentication failed. Please login again.')
          router.push('/auth/login')
          return
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to fetch leads')
      }

      const data: DuplicateLeadsResponse = await response.json()
      
      setLeads(data.leads || [])
      setPagination({
        ...pagination,
        total: data.total || 0,
        has_more: data.has_more || false
      })
    } catch (error: any) {
      console.error('Error fetching duplicate leads:', error)
      toast.error(error.message || 'Failed to fetch duplicate leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [pagination.offset, pagination.limit])

  const handleViewDetails = (lead: DuplicateLead) => {
    setSelectedLead(lead)
    setIsDialogOpen(true)
  }

  const handlePreviousPage = () => {
    if (pagination.offset > 0) {
      setPagination({
        ...pagination,
        offset: Math.max(0, pagination.offset - pagination.limit)
      })
    }
  }

  const handleNextPage = () => {
    if (pagination.has_more) {
      setPagination({
        ...pagination,
        offset: pagination.offset + pagination.limit
      })
    }
  }

  const formatJSON = (data: any): string => {
    if (data === null || data === undefined) {
      return 'null'
    }
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return data
      }
    }
    return JSON.stringify(data, null, 2)
  }

  const renderJSONContent = (data: any) => {
    if (data === null || data === undefined) {
      return <div className="text-gray-500 italic">No data</div>
    }

    let parsed: any
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data)
      } catch {
        return <div className="text-gray-700 font-mono text-sm">{data}</div>
      }
    } else {
      parsed = data
    }

    // Handle arrays - display each item in a separate row section
    if (Array.isArray(parsed)) {
      return (
        <div className="space-y-4">
          {parsed.map((item, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="font-semibold text-blue-700 mb-3 pb-2 border-b border-gray-200">
                Attempt: {index + 1}
              </div>
              <div className="space-y-2">
                {typeof item === 'object' && item !== null ? (
                  Object.entries(item).map(([key, value]) => (
                    <div key={key} className="flex flex-wrap gap-2">
                      <span className="font-medium text-gray-700 min-w-[120px]">{key}:</span>
                      <span className="text-gray-900 flex-1">
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value)
                          : String(value || '-')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-700">{String(item)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Handle objects - display each key-value pair in a separate row
    if (typeof parsed === 'object' && parsed !== null) {
    return (
        <div className="space-y-4">
          {Object.entries(parsed).map(([key, value], index) => (
            <div key={key} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="font-semibold text-blue-700 mb-3 pb-2 border-b border-gray-200 capitalize">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="text-gray-700">
                {typeof value === 'object' && value !== null ? (
                  Array.isArray(value) ? (
                    <div className="space-y-2">
                      {value.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                          {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-2 rounded text-sm font-mono">
                      {JSON.stringify(value, null, 2)}
                    </div>
                  )
                ) : (
                  String(value || '-')
                )}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-gray-700">{String(parsed)}</div>
      </div>
    )
  }

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/dashboard')}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
        <div>
              <h1 className="text-3xl font-bold">Duplicate Leads (is_dup)</h1>
              <p className="text-gray-600">Leads with duplicate information stored in is_dup column</p>
            </div>
        </div>
          <Button onClick={fetchLeads} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

        {/* Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
            <CardDescription>Total leads with is_dup data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-sm text-muted-foreground">
              Showing {leads.length} of {pagination.total} leads
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Leads Table */}
        {!loading && leads.length > 0 && (
        <Card>
          <CardHeader>
              <CardTitle>Duplicate Leads</CardTitle>
            <CardDescription>
                Click "View Details" to see the JSON content from is_dup column
            </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UID</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Mobile Number</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Sub Source</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.uid}>
                        <TableCell className="font-mono text-sm">{lead.uid}</TableCell>
                        <TableCell>{lead.customer_name || '-'}</TableCell>
                        <TableCell className="font-mono">{lead.customer_mobile_number || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.source || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell>{lead.sub_source || '-'}</TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {lead.created_at
                            ? new Date(lead.created_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(lead)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
                  {Math.ceil(pagination.total / pagination.limit) || 1}
                  </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={pagination.offset === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!pagination.has_more}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Empty State */}
        {!loading && leads.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700">No Duplicate Leads Found!</h3>
              <p className="text-gray-600">
                There are currently no leads with is_dup data in the system.
              </p>
          </CardContent>
        </Card>
      )}

        {/* JSON Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Duplicate Information Details</DialogTitle>
              <DialogDescription>
                JSON content from is_dup column for lead: {selectedLead?.uid}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <h4 className="font-semibold mb-2">Lead Information:</h4>
                <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                  <div><strong>UID:</strong> {selectedLead?.uid}</div>
                  <div><strong>Name:</strong> {selectedLead?.customer_name || '-'}</div>
                  <div><strong>Mobile:</strong> {selectedLead?.customer_mobile_number || '-'}</div>
                  <div><strong>Source:</strong> {selectedLead?.source || '-'}</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Duplicate Data (is_dup):</h4>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                  {selectedLead ? renderJSONContent(selectedLead.is_dup) : null}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
    </DashboardLayout>
  )
}