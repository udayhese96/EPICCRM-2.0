"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, User, Calendar, RefreshCw, FileText, Car } from "lucide-react"

interface Remark {
  type: 'CRE' | 'PS'
  call_number: number
  remark: string
  lead_status?: string
  date: string
  user: string
}

interface RemarksSyncProps {
  isOpen: boolean
  onClose: () => void
  leadUid: string
  customerName: string
}

export function RemarksSync({ isOpen, onClose, leadUid, customerName }: RemarksSyncProps) {
  const [remarks, setRemarks] = useState<Remark[]>([])
  const [pendingReasons, setPendingReasons] = useState<Array<{
    attempt: number
    reason: string
    status: string
    date: string
    user?: string
  }>>([])
  const [existingRemarks, setExistingRemarks] = useState<string | null>(null)
  const [overallFinalStatus, setOverallFinalStatus] = useState<string>('')
  const [overallLeadStatus, setOverallLeadStatus] = useState<string>('')
  const [qualificationDetails, setQualificationDetails] = useState<{
    model_interested?: string
    variant?: string
    buying_plan?: string
    finance_option?: string
    trade_in?: string
    trade_in_make?: string
    trade_in_model?: string
    trade_in_year?: string
    trade_in_km?: string
    trade_in_ownership?: string
    test_drive_type?: string
  }>({})
  const [showTradeInDialog, setShowTradeInDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTimer, setRefreshTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const fetchRemarks = async () => {
    if (!leadUid) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/leads/${leadUid}/remarks?_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRemarks(data.remarks || [])
        setPendingReasons(data.pending_reasons || [])
        setExistingRemarks(data.existing_remarks || null)
        setOverallFinalStatus(data.overall_final_status || '')
        setOverallLeadStatus(data.overall_lead_status || '')
        setQualificationDetails({
          model_interested: data.model_interested || '',
          variant: data.variant || '',
          buying_plan: data.buying_plan || '',
          finance_option: data.finance_option || '',
          trade_in: data.trade_in || '',
          trade_in_make: data.trade_in_make || '',
          trade_in_model: data.trade_in_model || '',
          trade_in_year: data.trade_in_year || '',
          trade_in_km: data.trade_in_km || '',
          trade_in_ownership: data.trade_in_ownership || '',
          test_drive_type: data.test_drive_type || ''
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch remarks')
      }
    } catch (err) {
      console.error('Error fetching remarks:', err)
      setError('Failed to fetch remarks')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && leadUid) {
      fetchRemarks()
    }
  }, [isOpen, leadUid])

  // Realtime: listen for changes to this lead in lead_master and refresh
  useEffect(() => {
    if (!isOpen || !leadUid) return
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`remarks_lead_${leadUid}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'lead_master',
          filter: `uid=eq.${leadUid}`
        }, () => {
          // Immediate refresh + staggered follow-up for eventual consistency
          fetchRemarks()
          setTimeout(() => fetchRemarks(), 700)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch {}
  }, [isOpen, leadUid])

  useEffect(() => {
    if (!isOpen) return
    const handler = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }
      const t = setTimeout(() => fetchRemarks(), 300)
      setRefreshTimer(t)
    }
    window.addEventListener('lead-master-updated', handler as any)
    window.addEventListener('lead-status-changed', handler as any)
    return () => {
      window.removeEventListener('lead-master-updated', handler as any)
      window.removeEventListener('lead-status-changed', handler as any)
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [isOpen, leadUid, refreshTimer])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      })
    } catch {
      return dateString
    }
  }

  const getRemarkTypeColor = (type: 'CRE' | 'PS') => {
    return type === 'CRE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  const getRemarkTypeIcon = (type: 'CRE' | 'PS') => {
    return type === 'CRE' ? '👨‍💼' : '👩‍💼'
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Call Remarks History
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {customerName} ({leadUid})
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRemarks}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading remarks...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-red-600 mb-2">❌ Error</div>
                <p className="text-sm text-gray-600">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchRemarks}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Overall status badge */}
                {(overallFinalStatus || overallLeadStatus) && (
                  <div className="border rounded-lg p-3 bg-white">
                    {overallFinalStatus && (
                      <Badge className={overallFinalStatus === 'Won' ? 'bg-green-100 text-green-800' : overallFinalStatus === 'Lost' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                        {overallFinalStatus}
                      </Badge>
                    )}
                    {!overallFinalStatus && overallLeadStatus && (
                      <Badge className="bg-gray-100 text-gray-800">{overallLeadStatus}</Badge>
                    )}
                  </div>
                )}

                {/* Qualification Details */}
                {(qualificationDetails.model_interested || qualificationDetails.variant || qualificationDetails.buying_plan || qualificationDetails.finance_option || qualificationDetails.trade_in || qualificationDetails.test_drive_type) && (
                  <div className="border rounded-lg p-4 bg-blue-50 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-2 mb-3">
                      <Car className="h-4 w-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-gray-800">Qualification Details</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {qualificationDetails.model_interested && (
                        <div className="bg-white rounded p-2 border border-blue-100">
                          <div className="text-xs text-gray-500 mb-1">Model Interested</div>
                          <div className="text-sm font-medium text-gray-800">{qualificationDetails.model_interested}</div>
                        </div>
                      )}
                      {qualificationDetails.variant && (
                        <div className="bg-white rounded p-2 border border-blue-100">
                          <div className="text-xs text-gray-500 mb-1">Variant</div>
                          <div className="text-sm font-medium text-gray-800">{qualificationDetails.variant}</div>
                        </div>
                      )}
                      {qualificationDetails.buying_plan && (
                        <div className="bg-white rounded p-2 border border-blue-100">
                          <div className="text-xs text-gray-500 mb-1">Buying Plan</div>
                          <div className="text-sm font-medium text-gray-800">{qualificationDetails.buying_plan}</div>
                        </div>
                      )}
                      {qualificationDetails.finance_option && (
                        <div className="bg-white rounded p-2 border border-blue-100">
                          <div className="text-xs text-gray-500 mb-1">Finance Option</div>
                          <div className="text-sm font-medium text-gray-800">{qualificationDetails.finance_option}</div>
                        </div>
                      )}
                      {qualificationDetails.trade_in && (
                        <div className="bg-white rounded p-2 border border-blue-100">
                          <div className="text-xs text-gray-500 mb-1">Trade-in</div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-800">{qualificationDetails.trade_in}</div>
                            {qualificationDetails.trade_in === 'Yes' && qualificationDetails.trade_in_make && (
                              <Button 
                                type="button"
                                size="sm" 
                                variant="outline" 
                                className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                onClick={() => setShowTradeInDialog(true)}
                              >
                                View Details
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      {qualificationDetails.test_drive_type && (
                        <div className="bg-white rounded p-2 border border-blue-100">
                          <div className="text-xs text-gray-500 mb-1">Test Drive</div>
                          <div className="text-sm font-medium text-gray-800">{qualificationDetails.test_drive_type}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pending Reasons Section - Multiple attempts */}
                {pendingReasons.length > 0 && (
                  <div className="border rounded-lg p-4 border-l-4 border-l-amber-500 bg-amber-50">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <Badge className="bg-amber-100 text-amber-800">
                        📝 Pending Attempts ({pendingReasons.length})
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {pendingReasons.map((reason, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Attempt #{reason.attempt}
                              </Badge>
                              <Badge className="text-xs bg-orange-100 text-orange-800">
                                {reason.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {formatDate(reason.date)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            {reason.reason}
                          </div>
                          {reason.user && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              {reason.user}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing Remarks Section - Unqualified/Lost leads */}
                {existingRemarks && ((overallFinalStatus || '').toLowerCase() === 'lost') && (
                  <div className="border rounded-lg p-4 border-l-4 border-l-red-500 bg-red-50">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-red-600" />
                      <Badge className="bg-red-100 text-red-800">
                        ❌ Lost/Unqualified Reason
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {existingRemarks}
                    </div>
                  </div>
                )}
                
                {/* Show "No Remarks Found" only if no pending reasons, no existing remarks AND no regular remarks */}
                {pendingReasons.length === 0 && !existingRemarks && remarks.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-gray-600 mb-1">No Remarks Found</h3>
                      <p className="text-xs text-gray-500">
                        No call remarks have been recorded for this lead yet.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {remarks.map((remark, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-4 shadow-md ${
                      remark.type === 'CRE' 
                        ? 'border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' 
                        : 'border-l-4 border-l-green-600 bg-gradient-to-r from-green-50 to-green-100 border-green-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getRemarkTypeColor(remark.type)}>
                          {getRemarkTypeIcon(remark.type)} {remark.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Call #{remark.call_number}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(remark.date)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {remark.user}
                      </span>
                    </div>
                    
                    {remark.lead_status && (
                      <div className="mb-2">
                        <Badge variant="secondary" className="text-xs">
                          Status: {remark.lead_status}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-800 bg-white rounded p-3 border">
                      <span className="font-semibold text-gray-600">Remark:</span> {remark.remark}
                    </div>
                  </div>
                ))}
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Trade-in Details View Dialog */}
    <Dialog open={showTradeInDialog} onOpenChange={setShowTradeInDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" />
            Trade-in Vehicle Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Make</div>
                <div className="text-sm font-semibold text-gray-900">{qualificationDetails.trade_in_make || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Model</div>
                <div className="text-sm font-semibold text-gray-900">{qualificationDetails.trade_in_model || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Year</div>
                <div className="text-sm font-semibold text-gray-900">{qualificationDetails.trade_in_year || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">KM Driven</div>
                <div className="text-sm font-semibold text-gray-900">{qualificationDetails.trade_in_km ? `${qualificationDetails.trade_in_km} km` : 'Not specified'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500 mb-1">Ownership</div>
                <div className="text-sm font-semibold text-gray-900">
                  {qualificationDetails.trade_in_ownership === 'first' ? 'First Owner' :
                   qualificationDetails.trade_in_ownership === 'second' ? 'Second Owner' :
                   qualificationDetails.trade_in_ownership === 'third' ? 'Third Owner' :
                   qualificationDetails.trade_in_ownership === 'more' ? 'More than 3 Owners' :
                   'Not specified'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowTradeInDialog(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
