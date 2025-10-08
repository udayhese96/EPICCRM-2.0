"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Lock, Circle } from "lucide-react"
import { LeadFormHeader } from "./lead-form-header"
import { LeadQualificationForm } from "./lead-qualification-form"
import { toast } from "sonner"

interface Lead {
  id: string
  uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  campaign: string
  date: string
  lead_status: string
  lead_category?: string
  follow_up_date?: string
  followup_count?: number
  call_logs?: { date: string; outcome: string; remarks: string }[]
  model_interested?: string
  variant?: string
  final_status?: string
  branch?: string
  ps_assigned?: string
  profession?: string
  buying_plan?: string
  finance_option?: string
  test_drive?: boolean
  test_drive_type?: string
  trade_in?: string
  customer_email?: string
  customer_location?: string
  remarks?: string
  lead_remark?: string
  first_call_date?: string
  second_call_date?: string
  second_remark?: string
  third_call_date?: string
  third_remark?: string
  fourth_call_date?: string
  fourth_remark?: string
  fifth_call_date?: string
  fifth_remark?: string
  sixth_call_date?: string
  sixth_remark?: string
}

interface LeadUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onUpdate: (leadData: any) => void
}

const lostReasons = [
  "Not interested", "Did not enquire", "Lost to co-dealer", "Lost to competition",
  "Low Budget", "Out of Territory", "Not Eligible", "Job Enquiry"
]

const pendingReasons = [
  "RNR", "DND", "Not Reachable", "Switched Off", "Busy", 
  "Disconnecting the call", "Temporary out of Service", "Call me back"
]

