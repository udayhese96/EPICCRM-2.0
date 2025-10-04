"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, User, Calendar, RefreshCw } from "lucide-react"

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRemarks = async () => {
    if (!leadUid) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/leads/${leadUid}/remarks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRemarks(data.remarks || [])
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
          ) : remarks.length === 0 ? (
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
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {remarks.map((remark, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      remark.type === 'CRE' 
                        ? 'border-l-4 border-l-blue-500 bg-blue-50' 
                        : 'border-l-4 border-l-green-500 bg-green-50'
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
  )
}
