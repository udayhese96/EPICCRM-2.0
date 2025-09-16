"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Phone, Mail, MapPin, Building, User, Car, Clock, DollarSign, Home, Users, CheckCircle2, Lock, Circle } from "lucide-react"

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
  // Qualification summary fields (optional, shown in header if present)
  model_interested?: string
  variant?: string
  branch?: string
  ps_assigned?: string
  profession?: string
  buying_plan?: string
  finance_option?: string
  test_drive?: boolean
  test_drive_type?: string
  trade_in?: string
  lead_category?: string
  customer_email?: string
  customer_location?: string
  remarks?: string
}

interface LeadUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onUpdate: (leadData: any) => void
}

const toyotaModels = {
  "Toyota Glanza": [
    "E MT", "S MT", "G MT", "V MT", "S AT", "G AT", "V AT", "S CNG", "G CNG"
  ],
  "Toyota Urban Cruiser Taisor": [
    "E MT", "E CNG MT", "S MT", "S+ MT", "S AMT", "S+ AMT", 
    "G Turbo MT", "G Turbo AT", "V Turbo MT", "V Turbo AT",
    "V Turbo MT Dual Tone", "V Turbo AT Dual Tone"
  ],
  "Toyota Urban Cruiser Hyryder": [
    "S Hybrid", "G Hybrid", "G Dual Tone Hybrid", "V Hybrid", "V Dual Tone Hybrid",
    "E MT", "S MT", "S AT", "G MT", "G AT", "G MT Dual Tone",
    "V MT", "V AT", "V MT AWD", "V MT Dual Tone", "V AT Dual Tone", "V MT AWD Dual Tone",
    "S MT CNG", "G MT CNG"
  ],
  "Toyota Rumion": [
    "S MT", "G MT", "V MT", "S MT CNG", "S AT", "G AT", "V AT"
  ],
  "Toyota Fortuner": [
    "4x2 MT (Diesel) – Other Colours", "4x2 MT (Diesel) – Pearl White",
    "4x2 AT (Diesel) – Other Colours", "4x2 AT (Diesel) – Pearl White",
    "4x4 MT (Diesel) – Other Colours", "4x4 MT (Diesel) – Pearl White",
    "4x4 AT (Diesel) – Other Colours", "4x4 AT (Diesel) – Pearl White",
    "Legender 4x2 AT", "Legender 4x4 AT",
    "GR-S 4x4 AT (Black)", "GR-S 4x4 AT (White)",
    "Legender Edition 4x2 MT", "Legender Edition 4x2 AT"
  ]
}

const branches = ["Mount Road", "Vyasarpadi", "Cuddalore"]

const professions = [
  "Salaried", "Business", "Self Employed", "Doctor", "Govt Employee"
]

const buyingPlan = [
  "0-1 Months", "1-2 Months", "2-3 Months", "3-4 Months"
]

const financeOptions = ["Inhouse", "Outright"]

const testDriveOptions = ["Home Test Drive", "Showroom visit"]

const tradeInOptions = ["Yes", "Additional", "Buying for first time"]

const leadCategories = ["Hot", "Warm", "Cold"]

const lostReasons = [
  "Not interested", "Did not enquire", "Lost to co-dealer", "Lost to competition",
  "Low Budget", "Out of Territory", "Not Eligible", "Job Enquiry"
]

const pendingReasons = [
  "RNR", "DND", "Not Reachable", "Switched Off", "Busy", 
  "Disconnecting the call", "Temporary out of Service", "Call me back"
]