export function OptimizedLeadUpdateModal({ isOpen, onClose, lead, onUpdate }: LeadUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<"qualified" | "unqualified" | "pending" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0,10)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0,10)
  
  const [formData, setFormData] = useState({
    model_interested: "",
    variant: "",
    branch: "",
    ps_assigned: "",
    profession: "",
    buying_plan: "",
    finance_option: "",
    test_drive: false,
    test_drive_type: "",
    trade_in: "",
    trade_in_make: "",
    trade_in_model: "",
    trade_in_year: "",
    trade_in_km: "",
    trade_in_ownership: "",
    follow_up_date: tomorrow,
    lead_category: "",
    lost_reason: "",
    pending_reason: "",
    general_remarks: "",
    call_status: "",
    sales_outcome: "Pending",
    customer_location: ""
  })
  
  const [availableVariants, setAvailableVariants] = useState<string[]>([])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen || !lead) return
    setSelectedStatus(null)
    setIsProcessing(false)
    setTaskId(null)
    setFormData(prev => ({
      ...prev,
      model_interested: "",
      variant: "",
      branch: "",
      ps_assigned: "",
      profession: "",
      buying_plan: "",
      finance_option: "",
      test_drive: false,
      test_drive_type: "",
      trade_in: "",
      trade_in_make: "",
      trade_in_model: "",
      trade_in_year: "",
      trade_in_km: "",
      trade_in_ownership: "",
      follow_up_date: tomorrow,
      lead_category: "",
      lost_reason: "",
      pending_reason: "",
      general_remarks: "",
      call_status: "",
      sales_outcome: "",
      customer_location: ""
    }))
  }, [isOpen, lead])

  const handleStatusChange = useCallback((status: "qualified" | "unqualified" | "pending") => {
    setSelectedStatus(status)
    setFormData(prev => ({
      ...prev,
      lost_reason: "",
      pending_reason: ""
    }))
  }, [])

  // Poll task status for optimistic UI updates
  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/optimized/leads/batch-status/${taskId}`)
      const data = await response.json()
      
      if (data.status === 'completed') {
        setIsProcessing(false)
        // Fetch updated lead data
        const leadResponse = await fetch(`/api/leads/${lead?.uid}`)
        const updatedLead = await leadResponse.json()
        onUpdate(updatedLead)
        onClose()
      } else if (data.status === 'failed') {
        setIsProcessing(false)
        console.error('Lead update failed:', data.error_message)
        // Could show error notification here
      }
    } catch (error) {
      console.error('Error polling task status:', error)
    }
  }, [lead?.uid, onUpdate, onClose])

  // Start polling when task is created
  useEffect(() => {
    if (taskId && isProcessing) {
      const interval = setInterval(() => {
        pollTaskStatus(taskId)
      }, 1500) // Poll every 1.5 seconds
      
      return () => clearInterval(interval)
    }
  }, [taskId, isProcessing, pollTaskStatus])

  const handleSubmit = useCallback(async () => {
    if (!lead) return

    const leadStatus = (lead?.lead_status || "").trim()
    const isClosed = leadStatus === "Won" || leadStatus === "Lost"
    const isFollowUpWorkflow = !isClosed && leadStatus !== "" && !selectedStatus
    const pendingExactStatus = formData.pending_reason || "Called"

    // Validation for required fields
    if (leadStatus === "Qualified" && !formData.follow_up_date) {
      toast.error("Please select a follow-up date before submitting.")
      return
    }

    if (selectedStatus === "qualified" && (!formData.model_interested || !formData.variant || !formData.follow_up_date)) {
      toast.error("Please fill in all required fields: Model Interested, Variant, and Follow-up Date.")
      return
    }

    if (selectedStatus === "pending" && formData.pending_reason === "Call me back" && !formData.follow_up_date) {
      toast.error("Please select a follow-up date when marking as 'Call me back'.")
      return
    }

    // Prevent empty updates during follow-up workflow
    if (isFollowUpWorkflow) {
      const hasAnyInput = Boolean(
        (formData.call_status && String(formData.call_status).trim()) ||
        (formData.sales_outcome && String(formData.sales_outcome).trim()) ||
        (formData.general_remarks && String(formData.general_remarks).trim())
      )
      if (!hasAnyInput) {
        toast.error("Add at least one detail: Call Outcome, Sales Outcome, or Remarks.")
        return
      }
    }

    // Validation for normal update (no status selected) - should have some field filled
    if (!selectedStatus && leadStatus !== "Qualified") {
      const hasAnyFieldFilled = Boolean(
        (formData.model_interested && String(formData.model_interested).trim()) ||
        (formData.variant && String(formData.variant).trim()) ||
        (formData.profession && String(formData.profession).trim()) ||
        (formData.buying_plan && String(formData.buying_plan).trim()) ||
        (formData.finance_option && String(formData.finance_option).trim()) ||
        (formData.general_remarks && String(formData.general_remarks).trim()) ||
        (formData.customer_location && String(formData.customer_location).trim())
      )
      if (!hasAnyFieldFilled) {
        toast.error("Please fill at least one field or select a lead status to update.")
        return
      }
    }
    
    // Build update payload
    const updateData = isFollowUpWorkflow
      ? {
          uid: lead.uid,
          lead_status: formData.sales_outcome === "Lost" ? "Lost" :
                       (formData.sales_outcome === "Booked" || formData.sales_outcome === "Retailed") ? "Won" : "Qualified",
          final_status: formData.sales_outcome === "Lost" ? "Lost" :
                       (formData.sales_outcome === "Booked" || formData.sales_outcome === "Retailed") ? "Won" : "Pending",
          follow_up_date: formData.follow_up_date || tomorrow,
          call_status: formData.call_status,
          followup_note: formData.general_remarks
        }
      : {
          uid: lead.uid,
          customer_name: lead.customer_name,
          customer_mobile_number: lead.customer_mobile_number,
          lead_status: selectedStatus === "qualified" ? "Qualified" : 
                       selectedStatus === "unqualified" ? "Lost" : 
                       selectedStatus === "pending" ? pendingExactStatus : "Fresh",
          final_status: selectedStatus === "qualified" ? "Pending" :
                       selectedStatus === "unqualified" ? "Lost" : 
                       selectedStatus === "pending" ? "Pending" : "Pending",
          follow_up_date: selectedStatus === "qualified" ? (formData.follow_up_date || tomorrow) : (formData.follow_up_date || undefined),
          first_remark: isFollowUpWorkflow ? undefined : formData.general_remarks,
          profession: formData.profession,
          variant: formData.variant,
          model_interested: formData.model_interested,
          lead_category: formData.lead_category,
          buying_plan: formData.buying_plan,
          finance_option: formData.finance_option,
          trade_in: formData.trade_in,
          trade_in_make: formData.trade_in_make,
          trade_in_model: formData.trade_in_model,
          trade_in_year: formData.trade_in_year,
          trade_in_km: formData.trade_in_km,
          trade_in_ownership: formData.trade_in_ownership,
          test_drive_type: formData.test_drive_type,
          customer_location: formData.customer_location
        }

    try {
      // Enqueue for processing
      setIsProcessing(true)
      const response = await fetch('/api/optimized/leads/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([updateData])
      })
      
      const result = await response.json()
      if (result.task_id) {
        setTaskId(result.task_id)
        // Optimistic UI update - show processing state
        onUpdate({ ...lead, processing: true })
      } else {
        throw new Error('No task ID returned')
      }
      
    } catch (error) {
      console.error('Failed to enqueue lead update:', error)
      setIsProcessing(false)
    }
  }, [lead, selectedStatus, formData, isFollowUpWorkflow, today, onUpdate])

  // Memoized components to prevent unnecessary re-renders
  const statusSelectionCard = useMemo(() => {
    if (selectedStatus !== null) return null
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Status Update</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="qualified"
                checked={selectedStatus === "qualified"}
                onCheckedChange={() => handleStatusChange("qualified")}
              />
              <Label htmlFor="qualified" className="text-green-700 font-medium">Qualified</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="unqualified"
                checked={selectedStatus === "unqualified"}
                onCheckedChange={() => handleStatusChange("unqualified")}
              />
              <Label htmlFor="unqualified" className="text-red-700 font-medium">Unqualified</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="pending"
                checked={selectedStatus === "pending"}
                onCheckedChange={() => handleStatusChange("pending")}
              />
              <Label htmlFor="pending" className="text-yellow-700 font-medium">Pending</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }, [selectedStatus, handleStatusChange])

  const followUpWorkflowCard = useMemo(() => {
    const currentStatus = (lead?.lead_status || "").trim()
    const isClosedStatus = currentStatus === "Won" || currentStatus === "Lost"
    const hasInitialRemark = !!(lead?.lead_remark && String(lead.lead_remark).trim())
    const shouldShowFollowUp = !isClosedStatus && hasInitialRemark

    if (!shouldShowFollowUp) return null

    const followupRemarks = [
      lead?.second_remark,
      lead?.third_remark,
      lead?.fourth_remark,
      lead?.fifth_remark,
      lead?.sixth_remark
    ]
    const derivedFollowupCount = followupRemarks.filter(r => !!(r && String(r).trim())).length
    const nextFollowupNumber = Math.min(derivedFollowupCount + 1, 5)

    return (
      <Card>
        <CardHeader>
          <CardTitle>Qualified Lead - Follow-up {nextFollowupNumber} of 5</CardTitle>
          <span className="text-sm text-gray-500">Final: {lead?.final_status || 'Pending'} · Status: {currentStatus || 'Qualified'}</span>
        </CardHeader>
        <CardContent>
          {/* Stepper */}
          <div className="flex items-center gap-3 mb-4">
            {[1,2,3,4,5].map((step) => {
              const completed = derivedFollowupCount >= step
              const current = nextFollowupNumber === step
              return (
                <div key={step} className="flex items-center gap-2">
                  {completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : current ? (
                    <Circle className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-400" />
                  )}
                  <span className={`text-sm ${completed ? "text-green-700" : current ? "text-blue-700" : "text-gray-500"}`}>F{step}</span>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Follow-up Date (Today)</Label>
              <Input type="date" value={today} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Call Outcome</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, call_status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Connected">Connected</SelectItem>
                  <SelectItem value="Not Reachable">Not Reachable</SelectItem>
                  <SelectItem value="Call Me Back">Call Me Back</SelectItem>
                  <SelectItem value="Not Interested">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Next Follow-up Date *</Label>
              <Input
                type="date"
                value={formData.follow_up_date || tomorrow}
                onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="space-y-2">
              <Label>Sales Outcome</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, sales_outcome: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome (Booked/Retailed/Lost/Pending)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Booked">Booked</SelectItem>
                  <SelectItem value="Retailed">Retailed</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Label>Follow-up Remarks</Label>
            <Textarea
              placeholder="Add remarks for this follow-up"
              value={formData.general_remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, general_remarks: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>
    )
  }, [lead, formData, today])

  if (!lead) return null

  const currentStatus = (lead.lead_status || "").trim()
  const isClosedStatus = currentStatus === "Won" || currentStatus === "Lost"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
            Update Lead - {lead.uid} {isProcessing && "(Processing...)"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Details Header */}
          <LeadFormHeader lead={lead} />

          {/* Status Selection or Follow-up Workflow */}
          {statusSelectionCard}
          {followUpWorkflowCard}

          {/* Qualified Section */}
          {selectedStatus === "qualified" && lead.lead_status !== "Qualified" && (
            <LeadQualificationForm
              formData={formData}
              setFormData={setFormData}
              availableVariants={availableVariants}
              setAvailableVariants={setAvailableVariants}
            />
          )}

          {/* Unqualified Section */}
          {selectedStatus === "unqualified" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">Lead Lost Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label htmlFor="lost_reason" className="text-sm font-medium mb-2 block">Reason for Loss</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, lost_reason: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Lost Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {lostReasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ Lead will be marked as lost and moved to won/lost leads section after update.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Section */}
          {selectedStatus === "pending" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-700">Pending Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label htmlFor="pending_reason" className="text-sm font-medium mb-2 block">Pending Status</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, pending_reason: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Pending Reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingReasons.map((reason) => (
                          <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {formData.pending_reason === "Call me back" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-700">Follow Up Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Label htmlFor="follow_up_date" className="text-sm font-medium mb-2 block">Follow Up Date</Label>
                      <Input 
                        type="date"
                        value={formData.follow_up_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                      />
                      <p className="text-sm text-gray-600">
                        Lead will be moved to fresh leads follow-up section after update.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Close
            </Button>
            {!(lead.lead_status === "Won" || lead.lead_status === "Lost") && (
              <Button 
                onClick={handleSubmit}
                disabled={isProcessing}
                className={
                  selectedStatus === "unqualified" ? "bg-red-600 hover:bg-red-700" :
                  selectedStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" :
                  "bg-blue-600 hover:bg-blue-700"
                }
              >
                {isProcessing ? "Processing..." :
                 lead.lead_status === "Qualified" ? "Save Follow-up" :
                 selectedStatus === "qualified" ? "Qualify Lead" :
                 selectedStatus === "unqualified" ? "Mark as Lost" :
                 selectedStatus === "pending" ? "Mark as Pending" :
                 "Update Lead"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

