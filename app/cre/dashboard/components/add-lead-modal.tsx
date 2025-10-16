"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

// Source/Subsource mapping as per requirements
const SOURCE_OPTIONS: { [key: string]: string[] } = {
  "Google": ["Web", "Tele In", "GMB Tele In"],
  "WhatsApp": ["Tele In", "Bulk Message"],
  "CarDekho": ["CD B", "CD G"],
  "CarWale": ["CWA", "CWB", "CWC", "CWG", "CWH", "CWK"],
  "OEM": ["Dealer CMS", "TKM"],
  "Meta": ["Web"],
  "Tele Out": ["Web"],
  "Referral": [],
  "Other": []
}

const chennaiLocations = [
  "MOUNT ROAD", "CHINTHADRIPET", "EGMORE", "PUDHUPET", "CHETPET", "CHOOLAIMEDU", "NUNGAMBAKKAM", "KODAMBAKKAM", "VADAPALANI", "ANNASALAI", "ARUMBAKKAM", "ADYAR", "THIRUVANMIYUR", "VELACHERRY", "MEDAVAKKAM", "KILKATTALAI", "PERAMBAKKAM", "SHOLINGANALLUR", "PERUNGUDI", "NEELANGARAI", "SAIDAPET", "ST THOMAS MOUNT", "PAZHAVANTHANGAL", "PALLAVARAM", "MMDA COLONY", "MYLAPORE", "TRIPLICANE", "THOUSAND LIGHTS", "GREAMS ROAD", "ORMES ROAD", "ROYAPETTAH", "T NAGAR", "TEYNAMPET", "GUINDY", "MENAMBAKKAM", "TIRUSULAM", "ALWARPET", "R A PURAM", "AMINJIKARAI", "WEST MAMBALAM", "K K NAGAR", "ASHOK NAGAR", "EKKATUTHANGAL", "NANDANAM", "IIT", "KOTTURPURAM", "CHROMEPET", "SANITORIUM", "KELAMBAKKAM", "SELAIYUR", "KOVILAMBAKKAM", "SUNNAMBU KOLATHUR", "ASTHINAPURAM", "ANKAPUTTUR", "PAMMAL", "POZHICHALUR", "CHITLAPAKKAM", "VENGAIVASAL", "CHINMAYANAGAR", "VALASARAWALKAM", "VIRUGAMBAKKAM", "NESAPAKKAM", "MGR NAGAR", "JAFFERKHANPET", "FLOWERS ROAD", "GOPALAPURAM", "ALWARTHIRUNAGAR", "KOLAPAKKAM", "ADAMBAKKAM", "NANDAMBAKKAM", "MOULIVAKKAM", "RAMAPURAM", "MADIPAKKAM", "SALIGRAMAM", "KANDHANCHAVADI", "THARAMANI", "GOWRIVAKKAM", "TRUSTPURAM", "CIT NAGAR", "RANGARAJAPURAM", "ICE HOUSE", "JAM BAZAAR", "CENATOPH ROAD", "MRC NAGAR", "SANTHOME", "OKKIYAM", "NAVALUR", "THORAIPAKKAM", "GREENWAYS ROAD", "RAJAJI SALAI", "ECR", "OMR", "ABIRAMAPURAM", "MANDAVELI", "MUDICHUR", "IRUMBULIYUR", "PERUNGALATHUR", "VANDALUR", "URAPAKKAM", "KILAMBAKKAM", "GUDUVANCHERY", "MARAIMALAI NAGAR", "SP KOIL", "CHENGALPATTU", "VYSARPADI", "PURASAIWALKAM", "PERAMBUR", "CHOOLAI", "ANNANAGAR", "SHANTHI COLONY", "SHENOY NAGAR", "THIRUMANGALAM", "MUGAPPAIR", "NOLAMBUR", "AYANAVARAM", "VILLIVAKKAM", "PADI", "KORATTUR", "KOLATHUR", "MADHAVARAM", "KELLYS", "KILPAUK", "CENTRAL", "NERKUNDRAM", "MADURAVOYAL", "VELAPANCHAVADI", "IYYAPANTHANGAL", "POONAMALLEE", "THIRUMAZHISAI", "SRIPERUMBUTHUR", "PARRYS", "KANCHEEPURAM", "MANGADU", "SUNGUVARCHATIRAM", "REDHILLS", "CHOZHAVARAM", "KARANODAI", "PERIYAPALAYAM", "AMBATTUR", "THIRUMULLAIVOYAL", "AVADI", "PATTABIRAM", "THIRUNINRAVUR", "VEPPAMPATTU", "TIRUVALLUR", "ARAKONAM", "TIRUTHANI", "TIRUPATHI", "MINT", "WASHERMENPET", "TONDIARPET", "THIRUVOTRIYUR", "ENNORE", "MOOLAKADAI", "ERUKANCHERY", "MANALI", "GOOMIDIPOONDI", "PADAPPAI", "ORAGADAM", "KUNDRATHUR", "PORUR", "PARK TOWN", "VANAGARAM", "THIRUVERKADU", "MUGALIVAKKAM", "KATTUPAKKAM", "GERUGAMBAKKAM", "MADHURANTHANGAM", "MELMARUVATHUR", "AYAPAKKAM"
]

