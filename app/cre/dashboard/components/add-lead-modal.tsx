"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Phone, Mail, MapPin, Building, Car, Calendar } from "lucide-react"

interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  name?: string
  role: string
}

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (leadData: any) => void
  user: User | null
}

const sources = [
  "Website", "Walk-in", "Referral", "Advertisement", "Social Media", 
  "Cold Call", "Event", "Online Campaign", "Other"
]

const campaigns = [
  "Google Ads", "Facebook Ads", "Instagram", "YouTube", "Newspaper", 
  "Radio", "TV", "Banner", "Event", "Referral", "Other"
]

export function AddLeadModal({ isOpen, onClose, onAdd, user }: AddLeadModalProps) {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_mobile_number: "",
    customer_email: "",
    customer_location: "",
    source: "",
    campaign: "",
    remarks: ""
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        customer_name: "",
        customer_mobile_number: "",
        customer_email: "",
        customer_location: "",
        source: "",
        campaign: "",
        remarks: ""
      })
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.customer_mobile_number) {
      alert("Please fill in required fields (Name and Mobile)")
      return
    }

    setIsSubmitting(true)
    
    try {
      // Generate UID (simple format: CRM + timestamp)
      const uid = `CRM${Date.now().toString().slice(-6)}`
      
      const leadData = {
        uid,
        customer_name: formData.customer_name,
        customer_mobile_number: formData.customer_mobile_number,
        customer_email: formData.customer_email || null,
        customer_location: formData.customer_location || null,
        source: formData.source || "Walk-in",
        campaign: formData.campaign || "",
        cre_name: user?.first_name || user?.name || user?.username || "",
        cre_id: user?.id,
        assigned: "Yes",
        lead_status: "Fresh",
        final_status: "Pending",
        lead_category: "Warm",
        remarks: formData.remarks || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Submit to backend
      const response = await fetch('/api/cre/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      })

      if (response.ok) {
        onAdd(leadData)
        onClose()
        alert("Lead added successfully!")
      } else {
        const error = await response.text()
        console.error('Failed to add lead:', error)
        alert("Failed to add lead. Please try again.")
      }
    } catch (error) {
      console.error('Error adding lead:', error)
      alert("Error adding lead. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
            Add New Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="text-sm font-medium">
                    Customer Name *
                  </Label>
                  <Input
                    id="customer_name"
                    placeholder="Enter customer name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_mobile_number" className="text-sm font-medium">
                    Mobile Number *
                  </Label>
                  <Input
                    id="customer_mobile_number"
                    placeholder="Enter mobile number"
                    value={formData.customer_mobile_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_mobile_number: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="customer_email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.customer_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_location" className="text-sm font-medium">
                    Location
                  </Label>
                  <Input
                    id="customer_location"
                    placeholder="Enter location"
                    value={formData.customer_location}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_location: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead Source Information */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-green-600" />
                <span>Lead Source</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source" className="text-sm font-medium">
                    Source
                  </Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((source) => (
                        <SelectItem key={source} value={source}>{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign" className="text-sm font-medium">
                    Campaign
                  </Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, campaign: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span>Additional Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-sm font-medium">
                  Remarks
                </Label>
                <Textarea
                  id="remarks"
                  placeholder="Enter any additional remarks or notes"
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.customer_name || !formData.customer_mobile_number}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Adding..." : "Add Lead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
