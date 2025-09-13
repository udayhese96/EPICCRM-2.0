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
import { Calendar, Phone, Mail, MapPin, Building, User, Car, Clock, DollarSign, Home, Users } from "lucide-react"

interface Lead {
  id: string
  uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  campaign: string
  date: string
  lead_status: string
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
  "Not interested", "Did not enquire", "Lost to co-dealer", "Lost to competition"
]

const pendingReasons = ["RNR", "Call me back"]

export function LeadUpdateModal({ isOpen, onClose, lead, onUpdate }: LeadUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<"qualified" | "unqualified" | "pending" | null>(null)
  const [formData, setFormData] = useState({
    model_interested: "",
    variant: "",
    branch: "",
    ps_assigned: "",
    profession: "",
    profession_remarks: "",
    buying_plan: "",
    buying_plan_remarks: "",
    finance_option: "",
    finance_remarks: "",
    test_drive: false,
    test_drive_type: "",
    test_drive_remarks: "",
    trade_in: "",
    trade_in_make: "",
    trade_in_model: "",
    trade_in_year: "",
    trade_in_km: "",
    trade_in_ownership: "",
    trade_in_remarks: "",
    follow_up_date: "",
    lead_category: "",
    general_remarks: "",
    lost_reason: "",
    pending_reason: ""
  })
  
  const [availableVariants, setAvailableVariants] = useState<string[]>([])
  const [availablePS, setAvailablePS] = useState<string[]>([])

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
    const updateData = {
      leadId: lead?.id,
      status: selectedStatus,
      ...formData,
      updated_at: new Date().toISOString()
    }
    
    onUpdate(updateData)
    onClose()
  }

  if (!lead) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
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
            </CardContent>
          </Card>

          {/* Status Selection */}
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

          {/* Qualified Section */}
          {selectedStatus === "qualified" && (
            <div className="space-y-6">
              {/* Model Interest */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Car className="h-5 w-5 text-green-600" />
                    <span>Vehicle Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="model">Model Interested</Label>
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
                    <div>
                      <Label htmlFor="variant">Variant</Label>
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
                  </div>
                </CardContent>
              </Card>

              {/* Branch & PS Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    <span>Assignment Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="branch">Branch</Label>
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
                    <div>
                      <Label htmlFor="ps">Assign to PS</Label>
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
                  </div>
                </CardContent>
              </Card>

              {/* Customer Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span>Customer Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="profession">Profession</Label>
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
                    <div>
                      <Label htmlFor="profession_remarks">Profession Remarks</Label>
                      <Textarea 
                        placeholder="Add profession related remarks..."
                        value={formData.profession_remarks}
                        onChange={(e) => setFormData(prev => ({ ...prev, profession_remarks: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Buying Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span>Purchase Planning</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buying_plan">Buying Plan</Label>
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
                    <div>
                      <Label htmlFor="buying_plan_remarks">Buying Plan Remarks</Label>
                      <Textarea 
                        placeholder="Add buying plan remarks..."
                        value={formData.buying_plan_remarks}
                        onChange={(e) => setFormData(prev => ({ ...prev, buying_plan_remarks: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Finance Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span>Finance Options</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="finance_option">Finance Option</Label>
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
                    <div>
                      <Label htmlFor="finance_remarks">Finance Remarks</Label>
                      <Textarea 
                        placeholder="Add finance related remarks..."
                        value={formData.finance_remarks}
                        onChange={(e) => setFormData(prev => ({ ...prev, finance_remarks: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Test Drive */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Car className="h-5 w-5 text-blue-600" />
                    <span>Test Drive</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="test_drive"
                      checked={formData.test_drive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, test_drive: checked as boolean }))}
                    />
                    <Label htmlFor="test_drive">Test Drive Required</Label>
                  </div>
                  
                  {formData.test_drive && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="test_drive_type">Test Drive Type</Label>
                        <Select onValueChange={(value) => setFormData(prev => ({ ...prev, test_drive_type: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Test Drive Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {testDriveOptions.map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="test_drive_remarks">Test Drive Remarks</Label>
                        <Textarea 
                          placeholder="Add test drive remarks..."
                          value={formData.test_drive_remarks}
                          onChange={(e) => setFormData(prev => ({ ...prev, test_drive_remarks: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trade In */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Car className="h-5 w-5 text-purple-600" />
                    <span>Trade In Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="trade_in">Trade In</Label>
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
                  
                  {formData.trade_in === "Yes" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="trade_in_make">Make</Label>
                          <Input 
                            placeholder="Vehicle Make"
                            value={formData.trade_in_make}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_make: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="trade_in_model">Model</Label>
                          <Input 
                            placeholder="Vehicle Model"
                            value={formData.trade_in_model}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_model: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="trade_in_year">Year</Label>
                          <Input 
                            type="number"
                            placeholder="Manufacturing Year"
                            value={formData.trade_in_year}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_year: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="trade_in_km">KM Driven</Label>
                          <Input 
                            type="number"
                            placeholder="KM Driven"
                            value={formData.trade_in_km}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_km: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="trade_in_ownership">Ownership Type</Label>
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
                      <div>
                        <Label htmlFor="trade_in_remarks">Trade In Remarks</Label>
                        <Textarea 
                          placeholder="Add trade in vehicle remarks..."
                          value={formData.trade_in_remarks}
                          onChange={(e) => setFormData(prev => ({ ...prev, trade_in_remarks: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Follow Up & Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    <span>Follow Up & Category</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="follow_up_date">Follow Up Date</Label>
                      <Input 
                        type="date"
                        value={formData.follow_up_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lead_category">Lead Category</Label>
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
                  </div>
                  <div>
                    <Label htmlFor="general_remarks">General Remarks</Label>
                    <Textarea 
                      placeholder="Add general remarks about the lead..."
                      value={formData.general_remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, general_remarks: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Unqualified Section */}
          {selectedStatus === "unqualified" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">Lead Lost Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="lost_reason">Reason for Loss</Label>
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Section */}
          {selectedStatus === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-700">Pending Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="pending_reason">Pending Status</Label>
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
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedStatus}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Update Lead
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