// Toyota Models and Variants
const toyotaModels: { [key: string]: string[] } = {
  "Toyota Innova Crysta": ["G", "GX / GX+", "VX", "ZX"],
  "Toyota Innova Hycross": ["G", "GX", "GX (O)", "VX", "VX (O)", "ZX", "ZX (O)"],
  "Toyota Fortuner": ["4x2 MT", "4x2 AT", "4x4 MT", "4x4 AT", "GR-S 4x2 AT", "GR-S 4x4 AT"],
  "Toyota Fortuner Legender": ["4x2 AT", "4x4 AT"],
  "Toyota Camry": ["Hybrid"],
  "Toyota Vellfire": ["Executive Lounge"],
  "Toyota Land Cruiser 300 (LC 300)": ["VX", "ZX", "GR-S"],
  "Toyota Hilux": ["Standard", "High"],
  "Toyota Urban Cruiser Hyryder": ["E", "S", "G", "V"],
  "Toyota Rumion": ["S MT", "S AT", "G MT", "G AT", "V MT", "V AT"],
  "Toyota Glanza": ["E", "S", "G"],
  "Toyota Urban Cruiser Taisor": ["E", "S", "S+", "V"]
}

export function AddLeadModal({ isOpen, onClose, onAdd, user }: AddLeadModalProps) {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_mobile_number: "",
    customer_location: "",
    source: "",
    sub_source: "",
    follow_up_date: "",
    trade_in_make: "",
    trade_in_model: "",
    trade_in_make_other: "",
    trade_in_model_other: "",
    trade_in_year: "",
    trade_in_km: "",
    trade_in_ownership: "",
    model_interested: "",
    variant: "",
    remarks: ""
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        customer_name: "",
        customer_mobile_number: "",
        customer_location: "",
        source: "",
        sub_source: "",
        follow_up_date: "",
        trade_in_make: "",
        trade_in_model: "",
        trade_in_make_other: "",
        trade_in_model_other: "",
        trade_in_year: "",
        trade_in_km: "",
        trade_in_ownership: "",
        model_interested: "",
        variant: "",
        remarks: ""
      })
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.customer_mobile_number || !formData.follow_up_date) {
      alert("Please fill in required fields (Name, Mobile, and Follow-up Date)")
      return
    }

    // Validations
    const mobile = (formData.customer_mobile_number || '').trim()
    if (!/^\d{10}$/.test(mobile)) {
      alert("Enter a valid 10-digit mobile number")
      return
    }
    if (formData.trade_in_year) {
      const yearNum = Number(formData.trade_in_year)
      const currentYear = new Date().getFullYear()
      if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > currentYear) {
        alert(`Enter a valid trade-in year between 1990 and ${currentYear}`)
        return
      }
    }
    if (formData.trade_in_km) {
      const kmNum = Number(formData.trade_in_km)
      if (!Number.isFinite(kmNum) || kmNum < 0 || kmNum > 5000000) {
        alert("Enter a valid KMs driven between 0 and 5,000,000")
        return
      }
    }

    setIsSubmitting(true)
    
    try {
      // Generate UID (simple format: CRM + timestamp)
      const uid = `CRM${Date.now().toString().slice(-6)}`
      
      const tradeInMake = formData.trade_in_make === 'Other' ? (formData.trade_in_make_other || '') : formData.trade_in_make
      const tradeInModel = formData.trade_in_model === 'Other' ? (formData.trade_in_model_other || '') : formData.trade_in_model

      const leadData = {
        uid,
        customer_name: formData.customer_name,
        customer_mobile_number: formData.customer_mobile_number,
        customer_location: formData.customer_location || null,
        source: formData.source || "Walk-in",
        sub_source: formData.sub_source === "none" ? "" : (formData.sub_source || ""),
        follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date + 'T00:00:00').toISOString() : null,
        cre_name: user?.name || user?.first_name || user?.username || "",
        cre_id: user?.id,
        assigned: "Yes",
        lead_status: "Qualified",
        final_status: "Pending",
        lead_category: null,
        remarks: formData.remarks || "",
        // Trade-in details (optional)
        trade_in_make: tradeInMake || null,
        trade_in_model: tradeInModel || null,
        trade_in_year: formData.trade_in_year || null,
        trade_in_km: formData.trade_in_km || null,
        trade_in_ownership: formData.trade_in_ownership || null,
        model_interested: formData.model_interested || null,
        variant: formData.variant || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Submit to backend
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || parsed?.token

      console.log('CRE Lead - Sending data:', leadData)
      console.log('CRE Lead - Token:', token ? 'Present' : 'Missing')

      const response = await fetch('/api/cre/leads', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Add New Lead
          </DialogTitle>
          <DialogDescription>
            Create a new lead with customer information
          </DialogDescription>
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
                    type="tel"
                    placeholder="Enter mobile number"
                    value={formData.customer_mobile_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_mobile_number: e.target.value }))}
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_location" className="text-sm font-medium">
                    Location
                  </Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, customer_location: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {chennaiLocations.map((location) => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    Source *
                  </Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, source: value, sub_source: "" }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(SOURCE_OPTIONS).map((source) => (
                        <SelectItem key={source} value={source}>{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub_source" className="text-sm font-medium">
                    Subsource
                  </Label>
                  <Select 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sub_source: value }))}
                    disabled={!formData.source}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source first" />
                    </SelectTrigger>
                    <SelectContent>
                      {(SOURCE_OPTIONS[formData.source] || []).length === 0 ? (
                        <SelectItem value="none">None</SelectItem>
                      ) : (
                        SOURCE_OPTIONS[formData.source].map((sub) => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Follow-up Date */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <span>Follow-up Schedule</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="follow_up_date" className="text-sm font-medium">
                  Follow-up Date *
                </Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Trade-in Details (Optional) */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5 text-purple-600" />
                <span>Trade-in Details (Optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trade_in_make" className="text-sm font-medium">
                    Make
                  </Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, trade_in_make: value, trade_in_model: '', trade_in_make_other: '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select make" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Maruti','Hyundai','Toyota','Honda','Tata','Mahindra','Kia','Renault','Nissan','Skoda','Volkswagen','Ford','MG','Jeep','Other'].map((mk) => (
                        <SelectItem key={mk} value={mk}>{mk}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.trade_in_make === 'Other' && (
                    <Input
                      id="trade_in_make_other"
                      placeholder="Enter make"
                      value={formData.trade_in_make_other}
                      onChange={(e) => setFormData(prev => ({ ...prev, trade_in_make_other: e.target.value }))}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_in_model" className="text-sm font-medium">
                    Model
                  </Label>
                  <Select disabled={!formData.trade_in_make} onValueChange={(value) => setFormData(prev => ({ ...prev, trade_in_model: value, trade_in_model_other: '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.trade_in_make ? 'Select model' : 'Select make first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const models: Record<string,string[]> = {
                          Maruti: ['Alto','Wagon R','Swift','Baleno','Dzire','Vitara Brezza','Celerio','Ertiga','Fronx','Grand Vitara','Other'],
                          Hyundai: ['i10','i20','Grand i10','Creta','Venue','Verna','Aura','Alcazar','Exter','Other'],
                          Toyota: ['Glanza','Urban Cruiser','Innova','Innova Crysta','Innova Hycross','Fortuner','Fortuner Legender','Camry','Vellfire','Land Cruiser 300 (LC 300)','Hilux','Hyryder','Rumion','Other'],
                          Honda: ['Amaze','City','Jazz','WR-V','Elevate','Other'],
                          Tata: ['Tiago','Tigor','Altroz','Nexon','Harrier','Safari','Punch','Other'],
                          Mahindra: ['Bolero','Scorpio','XUV300','XUV700','Thar','Other'],
                          Kia: ['Seltos','Sonet','Carens','Other'],
                          Renault: ['Kwid','Triber','Kiger','Other'],
                          Nissan: ['Magnite','Kicks','Other'],
                          Skoda: ['Rapid','Slavia','Kushaq','Other'],
                          Volkswagen: ['Polo','Virtus','Taigun','Other'],
                          Ford: ['Figo','Aspire','EcoSport','Endeavour','Other'],
                          MG: ['Hector','Astor','ZS EV','Other'],
                          Jeep: ['Compass','Meridian','Wrangler','Other'],
                          Other: ['Other']
                        }
                        const list = models[formData.trade_in_make as keyof typeof models] || ['Other']
                        return list.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
                      })()}
                    </SelectContent>
                  </Select>
                  {formData.trade_in_model === 'Other' && (
                    <Input
                      id="trade_in_model_other"
                      placeholder="Enter model"
                      value={formData.trade_in_model_other}
                      onChange={(e) => setFormData(prev => ({ ...prev, trade_in_model_other: e.target.value }))}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_in_year" className="text-sm font-medium">
                    Year
                  </Label>
                  <Input
                    id="trade_in_year"
                    type="number"
                    placeholder="e.g., 2020"
                    value={formData.trade_in_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, trade_in_year: e.target.value }))}
                    min="1990"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_in_km" className="text-sm font-medium">
                    KMs Driven
                  </Label>
                  <Input
                    id="trade_in_km"
                    type="number"
                    placeholder="e.g., 50000"
                    value={formData.trade_in_km}
                    onChange={(e) => setFormData(prev => ({ ...prev, trade_in_km: e.target.value }))}
                    min="0"
                    max="5000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_in_ownership" className="text-sm font-medium">
                    Ownership
                  </Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, trade_in_ownership: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ownership" />
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

          {/* Model and Variant Information */}
          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5 text-cyan-600" />
                <span>Model and Variant Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model_interested" className="text-sm font-medium">
                    Model Interested
                  </Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, model_interested: value, variant: '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(toyotaModels).map((model) => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variant" className="text-sm font-medium">
                    Variant
                  </Label>
                  <Select 
                    disabled={!formData.model_interested} 
                    value={formData.variant}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, variant: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.model_interested ? "Select variant" : "Select model first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.model_interested && toyotaModels[formData.model_interested as keyof typeof toyotaModels]?.map((variant) => (
                        <SelectItem key={variant} value={variant}>{variant}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Select the model and variant the customer is interested in
              </p>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
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
              disabled={isSubmitting || !formData.customer_name || !formData.customer_mobile_number || !formData.follow_up_date}
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