export function LeadUpdateModal({ isOpen, onClose, lead, onUpdate }: LeadUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<"qualified" | "unqualified" | "pending" | null>(null)
  const today = new Date().toISOString().slice(0,10)
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
    follow_up_date: "",
    lead_category: "",
    lost_reason: "",
    pending_reason: "",
    general_remarks: "",
    call_status: "",
    sales_outcome: "" // Booked, Retailed, Lost
  })
  
  const [availableVariants, setAvailableVariants] = useState<string[]>([])
  const [availablePS, setAvailablePS] = useState<string[]>([])

  // Reset state whenever a new lead is opened
  useEffect(() => {
    if (!isOpen || !lead) return
    setSelectedStatus(null)
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
      follow_up_date: "",
      lead_category: "",
      lost_reason: "",
      pending_reason: "",
      general_remarks: "",
      call_status: "",
      sales_outcome: ""
    }))
  }, [isOpen, lead])

  useEffect(() => {
    if (formData.model_interested && toyotaModels[formData.model_interested as keyof typeof toyotaModels]) {
      setAvailableVariants(toyotaModels[formData.model_interested as keyof typeof toyotaModels])
    } else {
      setAvailableVariants([])
    }
  }, [formData.model_interested])

  useEffect(() => {
    // Mock PS data - in real app, fetch from database based on branch
    const mockPSData = {
      "Mount Road": ["PS1 Mount Road", "PS2 Mount Road", "PS3 Mount Road"],
      "Vyasarpadi": ["PS1 Vyasarpadi", "PS2 Vyasarpadi"],
      "Cuddalore": ["PS1 Cuddalore", "PS2 Cuddalore", "PS3 Cuddalore"]
    }
    
    if (formData.branch && mockPSData[formData.branch as keyof typeof mockPSData]) {
      setAvailablePS(mockPSData[formData.branch as keyof typeof mockPSData])
    } else {
      setAvailablePS([])
    }
  }, [formData.branch])

  const handleStatusChange = (status: "qualified" | "unqualified" | "pending") => {
    setSelectedStatus(status)
    setFormData(prev => ({
      ...prev,
      lost_reason: "",
      pending_reason: ""
    }))
  }

  const handleSubmit = () => {
    const isQualifiedWorkflow = lead?.lead_status === "Qualified" && !selectedStatus
    const updateData = isQualifiedWorkflow
      ? {
          leadId: lead?.id,
          updated_at: new Date().toISOString(),
          lead_status: formData.sales_outcome === "Lost" ? "Lost" :
                       (formData.sales_outcome === "Booked" || formData.sales_outcome === "Retailed") ? "Won" : "Qualified",
          follow_up_date: formData.follow_up_date || today,
          followup_count: (lead?.followup_count || 0) + 1,
          call_status: formData.call_status,
          general_remarks: formData.general_remarks
        }
      : {
          leadId: lead?.id,
          status: selectedStatus,
          ...formData,
          updated_at: new Date().toISOString(),
          // Add specific handling for different statuses
          lead_status: selectedStatus === "qualified" ? "Qualified" : 
                       selectedStatus === "unqualified" ? "Lost" : 
                       selectedStatus === "pending" ? "Pending" : "Fresh",
          // Ensure follow up date exists when qualifying so it appears in Pending
          follow_up_date: selectedStatus === "qualified" ? (formData.follow_up_date || today) : formData.follow_up_date,
          // Mark as lost if unqualified
          is_lost: selectedStatus === "unqualified",
          // Mark for follow-up if pending with "Call me back"
          needs_follow_up: selectedStatus === "pending" && formData.pending_reason === "Call me back"
        }
    
    onUpdate(updateData)
    onClose()
  }

  if (!lead) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
            Update Lead - {lead.uid}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Details Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Name:</span>
                  <span>{lead.customer_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Phone:</span>
                  <span>{lead.customer_mobile_number}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Source:</span>
                  <Badge variant="outline">{lead.source}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Date:</span>
                  <span>{lead.date}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Campaign:</span>
                  <span>{lead.campaign}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">UID:</span>
                  <Badge variant="secondary">{lead.uid}</Badge>
                </div>
              </div>

              {/* Qualification Summary (if present) */}
              {(lead.model_interested || lead.branch || lead.ps_assigned || lead.lead_category) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t">
                  {lead.model_interested && (
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Model:</span>
                      <span>{lead.model_interested}</span>
                    </div>
                  )}
                  {lead.variant && (
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Variant:</span>
                      <span>{lead.variant}</span>
                    </div>
                  )}
                  {lead.branch && (
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Branch:</span>
                      <span>{lead.branch}</span>
                    </div>
                  )}
                  {lead.ps_assigned && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">PS:</span>
                      <span>{lead.ps_assigned}</span>
                    </div>
                  )}
                  {lead.lead_category && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{lead.lead_category}</Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous Follow-ups */}
          {lead.call_logs && lead.call_logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Previous Follow-ups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {lead.call_logs.map((log, idx) => (
                    <div key={idx} className="flex items-start justify-between border-b py-2">
                      <div className="text-gray-700">
                        <span className="font-medium mr-2">{log.date}</span>
                        <Badge variant="outline" className="mr-2">{log.outcome || "—"}</Badge>
                        <span className="text-gray-600">{log.remarks || "No remarks"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Selection or Qualified Follow-up Workflow */}
          {!(lead.lead_status === "Qualified" || lead.lead_status === "Won" || lead.lead_status === "Lost") ? (
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
          ) : (
            lead.lead_status !== "Qualified" ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {lead.lead_status === "Won" ? "Lead is Closed as Won" : "Lead is Closed as Lost"}
                </CardTitle>
              </CardHeader>
            </Card>
            ) : (
            <Card>
              <CardHeader>
                <CardTitle>Qualified Lead - Follow-up {((lead.followup_count || 0) + 1)} of 5</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Stepper */}
                <div className="flex items-center gap-3 mb-4">
                  {[1,2,3,4,5].map((step) => {
                    const completed = (lead.followup_count || 0) >= step
                    const current = (lead.followup_count || 0) + 1 === step
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
                    <Label>Next Follow-up Date</Label>
                    <Input
                      type="date"
                      value={formData.follow_up_date || today}
                      onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                    />
                  </div>
                </div>
                {/* Sales Outcome - can close as Won/Lost anytime */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label>Sales Outcome</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, sales_outcome: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome (Booked/Retailed/Lost)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Booked">Booked</SelectItem>
                        <SelectItem value="Retailed">Retailed</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
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
          )}

          {/* Qualified Section (only when moving from Fresh/Pending to Qualified) */}
          {selectedStatus === "qualified" && lead.lead_status !== "Qualified" && (
            <div className="space-y-6">
              {/* Row 1: Model Interest & Variant */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Car className="h-5 w-5 text-green-600" />
                      <span>Model Interested</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="model" className="text-sm font-medium mb-2 block">Model</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, model_interested: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Toyota Model" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(toyotaModels).map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Car className="h-5 w-5 text-blue-600" />
                      <span>Variant</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="variant" className="text-sm font-medium mb-2 block">Variant</Label>
                      <Select 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, variant: value }))}
                        disabled={!formData.model_interested}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Variant" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVariants.map((variant) => (
                            <SelectItem key={variant} value={variant}>{variant}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Branch & PS Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="h-5 w-5 text-blue-600" />
                      <span>Branch</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="branch" className="text-sm font-medium mb-2 block">Branch</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-purple-600" />
                      <span>Assign to PS</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="ps" className="text-sm font-medium mb-2 block">PS</Label>
                      <Select 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, ps_assigned: value }))}
                        disabled={!formData.branch}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select PS" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePS.map((ps) => (
                            <SelectItem key={ps} value={ps}>{ps}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Customer Details & Purchase Planning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      <span>Customer Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="profession" className="text-sm font-medium mb-2 block">Profession</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, profession: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Profession" />
                        </SelectTrigger>
                        <SelectContent>
                          {professions.map((profession) => (
                            <SelectItem key={profession} value={profession}>{profession}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <span>Purchase Planning</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="buying_plan" className="text-sm font-medium mb-2 block">Buying Plan</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, buying_plan: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Buying Plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {buyingPlan.map((plan) => (
                            <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 4: Finance Options & Test Drive */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span>Finance Options</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="finance_option" className="text-sm font-medium mb-2 block">Finance Option</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, finance_option: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Finance Option" />
                        </SelectTrigger>
                        <SelectContent>
                          {financeOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Car className="h-5 w-5 text-blue-600" />
                      <span>Test Drive</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="test_drive_type" className="text-sm font-medium mb-2 block">Test Drive Type</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        test_drive_type: value,
                        test_drive: value !== "No"
                      }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Test Drive Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No">No</SelectItem>
                          {testDriveOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>


              {/* Row 5: Trade In & Follow Up */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Car className="h-5 w-5 text-purple-600" />
                      <span>Trade In</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="trade_in" className="text-sm font-medium mb-2 block">Trade In</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, trade_in: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Trade In Option" />
                        </SelectTrigger>
                        <SelectContent>
                          {tradeInOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                      <span>Follow Up</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="follow_up_date" className="text-sm font-medium mb-2 block">Follow Up Date</Label>
                      <Input 
                        type="date"
                        value={formData.follow_up_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 6: Lead Category & General Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-orange-600" />
                      <span>Lead Category</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="lead_category" className="text-sm font-medium mb-2 block">Lead Category</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, lead_category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {leadCategories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <span>General Remarks</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="general_remarks" className="text-sm font-medium mb-2 block">General Remarks</Label>
                      <Textarea 
                        placeholder="Add general remarks about the lead..."
                        value={formData.general_remarks}
                        onChange={(e) => setFormData(prev => ({ ...prev, general_remarks: e.target.value }))}
                        className="min-h-[80px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trade In Details (when Yes is selected) */}
              {formData.trade_in === "Yes" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Car className="h-5 w-5 text-purple-600" />
                      <span>Trade In Vehicle Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="trade_in_make" className="text-sm font-medium mb-2 block">Make</Label>
                        <Input 
                          placeholder="Vehicle Make"
                          value={formData.trade_in_make}
                          onChange={(e) => setFormData(prev => ({ ...prev, trade_in_make: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="trade_in_model" className="text-sm font-medium mb-2 block">Model</Label>
                        <Input 
                          placeholder="Vehicle Model"
                          value={formData.trade_in_model}
                          onChange={(e) => setFormData(prev => ({ ...prev, trade_in_model: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="trade_in_year" className="text-sm font-medium mb-2 block">Year</Label>
                        <Input 
                          type="number"
                          placeholder="Manufacturing Year"
                          value={formData.trade_in_year}
                          onChange={(e) => setFormData(prev => ({ ...prev, trade_in_year: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="trade_in_km" className="text-sm font-medium mb-2 block">KM Driven</Label>
                        <Input 
                          type="number"
                          placeholder="KM Driven"
                          value={formData.trade_in_km}
                          onChange={(e) => setFormData(prev => ({ ...prev, trade_in_km: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="trade_in_ownership" className="text-sm font-medium mb-2 block">Ownership Type</Label>
                        <Select onValueChange={(value) => setFormData(prev => ({ ...prev, trade_in_ownership: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Ownership" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first">First Owner</SelectItem>
                            <SelectItem value="second">Second Owner</SelectItem>
                            <SelectItem value="third">Third Owner</SelectItem>
                            <SelectItem value="more">More than 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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

              {/* Follow Up Date - Show only when "Call me back" is selected */}
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
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {!(lead.lead_status === "Won" || lead.lead_status === "Lost") && (
              <Button 
                onClick={handleSubmit}
                disabled={(lead.lead_status !== "Qualified" && !selectedStatus) || (selectedStatus === "pending" && formData.pending_reason === "Call me back" && !formData.follow_up_date)}
                className={
                  selectedStatus === "unqualified" ? "bg-red-600 hover:bg-red-700" :
                  selectedStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" :
                  "bg-blue-600 hover:bg-blue-700"
                }
              >
                {lead.lead_status === "Qualified" ? "Save Follow-up" :
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
