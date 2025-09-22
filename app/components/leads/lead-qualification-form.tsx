"use client"

import { memo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Car, Users, Clock, DollarSign } from "lucide-react"

interface LeadQualificationFormProps {
  formData: any
  setFormData: (data: any) => void
  availableVariants: string[]
  setAvailableVariants: (variants: string[]) => void
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

export const LeadQualificationForm = memo(function LeadQualificationForm({
  formData,
  setFormData,
  availableVariants,
  setAvailableVariants
}: LeadQualificationFormProps) {
  
  useEffect(() => {
    if (formData.model_interested && toyotaModels[formData.model_interested as keyof typeof toyotaModels]) {
      setAvailableVariants(toyotaModels[formData.model_interested as keyof typeof toyotaModels])
    } else {
      setAvailableVariants([])
    }
  }, [formData.model_interested, setAvailableVariants])

  return (
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

      {/* Row 2: Customer Details & Purchase Planning */}
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
            <div className="space-y-3">
              <Label htmlFor="customer_location" className="text-sm font-medium mb-2 block">Location</Label>
              <Input 
                placeholder="Enter customer location"
                value={formData.customer_location}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_location: e.target.value }))}
              />
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

      {/* Row 3: Finance Options & Test Drive */}
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

      {/* Row 4: Trade In & Follow Up */}
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
              <Clock className="h-5 w-5 text-indigo-600" />
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

      {/* Row 5: Lead Category & First Call Remark */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-600" />
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
              <Clock className="h-5 w-5 text-gray-600" />
              <span>First Call Remark</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="general_remarks" className="text-sm font-medium mb-2 block">First Call Remark</Label>
              <Textarea 
                placeholder="Add first call remark..."
                value={formData.general_remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, general_remarks: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

