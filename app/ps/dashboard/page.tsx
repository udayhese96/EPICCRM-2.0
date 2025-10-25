"use client"

import React, { useEffect, useState, useMemo, useRef } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast, Toaster } from "sonner"
import {
  Calendar,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Star,
  Info,
  Users,
  Trophy,
  RefreshCw,
  Clock,
  AlertCircle,
  User,
  X,
  Car,
  CreditCard,
  Briefcase,
  FileText,
  ChevronRight,
  Edit3,
  Settings,
  DollarSign,
  MapPin,
  Zap,
  Loader2,
  LayoutGrid,
  Table as TableIcon
} from "lucide-react"

// Toyota models and variants data (matching CRE dashboard)
const toyotaModels = {
  "Toyota Glanza": [
    "E", "S (MT / AMT / CNG)", "G (MT / AMT / CNG)", "V (MT / AMT)"
  ],
  "Toyota Urban Cruiser Taisor": [
    "E (Petrol / CNG)", "S (MT / AMT)", "S+", "G Turbo (MT / AT)", "V Turbo (MT / AT)"
  ],
  "Toyota Urban Cruiser Hyryder": [
    "E", "S (NeoDrive / Hybrid / CNG)", "G (NeoDrive / Hybrid)", "V (NeoDrive / Hybrid)"
  ],
  "Toyota Rumion": [
    "S (MT / AT / CNG)", "G (MT / AT)", "V (MT / AT)"
  ],
  "Toyota Fortuner": [
    "Petrol 4x2 MT / AT", "Diesel 4x2 MT / AT", "Diesel 4x4 MT / AT", "Neo Drive (48V mild hybrid)"
  ],
  "Toyota Innova Crysta": [
    "G", "GX / GX+", "VX", "ZX"
  ],
  "Toyota Innova Hycross": [
    "G", "GX / GX(O)", "VX / VX(O)", "ZX / ZX(O)"
  ],
  "Toyota Hilux": [
    "STD", "High MT", "High AT"
  ],
  "Toyota Fortuner Legender": [
    "4x2 AT Diesel", "4x4 AT Diesel", "Neo Drive (48V mild hybrid)"
  ],
  "Toyota Vellfire": [
    "Hi", "VIP Executive Lounge"
  ],
  "Toyota Camry": [
    "Elegance", "Sprint"
  ],
  "Toyota Land Cruiser 300 (LC 300)": [
    "ZX", "GR-S"
  ]
}

interface AddLeadFormProps {
  onClose: () => void
  onAdd: (leadData: any) => void
}

const AddLeadForm = ({ onClose, onAdd }: AddLeadFormProps) => {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_mobile_number: "",
    alternate_mobile_number: "",
    source: "",
    model_interested: "",
    variant: "",
    trade_in_make: "",
    trade_in_model: "",
    trade_in_make_other: "",
    trade_in_model_other: "",
    trade_in_year: "",
    trade_in_km: "",
    follow_up_date: "",
    first_call_remark: ""
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingLead, setIsUpdatingLead] = useState(false)

  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.customer_mobile_number || !formData.follow_up_date) {
      toast.error("Please fill in required fields (Name, Mobile, and Follow-up Date)")
      return
    }

    // Validate mobile number
    const mobile = (formData.customer_mobile_number || '').trim()
    if (!/^\d{10}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number")
      return
    }

    setIsSubmitting(true)
    
    try {
      // Generate UID (simple format: CRM + timestamp)
      const uid = `CRM${Date.now().toString().slice(-6)}`
      
      // Get current user info
      const session = typeof window !== 'undefined' ? (localStorage.getItem('supabase_user') || localStorage.getItem('user')) : null
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      // Derive PS branch from user profile; fallback to username-based heuristic
      let psBranch = parsed?.branch || parsed?.ps_branch || parsed?.branch_name
      if (!psBranch && parsed?.username) {
        // Example: ps_mount_road -> Mount Road
        const uname = String(parsed.username)
        const m = uname.match(/ps[_-](.*)$/i)
        if (m && m[1]) {
          psBranch = m[1].replace(/[_-]/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase())
        }
      }
      // Final fallback to Mount Road to avoid hardcoded GEM
      if (!psBranch) psBranch = 'Mount Road'

      // First, create the lead in lead_master table (like walkin leads)
      const leadData = {
        uid,
        customer_name: formData.customer_name,
        customer_mobile_number: formData.customer_mobile_number,
        alternate_mobile_number: formData.alternate_mobile_number || null,
        source: formData.source,
        follow_up_date: formData.follow_up_date || null,
        ps_name: parsed?.name || parsed?.username || '',
        ps_id: parsed?.id || null,
        ps_branch: psBranch,
        cre_name: null, // Empty for PS leads
        cre_id: null, // Empty for PS leads
        lead_category: null,
        model_interested: formData.model_interested || null,
        variant: formData.variant || null,
        trade_in_make: formData.trade_in_make === 'Other' ? (formData.trade_in_make_other || null) : (formData.trade_in_make || null),
        trade_in_model: formData.trade_in_model === 'Other' ? (formData.trade_in_model_other || null) : (formData.trade_in_model || null),
        trade_in_year: formData.trade_in_year || null,
        trade_in_km: formData.trade_in_km || null,
        lead_status: "Pending", // For fresh leads
        final_status: "Pending",
        first_call_date: null, // No first call date for fresh leads
        first_call_remark: null, // No remarks for fresh leads
        first_call_lead_status: null
        // Timestamps will be handled by backend using now_ist_iso()
      }

      // Create lead using PS API - this will:
      // 1. Insert into lead_master
      // 2. Assign to CRE randomly (based on CRE team leader setup)
      // 3. Insert into ps_followup_master
      // 4. Handle trade-in details
      // 5. CRE will see it in walkin leads section
      // 6. PS will see it in walkin leads section
      const leadResponse = await fetch('/api/ps/leads', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(leadData)
      })

      if (leadResponse.ok) {
        const leadResult = await leadResponse.json()
        console.log('✅ [PS Lead] Lead created and assigned to CRE:', leadResult)
        
        // Show success message
        toast.success(`Lead submitted successfully! Lead ID: ${leadResult.lead_uid}`)
        
        // Lead added successfully:
        // - CRE will see it in walkin leads section
        // - PS will see it in walkin leads section  
        // - Both can take follow-ups
        // - When CRE qualifies, it goes to qualified_leads automatically
        
        // Wait for UI refresh to complete before closing form
        onAdd(leadData)
        
        // Add a small delay to ensure the refresh completes
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Only close form after successful insertion and refresh
        onClose()
      } else {
        const error = await leadResponse.text()
        console.error('❌ [PS Lead] Failed to create lead:', error)
        toast.error("Failed to create lead. Please try again.")
      }
    } catch (error) {
      console.error('Error adding lead:', error)
      toast.error("Error adding lead. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 px-6 pb-6">
      {/* Customer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <User className="w-5 h-5 mr-2 text-orange-500" />
          Customer Information
        </h3>
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
            <Label htmlFor="alternate_mobile_number" className="text-sm font-medium">
              Alternate Mobile Number
            </Label>
            <Input
              id="alternate_mobile_number"
              type="tel"
              placeholder="Enter alternate mobile number"
              value={formData.alternate_mobile_number}
              onChange={(e) => setFormData(prev => ({ ...prev, alternate_mobile_number: e.target.value }))}
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source" className="text-sm font-medium">
              Source *
            </Label>
            <Select value={formData.source} onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Walk-in">Walk-in</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Car className="w-5 h-5 mr-2 text-orange-500" />
          Vehicle Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model_interested" className="text-sm font-medium">
              Model Interested
            </Label>
            <Select value={formData.model_interested} onValueChange={(value) => setFormData(prev => ({ ...prev, model_interested: value, variant: "" }))}>
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
          <div className="space-y-2">
            <Label htmlFor="variant" className="text-sm font-medium">
              Variant
            </Label>
            <Select 
              value={formData.variant}
              disabled={!formData.model_interested} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, variant: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.model_interested ? 'Select variant' : 'Select model first'} />
              </SelectTrigger>
              <SelectContent>
                {formData.model_interested && toyotaModels[formData.model_interested as keyof typeof toyotaModels]?.map((variant) => (
                  <SelectItem key={variant} value={variant}>{variant}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Trade-in Information (Optional) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Car className="w-5 h-5 mr-2 text-orange-500" />
          Trade-in Information <span className="text-sm text-gray-500 ml-2">(Optional)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trade_in_make" className="text-sm font-medium">
              Make
            </Label>
            <Select value={formData.trade_in_make} onValueChange={(value) => setFormData(prev => ({ ...prev, trade_in_make: value, trade_in_model: '', trade_in_make_other: '' }))}>
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
            <Select value={formData.trade_in_model} disabled={!formData.trade_in_make} onValueChange={(value) => setFormData(prev => ({ ...prev, trade_in_model: value, trade_in_model_other: '' }))}>
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
                    Kia: ['Seltos','Sonet','Carens','EV6','Other'],
                    Renault: ['Kwid','Triber','Kiger','Duster','Other'],
                    Nissan: ['Magnite','Kicks','Other'],
                    Skoda: ['Kushaq','Slavia','Kodiaq','Other'],
                    Volkswagen: ['Polo','Vento','Taigun','Virtus','Other'],
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
              placeholder="Enter year (e.g., 2020)"
              value={formData.trade_in_year}
              onChange={(e) => setFormData(prev => ({ ...prev, trade_in_year: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trade_in_km" className="text-sm font-medium">
              Kilometers
            </Label>
            <Input
              id="trade_in_km"
              placeholder="Enter kilometers"
              value={formData.trade_in_km}
              onChange={(e) => setFormData(prev => ({ ...prev, trade_in_km: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Follow-up Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-orange-500" />
          Follow-up Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="follow_up_date" className="text-sm font-medium">
              Follow-up Date & Time *
            </Label>
            <Input
              id="follow_up_date"
              type="datetime-local"
              value={formData.follow_up_date}
              onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="first_call_remark" className="text-sm font-medium">
              Initial Remark
            </Label>
            <Textarea
              id="first_call_remark"
              placeholder="Enter initial remark"
              value={formData.first_call_remark}
              onChange={(e) => setFormData(prev => ({ ...prev, first_call_remark: e.target.value }))}
              className="min-h-[80px]"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.customer_name || !formData.customer_mobile_number || !formData.follow_up_date || !formData.source}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg"
        >
          {isSubmitting ? "Adding..." : "Add Lead"}
        </Button>
      </div>
    </div>
  )
}

interface PSFollowUp {
  id: string
  lead_uid: string
  ps_name: string
  ps_id: string
  ps_branch: string
  customer_name: string
  customer_mobile_number: string
  alternate_mobile_number: string
  source: string
  cre_name: string
  cre_id: string
  lead_category: string
  model_interested: string
  follow_up_date: string
  lead_status: string
  first_call_date: string
  first_call_remark: string
  first_call_lead_status?: string
  second_call_date: string
  second_call_remark: string
  second_call_lead_status?: string
  third_call_date: string
  third_call_remark: string
  third_call_lead_status?: string
  fourth_call_date: string
  fourth_call_remark: string
  fourth_call_lead_status?: string
  fifth_call_date: string
  fifth_call_remark: string
  fifth_call_lead_status?: string
  // CRE call history fields
  cre_first_remark?: string
  cre_second_remark?: string
  cre_third_remark?: string
  cre_fourth_remark?: string
  cre_fifth_remark?: string
  cre_sixth_remark?: string
  cre_first_call_date?: string
  cre_second_call_date?: string
  cre_third_call_date?: string
  cre_fourth_call_date?: string
  cre_fifth_call_date?: string
  cre_sixth_call_date?: string
  cre_first_call_lead_status?: string
  cre_second_call_lead_status?: string
  cre_third_call_lead_status?: string
  cre_fourth_call_lead_status?: string
  cre_fifth_call_lead_status?: string
  cre_sixth_call_lead_status?: string
  sixth_call_date: string
  sixth_call_remark: string
  sixth_call_lead_status?: string
  seventh_call_date: string
  seventh_call_remark: string
  seventh_call_lead_status?: string
  eighth_call_date?: string
  eighth_call_remark?: string
  eighth_call_lead_status?: string
  ninth_call_date?: string
  ninth_call_remark?: string
  ninth_call_lead_status?: string
  tenth_call_date?: string
  tenth_call_remark?: string
  tenth_call_lead_status?: string
  final_status: string
  test_drive_done: boolean
  tat: number
  created_at: string
  icrop_id?: string
  updated_at: string
  ps_assigned_at: string
  won_timestamp: string
  lost_timestamp: string
  variant: string
  buying_plan: string
  finance_option: string
  profession?: string
  test_drive_type?: string
  trade_in?: string
  booking_id?: string
  retailed_id?: string
  // Server-side classification
  is_fresh?: boolean
  is_pending?: boolean
}

const TabButton = ({ id, label, count, icon: Icon, isActive, onClick }: any) => {
  // Tab button rendering with count
  return (
  <button
    data-tab={id}
    onClick={() => onClick(id)}
    className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2 md:px-3 md:py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap min-w-0 flex-1 ${
      isActive
        ? 'bg-white/80 backdrop-blur-md text-orange-700 shadow-lg border border-white/20'
        : 'text-gray-600 hover:text-gray-800 hover:bg-white/40 hover:backdrop-blur-sm'
    }`}
    style={isActive ? {
      boxShadow: '0 8px 32px rgba(234, 88, 12, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)'
    } : {}}
  >
    <Icon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
    <span className="text-xs md:text-sm font-semibold leading-tight text-center break-words max-w-full">
      {label.split(' ').map((word: string, index: number) => (
        <span key={index} className="block">
          {word}
        </span>
      ))}
    </span>
    <span className={`count-display px-1.5 py-0.5 rounded-full text-xs font-bold min-w-[20px] text-center ${
      isActive ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
    }`}>
      {count}
    </span>
  </button>
)
}

export default function PSDashboard() {
  // Render count for debugging
  const renderCount = useRef(0)
  renderCount.current++
  
  // Initialize with cached data to prevent reset on navigation
  const [followUps, setFollowUps] = useState<PSFollowUp[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ps_followups_cache')
        const timestamp = localStorage.getItem('ps_followups_timestamp')
        
        // Use cache if it's less than 5 minutes old
        if (cached && timestamp) {
          const cacheAge = Date.now() - parseInt(timestamp)
          if (cacheAge < 5 * 60 * 1000) { // 5 minutes
            return JSON.parse(cached)
          }
        }
      } catch {
        return []
      }
    }
    return []
  })
  const [qualifiedLeads, setQualifiedLeads] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ps_qualified_leads_cache')
        const timestamp = localStorage.getItem('ps_qualified_leads_timestamp')
        
        // Use cache if it's less than 5 minutes old
        if (cached && timestamp) {
          const cacheAge = Date.now() - parseInt(timestamp)
          if (cacheAge < 5 * 60 * 1000) { // 5 minutes
            return JSON.parse(cached)
          }
        }
      } catch {
        return []
      }
    }
    return []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [countsUpdating, setCountsUpdating] = useState(false)
  const [forceRender, setForceRender] = useState(0)
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('')
  const [isUpdatingLead, setIsUpdatingLead] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState<PSFollowUp | null>(null)
  const [updateDialog, setUpdateDialog] = useState(false)
  const [callNumber, setCallNumber] = useState(1)
  const [callRemark, setCallRemark] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")
  const [finalStatus, setFinalStatus] = useState("")
  const [extraLeadInfo, setExtraLeadInfo] = useState<{ profession?: string; test_drive_type?: string; trade_in?: string } | null>(null)
  const [callOutcome, setCallOutcome] = useState<string>("")
  const [tradeInOpen, setTradeInOpen] = useState(false)
  const [tradeInLoading, setTradeInLoading] = useState(false)
  const [tradeInData, setTradeInData] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'fresh'|'today'|'pending'|'walkin'|'booked'|'retailed'|'wonlost'>('fresh')
  const [activeSubTab, setActiveSubTab] = useState<'requested'|'approved'|'rejected'>('requested')
  const [notifications, setNotifications] = useState<Array<{id: string, type: 'approved'|'rejected'|'walkin', leadUid: string, requestType?: 'booking'|'retailed', timestamp: Date, message?: string}>>([])
  const [bookingId, setBookingId] = useState('')
  const [retailedId, setRetailedId] = useState('')
  const [showMobileRefreshButton, setShowMobileRefreshButton] = useState(true)
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false)
  
  // Ref to maintain latest followUps reference (fix stale closure in realtime subscription)
  const followUpsRef = useRef(followUps)
  
  // Update ref whenever followUps changes
  useEffect(() => {
    followUpsRef.current = followUps
  }, [followUps])
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<'today'|'all'|'range'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pendingFilter, setPendingFilter] = useState<'all'|'hot'|'warm'|'cold'>('all')
  const [todaySearch, setTodaySearch] = useState('')
  const [freshSearch, setFreshSearch] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')
  const [walkinSearch, setWalkinSearch] = useState('')
  const [pendingStatusFilter, setPendingStatusFilter] = useState<'all'|'pending'|'booked'>('all')

  // View toggle state - default to card on mobile, table on desktop
  const [viewMode, setViewMode] = useState<'table'|'card'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'card' : 'table'
    }
    return 'table'
  })

  // Responsive view mode - switch to card view on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'table') {
        setViewMode('card')
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [viewMode])

  // Reset filters when switching tabs
  const handleTabChange = (tab: 'fresh'|'today'|'pending'|'walkin'|'booked'|'retailed'|'wonlost') => {
    setActiveTab(tab)
    setActiveSubTab('requested') // Reset sub-tab to 'requested' when switching main tabs
    
    // Reset filters based on tab - set all to 'all' for better UX
    if (tab === 'today') {
      setDateFilter('all')  // Changed from 'today' to 'all'
      setStartDate('')
      setEndDate('')
      setTodaySearch('')
    } else if (tab === 'wonlost') {
      setDateFilter('all')
      setStartDate('')
      setEndDate('')
    } else if (tab === 'pending') {
      setDateFilter('all')  // Set to 'all' instead of keeping current filter
      setPendingFilter('all')
    } else if (tab === 'walkin') {
      setDateFilter('all')  // Set to 'all' instead of keeping current filter
      setWalkinSearch('')
    } else {
      // For all other tabs (fresh, booked, retailed), set to 'all'
      setDateFilter('all')
      setStartDate('')
      setEndDate('')
    }
  }

  // Auto-update final status when call outcome changes
  useEffect(() => {
    if (callOutcome) {
      const newFinalStatus = getFinalStatusForLeadStatus(callOutcome)
      setFinalStatus(newFinalStatus)
    }
  }, [callOutcome])

  // Small helper to render uniform label/value pairs on a single line
  const InfoLine = ({ label, value }: { label: string; value?: string }) => (
    <div className="text-[14px] text-gray-800 leading-6">
      <span className="font-medium">{label}:</span> <span>{value || '—'}</span>
    </div>
  )

  useEffect(() => {
    loadFollowUps()
    loadQualifiedLeads()

    // Set up real-time subscriptions similar to CRE dashboard
    let cleanup: (() => void) | undefined

    const initializeSubscriptions = () => {
      try {
        cleanup = setupRealtimeSubscriptions()
      } catch (error) {
        console.error('Failed to setup subscriptions:', error)
      }
    }

    // Delay subscription setup slightly to avoid race conditions
    const subscriptionTimer = setTimeout(initializeSubscriptions, 100)

    // Disabled aggressive polling - real-time subscriptions work now!
    // Only poll occasionally as a safety net
    const safetyPolling = setInterval(() => {
      if (!isLoading && !isRefreshing) {
        loadFollowUps()
        loadQualifiedLeads()
      }
    }, 300000) // 5 minutes - just as a safety net

    // Cleanup function
    return () => {
      clearTimeout(subscriptionTimer)
      if (cleanup) {
        cleanup()
      }
      clearInterval(safetyPolling)
    }
  }, [])

  const setupRealtimeSubscriptions = () => {
    try {
      const supabase = createClient()

      // Subscribe to ps_followup_master changes
      // Using closure-safe approach: no direct state access, only function calls
      const psFollowupSubscription = supabase
        .channel('ps_followup_master_changes')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ps_followup_master'
          },
          (payload) => {
            console.log('🔄 [PS Real-time] Change detected, refreshing data...')

            // Clear any cached data
            try {
              localStorage.removeItem('ps_followups_cache')
              localStorage.removeItem('ps_followups_timestamp')
            } catch (error) {
              // Silently handle cache clearing errors
            }

            // Force immediate data refresh using functional updates (no stale closure)
            loadFollowUps(true)
            loadQualifiedLeads()
            setForceRender(prev => prev + 1)

            // Additional refresh to ensure data is synced
            setTimeout(() => {
              loadFollowUps(true)
              loadQualifiedLeads()
              setForceRender(prev => prev + 1)
            }, 1000)
          }
        )
        .subscribe()

      // Return cleanup function
      return () => {
        try {
          supabase.removeChannel(psFollowupSubscription)
        } catch (error) {
          // Silently handle cleanup errors
        }
      }

    } catch (error) {
      // Fallback to polling if real-time fails
      const fallbackInterval = setInterval(() => {
        if (!isLoading && !isRefreshing) {
          loadFollowUps()
        }
      }, 5000) // 5 seconds fallback

      return () => clearInterval(fallbackInterval)
    }
  }

  // Track followUps state changes
  useEffect(() => {
    // State tracking (silent)
  }, [followUps, forceRender])

  // Effect to handle custom events for immediate refresh
  useEffect(() => {
    // Listen for immediate refresh events after modal submits (like CRE dashboard)
    const immediateRefresh = async () => {
      setIsRefreshing(true)
      setCountsUpdating(true)
      await loadFollowUps(true)
      await loadQualifiedLeads()
      setForceRender(prev => prev + 1) // Force UI update

      // Additional refresh after delay to ensure data is fully synced
      setTimeout(async () => {
        await loadFollowUps(true)
        await loadQualifiedLeads()
        setForceRender(prev => prev + 1)
        setIsRefreshing(false)
        setCountsUpdating(false)
      }, 1500)
    }
    
    // Listen for lead status changes specifically
    const handleLeadStatusChange = async () => {
      setIsRefreshing(true)
      setCountsUpdating(true)
      // Multiple refreshes to catch status changes
      await loadFollowUps(true)
      await loadQualifiedLeads()
      setForceRender(prev => prev + 1) // Force UI update

      // Additional refresh after delay to ensure data is fully synced
      setTimeout(async () => {
        await loadFollowUps(true)
        await loadQualifiedLeads()
        setForceRender(prev => prev + 1)
        setIsRefreshing(false)
        setCountsUpdating(false)
      }, 1500)
    }
    
    window.addEventListener('lead-master-updated', immediateRefresh as any)
    window.addEventListener('lead-status-changed', handleLeadStatusChange as any)
    window.addEventListener('lead-added', immediateRefresh as any)
    window.addEventListener('lead-updated', immediateRefresh as any)

    return () => {
      window.removeEventListener('lead-master-updated', immediateRefresh as any)
      window.removeEventListener('lead-status-changed', handleLeadStatusChange as any)
      window.removeEventListener('lead-added', immediateRefresh as any)
      window.removeEventListener('lead-updated', immediateRefresh as any)
    }
  }, [])

  // Effect to handle hiding mobile refresh button after KPI cards section
  useEffect(() => {
    const handleScroll = () => {
      // Only apply this logic on mobile screens
      if (window.innerWidth >= 768) return

      // Get the KPI cards section
      const kpiSection = document.querySelector('.stats-grid')
      if (kpiSection) {
        const kpiSectionBottom = kpiSection.getBoundingClientRect().bottom
        // Hide refresh button if KPI section has passed the top of the viewport
        setShowMobileRefreshButton(kpiSectionBottom > 0)
      }
    }

    // Add scroll listener only on mobile
    if (window.innerWidth < 768) {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const loadFollowUps = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true)
      setCountsUpdating(true)
    } else {
      setIsLoading(true)
    }

    try {
      const timestamp = new Date().toISOString()

      const response = await fetch(`/api/ps-followup?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include' // Include cookies for authentication
      })

      if (response.ok) {
        const data = await response.json()

        // CRITICAL: Use functional update with NEW array reference
        setFollowUps(() => {
          const newData = data.map((item: any) => ({...item})) // Deep clone each object
          return newData
        })

        // Clear cache to force fresh data
        try {
          localStorage.removeItem('ps_followups_cache')
          localStorage.removeItem('ps_followups_timestamp')
        } catch (error) {
          // Silently handle cache clearing errors
        }

        // Multiple force renders to ensure UI updates
        setForceRender(prev => prev + 1)
        setTimeout(() => {
          setForceRender(prev => prev + 1)
        }, 100)
        setLastRefreshTime(new Date().toLocaleTimeString())
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to load follow-ups')
      }
    } catch (error) {
      toast.error('Failed to load follow-ups')
    } finally {
      if (forceRefresh) {
        setTimeout(() => {
          setIsRefreshing(false)
          setCountsUpdating(false)
        }, 500)
      } else {
        setIsLoading(false)
      }
    }
  }

  const loadQualifiedLeads = async () => {
    try {
      const session = typeof window !== 'undefined' ? (localStorage.getItem('supabase_user') || localStorage.getItem('user')) : null
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch('/api/qualified-leads', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const responseData = await response.json()
        // Extract leads array from the new API response format
        const data = responseData.leads || responseData || []
        // Qualified leads loaded
        // Debug logging removed
        
        // Check for status changes before updating state
        checkForStatusChanges(data)
        
        // Debug logging
        // Qualified leads count loaded
        
        // Debug: Check for retailed leads
        const retailedLeads = data.filter((lead: any) => lead.retailed_id)
        // Retailed leads found and counted
        
        // Debug: Show all leads with their retailed info (removed for performance)
        
        setQualifiedLeads(data)
        
        // Cache the data in localStorage to prevent reset on navigation
        try {
          localStorage.setItem('ps_qualified_leads_cache', JSON.stringify(data))
          localStorage.setItem('ps_qualified_leads_timestamp', Date.now().toString())
        } catch (error) {
          console.warn('Failed to cache qualified leads:', error)
        }
      } else {
        console.error('Error loading qualified leads:', await response.text())
      }
    } catch (error) {
      console.error('Error loading qualified leads:', error)
    }
  }

  // Check for status changes and show notifications
  const checkForStatusChanges = (newLeads: any[]) => {
    newLeads.forEach(newLead => {
      const oldLead = qualifiedLeads.find(old => old.lead_uid === newLead.lead_uid)
      
      if (oldLead && newLead.ps_name?.toLowerCase() === currentPSName.toLowerCase()) {
        // Check booking status changes
        if (oldLead.booking_status !== newLead.booking_status) {
          if (newLead.booking_status === 'Approved') {
            showNotification('approved', newLead.lead_uid, 'booking')
          } else if (newLead.booking_status === 'Rejected') {
            showNotification('rejected', newLead.lead_uid, 'booking')
          }
        }
        
        // Check retail status changes
        if (oldLead.retailed_status !== newLead.retailed_status) {
          if (newLead.retailed_status === 'Approved') {
            showNotification('approved', newLead.lead_uid, 'retailed')
          } else if (newLead.retailed_status === 'Rejected') {
            showNotification('rejected', newLead.lead_uid, 'retailed')
          }
        }
      }
    })
  }

  const showNotification = (type: 'approved'|'rejected', leadUid: string, requestType: 'booking'|'retailed') => {
    const notification = {
      id: `${leadUid}-${requestType}-${Date.now()}`,
      type,
      leadUid,
      requestType,
      timestamp: new Date()
    }
    
    setNotifications(prev => [...prev, notification])
    
    // Show toast notification
    if (type === 'approved') {
      toast.success(`🎉 ${requestType === 'booking' ? 'Booking' : 'Retail'} request for ${leadUid} has been approved!`)
    } else {
      toast.error(`❌ ${requestType === 'booking' ? 'Booking' : 'Retail'} request for ${leadUid} has been rejected.`)
    }
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }

  // Helper function to convert UI display names to internal storage names
  const getInternalStatusName = (uiStatus: string) => {
    switch (uiStatus) {
      case 'Booked': return 'Booking Requested'
      case 'Booked with another number': return 'Booking Requested'
      case 'Retailed': return 'Retail Requested'
      default: return uiStatus
    }
  }

  const handleUpdateFollowUp = async () => {
    if (!selectedFollowUp) return

    // NEW: Validate booking/retail ID requirements
    if (callOutcome === 'Booked' || callOutcome === 'Booked with another number') {
      if (!bookingId || bookingId.trim() === "") {
        toast.error("Booking ID is required when Call Outcome is 'Booked'. Please enter the booking ID.")
        return
      }
    }
    
    if (callOutcome === 'Retailed') {
      if (!retailedId || retailedId.trim() === "") {
        toast.error("Retail ID is required when Call Outcome is 'Retailed'. Please enter the retail ID.")
        return
      }
    }

    // Validate Order No. format if Booked
    if ((callOutcome === 'Booked' || callOutcome === 'Booked with another number') && bookingId) {
      if (bookingId.length !== 12 || !bookingId.startsWith('ORD') || !/^ORD\d{9}$/.test(bookingId)) {
        alert('Order No. must be in format ORD followed by exactly 9 digits (e.g., ORD123456789)')
        return
      }
    }

    // Validate DN No. format if Retailed
    if (callOutcome === 'Retailed' && retailedId) {
      if (retailedId.length !== 12 || !retailedId.startsWith('DNN') || !/^DNN\d{9}$/.test(retailedId)) {
        alert('DN No. must be in format DNN followed by exactly 9 digits (e.g., DNN123456789)')
        return
      }
    }

    setIsUpdatingLead(true)
    try {
      // Get authentication token
      const session = typeof window !== 'undefined' ? (localStorage.getItem('supabase_user') || localStorage.getItem('user')) : null
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const updateData: any = {
        id: selectedFollowUp.id,
        lead_uid: selectedFollowUp.lead_uid,
        lead_status: getInternalStatusName(callOutcome), // Convert UI name to internal name
        // ps_id and ps_name are not needed in update - backend will use current user from JWT
        follow_up_date: followUpDate && followUpDate.trim() ? (followUpDate.includes('T') ? followUpDate : followUpDate + 'T00:00') : (selectedFollowUp.follow_up_date || null),
        final_status: finalStatus && finalStatus.trim() ? finalStatus : (selectedFollowUp.final_status || "Pending"),
        updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T')
      }

      // Handle booking/retailed ID for won leads
      if (isLeadWon(callOutcome)) {
        if ((callOutcome === 'Booked' || callOutcome === 'Booked with another number') && bookingId) {
          updateData.booking_id = bookingId
        } else if (callOutcome === 'Retailed' && retailedId) {
          updateData.retailed_id = retailedId
        }
      }

      // Lock follow-up date and final status for won/lost leads
      if (isLeadWon(callOutcome)) {
        updateData.final_status = 'Waiting for Approval'
        // Don't update follow_up_date for won leads - keep existing date
        delete updateData.follow_up_date
      } else if (isLeadLost(callOutcome)) {
        updateData.final_status = 'Lost Requested'
        // Don't update follow_up_date for lost leads - keep existing date
        delete updateData.follow_up_date
      }

      // Add call remark based on call number
      const callFields = [
        'first_call_remark',
        'second_call_remark', 
        'third_call_remark',
        'fourth_call_remark',
        'fifth_call_remark',
        'sixth_call_remark',
        'seventh_call_remark',
        'eighth_call_remark',
        'ninth_call_remark',
        'tenth_call_remark'
      ]

      const effectiveRemark = callRemark
      const currentCallNumber = getNextCallNumber(selectedFollowUp)
      
      // Update call remark if provided
      if (effectiveRemark.trim() && currentCallNumber <= callFields.length) {
        updateData[callFields[currentCallNumber - 1]] = effectiveRemark
        updateData[`${callFields[currentCallNumber - 1].replace('_remark', '_date')}`] = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T')
      }
      
      // Update call lead status if call outcome is selected
      const callLeadStatusFields = [
        'first_call_lead_status', 'second_call_lead_status', 'third_call_lead_status',
        'fourth_call_lead_status', 'fifth_call_lead_status', 'sixth_call_lead_status', 'seventh_call_lead_status',
        'eighth_call_lead_status', 'ninth_call_lead_status', 'tenth_call_lead_status'
      ]
      
      if (callOutcome && currentCallNumber <= callLeadStatusFields.length) {
        updateData[callLeadStatusFields[currentCallNumber - 1]] = getInternalStatusName(callOutcome)
      }

      // Updating follow-up

      const response = await fetch('/api/ps-followup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        const responseData = await response.json()
        
        
        // Show appropriate success message based on lead status
        if (isLeadWon(callOutcome)) {
          if (callOutcome === 'Booked' || callOutcome === 'Booked with another number') {
            toast.success('Follow-up updated! Booking request sent to Sales Manager for approval')
          } else if (callOutcome === 'Retailed') {
            toast.success('Follow-up updated! Retail request sent to Sales Manager for approval')
          } else {
            toast.success('Follow-up updated successfully')
          }
        } else if (isLeadLost(callOutcome)) {
          toast.success('Lost status requested! Awaiting CRE approval')
        } else {
          toast.success('Follow-up updated successfully')
        }
        
        setUpdateDialog(false)
        setSelectedFollowUp(null)
        setCallRemark("")
        setCallOutcome("")
        setFollowUpDate("")
        setFinalStatus("")
        
        // Force complete state reset
        setFollowUps([])
        setForceRender(prev => prev + 1)
        
        // Wait a tick for React to process the empty state
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Force immediate refresh
        await loadFollowUps(true)
        await loadQualifiedLeads()

        // Additional refresh after a short delay to catch any backend processing
        setTimeout(async () => {
          await loadFollowUps(true)
          await loadQualifiedLeads()
          setForceRender(prev => prev + 1)
        }, 1000)

        // Dispatch custom events for immediate refresh across components
        // Note: PS dashboard events are global since PS users can see leads from multiple CREs
        window.dispatchEvent(new CustomEvent('lead-master-updated'))
        window.dispatchEvent(new CustomEvent('lead-status-changed'))

        // Force UI update by incrementing forceRender
        setForceRender(prev => prev + 1)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update follow-up')
      }
    } catch (error) {
      toast.error('Failed to update follow-up')
    } finally {
      setIsUpdatingLead(false)
    }
  }

  const openUpdateDialog = (followUp: PSFollowUp) => {
    setSelectedFollowUp(followUp)
    setUpdateDialog(true)
    setCallNumber(1)
    setCallRemark("")
    // Default to tomorrow if no follow-up date exists
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    setFollowUpDate(followUp.follow_up_date || tomorrow)
    setFinalStatus(followUp.final_status || "")
    setCallOutcome("")
    setBookingId("")
    setRetailedId("")
    // Load extra info (profession, test_drive_type, trade-in) from backend
    ;(async () => {
      try {
        const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
        const parsed = session ? JSON.parse(session) : null
        const token = parsed?.access_token || ''
        const timestamp = Date.now()
        const res = await fetch(`/api/trade-in/${encodeURIComponent(followUp.lead_uid)}?_t=${timestamp}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Cache-Control': 'no-store'
          }
        })
        const data = await res.json()
        if (res.ok) {
          const ti = (data?.trade_in_details || {}) as any
          const normalized = {
            make: ti.make || ti.trade_in_make || ti.tradeMake || '',
            model: ti.model || ti.trade_in_model || ti.tradeModel || '',
            year: ti.year || ti.trade_in_year || ti.tradeYear || '',
            kms_driven: ti.kms_driven || ti.km || ti.trade_in_km || ti.kms || '',
            ownership: ti.ownership || ti.trade_in_ownership || ''
          }
          setTradeInData((prev: any) => ({
            ...(prev || {}),
            ...normalized,
            customer_name: data.customer_name || data.lead_master?.customer_name || (ti?.customer_name || ''),
            customer_mobile_number: data.customer_mobile_number || data.lead_master?.customer_mobile_number || (ti?.customer_mobile_number || '')
          }))
          setExtraLeadInfo({
            profession: data?.profession || undefined,
            test_drive_type: data?.test_drive_type || undefined,
            trade_in: (data?.trade_in || '').toString(),
          })
        } else {
          setExtraLeadInfo(null)
        }
      } catch {
        setExtraLeadInfo(null)
      }
    })()
  }

  // Open Trade-in modal and fetch details for a given lead UID
  const openTradeInModal = (leadUid: string) => {
    setTradeInLoading(true)
    setTradeInOpen(true)
    const timestamp = Date.now()
    const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
    const parsed = session ? JSON.parse(session) : null
    const token = parsed?.access_token || ''
    fetch(`/api/trade-in/${encodeURIComponent(leadUid)}?_t=${timestamp}`, {
      headers: { 
        'Cache-Control': 'no-store',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    })
      .then(res => res.json())
      .then(data => {
        const ti = (data.trade_in_details || {}) as any
        const normalized = {
          make: ti.make || ti.trade_in_make || ti.tradeMake || '',
          model: ti.model || ti.trade_in_model || ti.tradeModel || '',
          year: ti.year || ti.trade_in_year || ti.tradeYear || '',
          kms_driven: ti.kms_driven || ti.km || ti.trade_in_km || ti.kms || '',
          ownership: ti.ownership || ti.trade_in_ownership || ''
        }
        const combinedData = {
          ...normalized,
          customer_name: data.customer_name || data.lead_master?.customer_name,
          customer_mobile_number: data.customer_mobile_number || data.lead_master?.customer_mobile_number,
          trade_in: data.trade_in,
          profession: data.profession,
          test_drive_type: data.test_drive_type
        }
        setTradeInData(combinedData)
        setTradeInLoading(false)
      })
      .catch(err => {
        console.error('Error fetching trade-in data:', err)
        setTradeInLoading(false)
        toast.error('Failed to fetch trade-in data')
      })
  }

  const getStatusBadge = (status: string, followUp?: PSFollowUp) => {
    switch (status?.toLowerCase()) {
      case 'won':
        return <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 font-medium px-3 py-1"><CheckCircle className="w-3 h-3 mr-1" />Won</Badge>
      case 'lost':
        return <Badge className="bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-0 font-medium px-3 py-1"><XCircle className="w-3 h-3 mr-1" />Lost</Badge>
      case 'lost requested':
        return <Badge className="bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />Lost Requested</Badge>
      case 'qualified':
        return <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-0 font-medium px-3 py-1"><Star className="w-3 h-3 mr-1" />Qualified</Badge>
      case 'pending':
        // Show temperature indicator for pending leads in pending tab
        if (activeTab === 'pending' && followUp) {
          const temperature = getPendingTemperature(followUp)
          switch (temperature) {
            case 'hot':
              return <Badge className="bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />🔥 Hot</Badge>
            case 'warm':
              return <Badge className="bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />☀️ Warm</Badge>
            case 'cold':
              return <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />❄️ Cold</Badge>
          }
        }
        return <Badge className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 border-0 font-medium px-3 py-1"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'hot':
        return <Badge className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-0 font-medium px-3 py-1">Hot</Badge>
      case 'warm':
        return <Badge className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 border-0 font-medium px-3 py-1">Warm</Badge>
      default:
        return <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-0 font-medium px-3 py-1">{status || 'Pending'}</Badge>
    }
  }

  const getNextCallNumber = (followUp: PSFollowUp | null) => {
    if (!followUp) return 1
    
    const calls = [
      followUp.first_call_remark,
      followUp.second_call_remark,
      followUp.third_call_remark,
      followUp.fourth_call_remark,
      followUp.fifth_call_remark,
      followUp.sixth_call_remark,
      followUp.seventh_call_remark,
      followUp.eighth_call_remark,
      followUp.ninth_call_remark,
      followUp.tenth_call_remark
    ]
    
    for (let i = 0; i < calls.length; i++) {
      if (!calls[i]) return i + 1
    }
    return 10
  }

  // Helper function to check if lead is won (booked/retailed)
  const isLeadWon = (status: string) => {
    return status === 'Booked' || status === 'Booked with another number' || status === 'Retailed'
  }

  // Helper function to check if lead is lost
  const isLeadLost = (status: string) => {
    return status === 'Lost to Competition' || status === 'Lost to codealer' || status === 'Dropped' || status === 'Finance Rejected' || status === 'Not Interested'
  }

  // Helper function to check if lead status requires lost request
  const requiresLostRequest = (status: string) => {
    return status === 'Lost to Competition' || status === 'Lost to codealer' || status === 'Dropped' || status === 'Finance Rejected' || status === 'Not Interested'
  }

  // Helper function to check if follow-up date should be locked
  const isFollowUpDateLocked = (status: string) => {
    return isLeadWon(status) || isLeadLost(status)
  }

  // Helper function to check if final status should be locked
  const isFinalStatusLocked = (status: string) => {
    return isLeadWon(status) || isLeadLost(status)
  }

  // Helper function to get the appropriate final status based on lead status
  const getFinalStatusForLeadStatus = (leadStatus: string) => {
    if (leadStatus === 'Booked' || leadStatus === 'Booked with another number' || leadStatus === 'Retailed') {
      return 'Waiting for Approval'
    } else if (isLeadLost(leadStatus)) {
      return 'Lost Requested'
    }
    return 'Pending'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isToday = (dateString?: string) => {
    if (!dateString) return false
    const d = new Date(dateString)
    const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }

  // Calculate stats
  const stats = {
    totalAssigned: followUps.length,
    pending: followUps.filter(f => (f.final_status || '').toLowerCase() === 'pending').length,
    won: followUps.filter(f => (f.final_status || '').toLowerCase() === 'won').length,
    lost: followUps.filter(f => (f.final_status || '').toLowerCase() === 'lost').length
  }

  // Helper function to check if a date is within range
  const isWithinDateRange = (dateString: string, start: string, end?: string) => {
    if (!dateString || !start) return false
    
    // Normalize date strings to YYYY-MM-DD format
    const normalizeDate = (dateStr: string) => {
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0]
      }
      return dateStr
    }
    
    const normalizedDate = normalizeDate(dateString)
    const normalizedStart = normalizeDate(start)
    
    // If no end date, match only the start date
    if (!end) {
      return normalizedDate === normalizedStart
    }
    
    const normalizedEnd = normalizeDate(end)
    return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd
  }

  // Helper function to check if a follow-up is overdue
  const isOverdue = (followUpDate: string) => {
    if (!followUpDate) return false
    
    const followUp = followUpDate.includes('T') ? followUpDate.slice(0,10) : followUpDate
    const today = new Date().toISOString().slice(0,10)
    return followUp < today
  }

  // Helper function to get overdue days
  const getOverdueDays = (followUpDate: string) => {
    if (!followUpDate) return 0
    
    const followUp = followUpDate.includes('T') ? followUpDate.slice(0,10) : followUpDate
    const today = new Date().toISOString().slice(0,10)
    
    if (followUp >= today) return 0
    
    const followUpTime = new Date(followUp + 'T00:00:00').getTime()
    const todayTime = new Date(today + 'T00:00:00').getTime()
    return Math.ceil((todayTime - followUpTime) / (1000 * 60 * 60 * 24))
  }

  // Helper function to get pending temperature based on lead age
  const getPendingTemperature = (followUp: PSFollowUp) => {
    const assignedDate = new Date(followUp.ps_assigned_at)
    const daysSinceAssigned = Math.ceil((Date.now() - assignedDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceAssigned <= 1) return 'hot'
    if (daysSinceAssigned <= 3) return 'warm'
    return 'cold'
  }

  // Apply date filters
  const applyDateFilter = (list: PSFollowUp[]) => {
    switch (dateFilter) {
      case 'today':
        return list.filter(f => isToday(f.follow_up_date))
      case 'all':
        return list
      case 'range':
        return list.filter(f => isWithinDateRange(f.follow_up_date, startDate))
      default:
        return list
    }
  }

  // Apply pending lead category filter
  const applyPendingFilter = (list: PSFollowUp[]) => {
    if (pendingFilter === 'all') return list
    return list.filter(f => (f.lead_category || '').toLowerCase() === pendingFilter.toLowerCase())
  }

  // Apply pending final status filter
  const applyPendingStatusFilter = (list: PSFollowUp[]) => {
    if (pendingStatusFilter === 'all') return list
    return list.filter(f => (f.final_status || '').toLowerCase() === pendingStatusFilter.toLowerCase())
  }

  // Helper function to check if a lead has been updated (has any call remarks or status)
  const hasBeenUpdated = (followUp: PSFollowUp) => {
    // Check if any call remarks exist (check for actual string content)
    const callRemarkFields = [
      'first_call_remark', 'second_call_remark', 'third_call_remark',
      'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark',
      'eighth_call_remark', 'ninth_call_remark', 'tenth_call_remark'
    ]

    const hasCallRemarks = callRemarkFields.some(field => {
      const remark = followUp[field as keyof PSFollowUp]
      return remark && typeof remark === 'string' && remark.trim().length > 0
    })

    // Check if any call dates exist (indicates a call was made)
    const callDateFields = [
      'first_call_date', 'second_call_date', 'third_call_date',
      'fourth_call_date', 'fifth_call_date', 'sixth_call_date', 'seventh_call_date',
      'eighth_call_date', 'ninth_call_date', 'tenth_call_date'
    ]

    const hasCallDates = callDateFields.some(field => {
      const callDate = followUp[field as keyof PSFollowUp]
      return callDate && typeof callDate === 'string' && callDate.trim().length > 0
    })

    // Check if final_status indicates any activity (not just 'Pending')
    const hasFinalStatusActivity = followUp.final_status &&
      typeof followUp.final_status === 'string' &&
      followUp.final_status.trim().length > 0 &&
      followUp.final_status.toLowerCase() !== 'pending'

    // Check if any call lead status is set (not null/empty and not 'pending')
    const callStatusFields = [
      'first_call_lead_status', 'second_call_lead_status', 'third_call_lead_status',
      'fourth_call_lead_status', 'fifth_call_lead_status', 'sixth_call_lead_status', 'seventh_call_lead_status',
      'eighth_call_lead_status', 'ninth_call_lead_status', 'tenth_call_lead_status'
    ]

    const hasCallStatus = callStatusFields.some(field => {
      const status = followUp[field as keyof PSFollowUp]
      return status && typeof status === 'string' && status.trim().length > 0 && status.toLowerCase() !== 'pending'
    })

    const isUpdated = hasCallRemarks || hasCallDates || hasFinalStatusActivity || hasCallStatus
    return isUpdated
  }

  // Memoized count calculations using server-side classification (prevents stale closure issues)
  const { freshCount, todayCount, pendingCount, walkinCount, freshList, todayList, pendingList, walkinList } = useMemo(() => {
    // Fresh leads: Use server-side classification from backend
    const freshBaseList = followUps.filter(f => f.is_fresh === true)
    // Apply date filter for fresh list display
    const filteredFreshList = applyDateFilter(freshBaseList)
    // Apply search for fresh list
    const freshList = filteredFreshList.filter(f => {
      if (!freshSearch.trim()) return true
      const q = freshSearch.toLowerCase()
      return (
        f.customer_name?.toLowerCase().includes(q) ||
        f.customer_mobile_number?.toLowerCase().includes(q) ||
        f.lead_uid?.toLowerCase().includes(q)
      )
    })
    // IMPORTANT: Count should show ALL fresh leads regardless of filter
    const freshCount = freshBaseList.length

    
    // Today's follow-ups: Leads with follow-up dates for today or overdue
    // Today list should ignore global dateFilter and always be today + overdue
    const todayBaseList = followUps.filter(f =>
      !['won','lost'].includes((f.final_status || '').toLowerCase()) &&
      (isToday(f.follow_up_date) || isOverdue(f.follow_up_date))
    )
    // Apply search for today's list
    const todayListSearched = todayBaseList.filter(f => {
      if (!todaySearch.trim()) return true
      const q = todaySearch.toLowerCase()
      return (
        f.customer_name?.toLowerCase().includes(q) ||
        f.customer_mobile_number?.toLowerCase().includes(q) ||
        f.lead_uid?.toLowerCase().includes(q)
      )
    })
    const todayCount = todayBaseList.length
    
    // Pending leads: Use server-side classification + filters
    const basePendingList = followUps.filter(f => f.is_pending === true)
    const filteredPendingList = applyPendingFilter(applyPendingStatusFilter(applyDateFilter(basePendingList)))
    // Apply search for pending list
    const pendingList = filteredPendingList.filter(f => {
      if (!pendingSearch.trim()) return true
      const q = pendingSearch.toLowerCase()
      return (
        f.customer_name?.toLowerCase().includes(q) ||
        f.customer_mobile_number?.toLowerCase().includes(q) ||
        f.lead_uid?.toLowerCase().includes(q)
      )
    })
    // IMPORTANT: Count should show ALL pending leads regardless of filter
    const pendingCount = basePendingList.length

    // Walk-in leads: Filter by source (walk-in/digital leads)
    const baseWalkinList = followUps.filter(f =>
      ['Walk-in', 'Digital', 'Google', 'Meta', 'WhatsApp', 'Car Dekho', 'Car Wale', 'OEM', 'Tele Out', 'Referral', 'Other'].includes(f.source || '')
    )
    // Apply date filter for walk-in list display
    const filteredWalkinList = applyDateFilter(baseWalkinList)
    const walkinList = filteredWalkinList.filter(f => {
      if (!walkinSearch.trim()) return true
      const q = walkinSearch.toLowerCase()
      return (
        f.customer_name?.toLowerCase().includes(q) ||
        f.customer_mobile_number?.toLowerCase().includes(q) ||
        f.lead_uid?.toLowerCase().includes(q)
      )
    })
    // IMPORTANT: Count should show ALL walk-in leads regardless of filter
    const walkinCount = baseWalkinList.length

    return { freshCount, todayCount, pendingCount, walkinCount, freshList, todayList: todayListSearched, pendingList, walkinList }
  }, [followUps, freshSearch, todaySearch, pendingSearch, walkinSearch, dateFilter, startDate, pendingFilter, pendingStatusFilter, forceRender])
  
  // Check for new walk-in leads and show notifications
  useEffect(() => {
    if (followUps.length > 0) {
      const walkinLeads = followUps.filter(f =>
        ['Walk-in', 'Digital', 'Google', 'Meta', 'WhatsApp', 'Car Dekho', 'Car Wale', 'OEM', 'Tele Out', 'Referral', 'Other'].includes(f.source || '')
      )

      // Check for new walk-in leads (leads that weren't there in previous check)
      const newWalkinLeads = walkinLeads.filter(lead =>
        !localStorage.getItem(`walkin_lead_seen_${lead.lead_uid}`)
      )

      if (newWalkinLeads.length > 0) {
        // Show notifications for new walk-in leads
        newWalkinLeads.forEach(lead => {
          const notification = {
            id: `walkin_${lead.lead_uid}_${Date.now()}`,
            type: 'walkin' as const,
            leadUid: lead.lead_uid,
            timestamp: new Date(),
            message: `${lead.source} lead assigned: ${lead.customer_name}`
          }
          setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep only 5 recent notifications

          // Mark as seen
          localStorage.setItem(`walkin_lead_seen_${lead.lead_uid}`, 'true')

          // Auto-remove walk-in notification after 2 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id))
          }, 2000)
        })
      }
    }
  }, [followUps])

  // Track count changes and force UI updates
  useEffect(() => {
    // Counts updated - force update count displays immediately
    const freshButton = document.querySelector('[data-tab="fresh"] .count-display')
    const pendingButton = document.querySelector('[data-tab="pending"] .count-display')
    const todayButton = document.querySelector('[data-tab="today"] .count-display')
    const walkinButton = document.querySelector('[data-tab="walkin"] .count-display')

    if (freshButton) {
      freshButton.textContent = countsUpdating ? "..." : freshCount.toString()
    }
    if (pendingButton) {
      pendingButton.textContent = countsUpdating ? "..." : pendingCount.toString()
    }
    if (todayButton) {
      todayButton.textContent = countsUpdating ? "..." : todayCount.toString()
    }
    if (walkinButton) {
      walkinButton.textContent = countsUpdating ? "..." : walkinCount.toString()
    }
  }, [freshCount, pendingCount, todayCount, walkinCount, countsUpdating])
  
  // Get current PS user name for filtering
  const session = typeof window !== 'undefined' ? (localStorage.getItem('supabase_user') || localStorage.getItem('user')) : null
  const currentPSUser = session ? JSON.parse(session) : null
  const currentPSName = currentPSUser?.name || currentPSUser?.username || ''
  
  // Debug: Log current PS name
  // Debug logging removed

  // Booked leads: Separate by status
  const bookedRequestedList = qualifiedLeads.filter(lead => {
    // Check multiple possible PS name matches
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    const hasBookingId = !!lead.booking_id
    const isWaitingForApproval = lead.booking_status === 'Waiting for Approval'
    return psNameMatch && hasBookingId && isWaitingForApproval
  })
  const bookedApprovedList = qualifiedLeads.filter(lead => {
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    return psNameMatch && lead.booking_id && lead.booking_status === 'Approved'
  })
  const bookedRejectedList = qualifiedLeads.filter(lead => {
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    return psNameMatch && lead.booking_id && lead.booking_status === 'Rejected'
  })
  const bookedList = [...bookedRequestedList, ...bookedApprovedList, ...bookedRejectedList]
  const bookedCount = bookedList.length
  
  // Debug counts removed
  
  // Retailed leads: Separate by status
  const retailedRequestedList = qualifiedLeads.filter(lead => {
    // Check multiple possible PS name matches
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    const hasRetailedId = !!lead.retailed_id
    const isWaitingForApproval = lead.retailed_status === 'Waiting for Approval'
    
    // Debug logging removed
    
    return psNameMatch && hasRetailedId && isWaitingForApproval
  })
  const retailedApprovedList = qualifiedLeads.filter(lead => {
    // Check multiple possible PS name matches
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    const hasRetailedId = !!lead.retailed_id
    const isApproved = lead.retailed_status === 'Approved'
    return psNameMatch && hasRetailedId && isApproved
  })
  const retailedRejectedList = qualifiedLeads.filter(lead => {
    // Check multiple possible PS name matches
    const psNameMatch = lead.ps_name?.toLowerCase() === currentPSName.toLowerCase() ||
                       lead.ps_name?.toLowerCase() === 'sanjay' ||
                       currentPSName.toLowerCase() === 'sanjay'
    const hasRetailedId = !!lead.retailed_id
    const isRejected = lead.retailed_status === 'Rejected'
    return psNameMatch && hasRetailedId && isRejected
  })
  const retailedList = [...retailedRequestedList, ...retailedApprovedList, ...retailedRejectedList]
  const retailedCount = retailedList.length
  
  // Debug logging removed
  
  // Won/Lost leads: Leads with final_status = 'won', 'lost', or 'lost requested'
  const wonLostList = applyDateFilter(followUps.filter(f => {
    const status = (f.final_status || '').toLowerCase()
    return ['won','lost','lost requested'].includes(status)
  }))
  const wonLostCount = wonLostList.length

  // CRITICAL: Wrap in useMemo to ensure React sees reference changes
  const filteredFollowUps = useMemo(() => {
    let result
    switch(activeTab){
      case 'fresh':
        result = freshList
        break
      case 'walkin':
        result = walkinList
        break
      case 'today': 
        result = todayList
        break
      case 'pending': 
        result = pendingList
        break
      case 'booked': 
        switch(activeSubTab) {
          case 'requested': result = bookedRequestedList; break
          case 'approved': result = bookedApprovedList; break
          case 'rejected': result = bookedRejectedList; break
          default: result = bookedRequestedList; break
        }
        break
      case 'retailed': 
        switch(activeSubTab) {
          case 'requested': result = retailedRequestedList; break
          case 'approved': result = retailedApprovedList; break
          case 'rejected': result = retailedRejectedList; break
          default: result = retailedRequestedList; break
        }
        break
      case 'wonlost': 
        result = wonLostList
        break
      default: 
        result = freshList
        break
    }
    
    return result
  }, [activeTab, activeSubTab, freshList, todayList, pendingList, bookedRequestedList, bookedApprovedList, bookedRejectedList, retailedRequestedList, retailedApprovedList, retailedRejectedList, wonLostList])

  const StatCard = ({ title, value, description, icon: Icon, color, bgColor }: any) => (
    <Card className={`${bgColor} border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={`text-3xl font-bold ${color.replace('border-l-', 'text-')}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <div className={`w-12 h-12 bg-gradient-to-br ${color.replace('border-l-', 'from-').replace('-500', '-100')} ${color.replace('border-l-', 'to-').replace('-500', '-200')} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <Icon className={`w-6 h-6 ${color.replace('border-l-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Main component return statement
  return (
    <>
      <Toaster position="top-right" richColors duration={2000} closeButton />
      <DashboardLayout>
      {/* Modern Background */}
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100/20 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-orange-200/20 to-orange-300/20 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-to-br from-orange-100/30 to-orange-200/30 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-gradient-to-br from-orange-200/25 to-orange-300/25 rounded-full blur-lg"></div>
        </div>

        <div className="relative z-10 p-1 md:p-2">
          <div className="max-w-7xl mx-auto">
            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="fixed top-4 right-4 z-50 space-y-2">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-2xl shadow-xl border-l-4 backdrop-blur-sm ${
                      notification.type === 'approved'
                        ? 'bg-green-50/90 border-green-500 text-green-800'
                        : notification.type === 'walkin'
                        ? 'bg-blue-50/90 border-blue-500 text-blue-800'
                        : 'bg-red-50/90 border-red-500 text-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {notification.type === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : notification.type === 'walkin' ? (
                        <User className="w-5 h-5 text-blue-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    <div>
                        <div className="font-medium">
                          {notification.type === 'approved'
                            ? 'Request Approved!'
                            : notification.type === 'walkin'
                            ? notification.message?.includes('Meta') 
                              ? 'New Meta Lead!'
                              : notification.message?.includes('Digital')
                              ? 'New Digital Lead!'
                              : 'New Walk-in Lead!'
                            : 'Request Rejected'
                          }
                        </div>
                        <div className="text-sm">
                          {notification.type === 'walkin'
                            ? notification.message || `New walk-in lead assigned: ${notification.leadUid}`
                            : `${notification.requestType === 'booking' ? 'Booking' : 'Retail'} request for ${notification.leadUid}`
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Modern Header */}
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 border-0 shadow-xl rounded-2xl overflow-hidden mb-4 md:mb-6">
              <div className="px-3 md:px-6 py-3 md:py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-lg md:rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                      <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight">
                        GEM Dashboard
                      </h1>
                      <p className="text-orange-100 text-xs md:text-sm font-medium">
                        Manage your assigned leads and follow-ups
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                    {lastRefreshTime && (
                      <div className="text-xs text-orange-100 text-left md:text-right">
                        Last updated: {lastRefreshTime}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setAddLeadModalOpen(true)}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg font-medium px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all duration-300 text-xs md:text-sm"
                      >
                        <User className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        <span className="text-xs md:text-sm">Add Lead</span>
                      </Button>
                      <Button
                        onClick={() => {
                          loadFollowUps(true)
                        }}
                        disabled={isLoading || isRefreshing}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm font-medium px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all duration-300 text-xs md:text-sm"
                        title="Refresh Data"
                      >
                        {(isLoading || isRefreshing) ? (
                          <>
                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 animate-spin" />
                            <span className="text-xs md:text-sm">{isRefreshing ? 'Syncing...' : 'Loading...'}</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            <span className="text-xs md:text-sm">Refresh Data</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Modern Stats Grid */}
            <div className="stats-grid grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total Assigned"
                value={stats.totalAssigned}
                description="All leads assigned to you"
                icon={User}
                color="border-l-blue-500"
                bgColor="bg-blue-50/80"
              />
              <StatCard
                title="Pending"
                value={stats.pending}
                description="Awaiting follow-up"
                icon={Clock}
                color="border-l-amber-500"
                bgColor="bg-amber-50/80"
              />
              <StatCard
                title="Won"
                value={stats.won}
                description="Successful conversions"
                icon={Trophy}
                color="border-l-green-500"
                bgColor="bg-green-50/80"
              />
              <StatCard
                title="Lost"
                value={stats.lost}
                description="Unsuccessful leads"
                icon={AlertCircle}
                color="border-l-red-500"
                bgColor="bg-red-50/80"
              />
            </div>

            {/* Modern Tabs */}
            <div className="relative bg-gradient-to-r from-orange-50/80 via-orange-100/80 to-orange-200/80 backdrop-blur-sm p-2 md:p-2 rounded-2xl mb-6 border border-white/30 shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-100/20 via-orange-200/20 to-orange-300/20 backdrop-blur-lg"></div>
              <div className="relative grid grid-cols-3 md:grid-cols-6 gap-1 md:gap-2">
                <TabButton
                  key={`fresh-${freshCount}-${forceRender}`}
                  id="fresh"
                  label="Fresh Leads"
                  count={countsUpdating ? "..." : freshCount}
                  icon={Star}
                  isActive={activeTab === 'fresh'}
                  onClick={handleTabChange}
                />
                <TabButton
                  key={`today-${todayCount}-${forceRender}`}
                  id="today"
                  label="Today's Follow-ups"
                  count={countsUpdating ? "..." : todayCount}
                  icon={Calendar}
                  isActive={activeTab === 'today'}
                  onClick={handleTabChange}
                />
                <TabButton
                  key={`pending-${pendingCount}-${forceRender}`}
                  id="pending"
                  label="Pending Leads"
                  count={countsUpdating ? "..." : pendingCount}
                  icon={Clock}
                  isActive={activeTab === 'pending'}
                  onClick={handleTabChange}
                />

                <TabButton
                  key={`walkin-${walkinCount}-${forceRender}`}
                  id="walkin"
                  label="Walk-in Leads"
                  count={countsUpdating ? "..." : walkinCount}
                  icon={Users}
                  isActive={activeTab === 'walkin'}
                  onClick={handleTabChange}
                />
                <TabButton
                  key={`booked-${bookedCount}-${forceRender}`}
                  id="booked"
                  label="Booked Approval"
                  count={bookedCount}
                  icon={CheckCircle}
                  isActive={activeTab === 'booked'}
                  onClick={handleTabChange}
                />
                <TabButton
                  key={`retailed-${retailedCount}-${forceRender}`}
                  id="retailed"
                  label="Retailed Approval"
                  count={retailedCount}
                  icon={CheckCircle}
                  isActive={activeTab === 'retailed'}
                  onClick={handleTabChange}
                />
                <TabButton
                  key={`wonlost-${wonLostCount}-${forceRender}`}
                  id="wonlost"
                  label="Won/Lost Leads"
                  count={wonLostCount}
                  icon={Trophy}
                  isActive={activeTab === 'wonlost'}
                  onClick={handleTabChange}
                />
              </div>
            </div>

            {/* Modern Leads Table */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
              <div className="relative bg-gradient-to-r from-orange-500/90 via-orange-600/90 to-orange-700/90 backdrop-blur-md text-white p-3 md:p-4 border-b border-white/20" style={{
                background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.95) 0%, rgba(251, 146, 60, 0.95) 50%, rgba(254, 215, 170, 0.95) 100%)',
                boxShadow: '0 8px 32px rgba(234, 88, 12, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 backdrop-blur-lg"></div>
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Star className="w-4 h-4 text-white/90 flex-shrink-0" />
                    <div className="min-w-0">
                      <h2 className="text-base md:text-lg font-semibold text-white/95 flex items-center gap-2">
                        <span className="text-sm md:text-base text-white/95">
                          {activeTab === 'fresh' && 'Fresh Leads'}
                          {activeTab === 'today' && 'Today\'s Follow-ups'}
                          {activeTab === 'pending' && 'Pending Leads'}
                          {activeTab === 'booked' && 'Booking requests'}
                          {activeTab === 'retailed' && 'Retail requests'}
                          {activeTab === 'wonlost' && 'Won or lost'}
                        </span>
                      </h2>
                      <p className="text-white/80 text-xs md:text-sm mt-1 leading-relaxed">
                        {activeTab === 'fresh' && 'Leads newly assigned to you'}
                        {activeTab === 'today' && 'Leads with follow-up scheduled for today (including overdue)'}
                        {activeTab === 'pending' && 'Leads with final status Pending'}
                        {activeTab === 'booked' && 'Booked leads approval status'}
                        {activeTab === 'retailed' && 'Retailed leads approval status'}
                        {activeTab === 'wonlost' && 'Leads that are won or lost'}
                      </p>
                      
                      {/* Source + Subsource badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(() => {
                          const currentList = filteredFollowUps
                          // Create combined source+subsource badges
                          const sourceSubsourceCombos = [...new Set(
                            currentList
                              .filter(item => item.source || item.sub_source)
                              .map(item => {
                                const source = item.source || ''
                                const subsource = item.sub_source || ''
                                if (source && subsource) {
                                  return `${source} ${subsource}`
                                } else if (source) {
                                  return source
                                } else if (subsource) {
                                  return subsource
                                }
                                return null
                              })
                              .filter(Boolean)
                          )]
                          
                          return (
                            <>
                              {sourceSubsourceCombos.map(combo => (
                                <Badge key={combo} className="text-xs px-2 py-0.5 bg-white/20 text-white/90 border-white/30">
                                  {combo}
                                </Badge>
                              ))}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Subsection pill tabs for booked and retailed */}
                  {(activeTab === 'booked' || activeTab === 'retailed') && (
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      <button
                        onClick={() => setActiveSubTab('requested')}
                        className={`px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 backdrop-blur-sm border border-white/30 ${
                          activeSubTab === 'requested'
                            ? 'bg-white/25 text-white shadow-lg border-white/40'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        <span className="hidden md:inline">Requested</span>
                        <span className="md:hidden">Req</span>
                        <span className="ml-1">({activeTab === 'booked' ? bookedRequestedList.length : retailedRequestedList.length})</span>
                      </button>
                      <button
                        onClick={() => setActiveSubTab('approved')}
                        className={`px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 backdrop-blur-sm border border-white/30 ${
                          activeSubTab === 'approved'
                            ? 'bg-green-500/30 text-white shadow-lg border-green-400/40'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        <span className="hidden sm:inline">Approved</span>
                        <span className="sm:hidden">App</span>
                        <span className="ml-1">({activeTab === 'booked' ? bookedApprovedList.length : retailedApprovedList.length})</span>
                      </button>
                      <button
                        onClick={() => setActiveSubTab('rejected')}
                        className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                          activeSubTab === 'rejected'
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        <span className="hidden sm:inline">Rejected</span>
                        <span className="sm:hidden">Rej</span>
                        <span className="ml-1">({activeTab === 'booked' ? bookedRejectedList.length : retailedRejectedList.length})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

          {/* Filters Section */}
          <div className="bg-gray-50/80 backdrop-blur-sm p-3 md:p-4 border-b border-gray-200/50">
            <div className="flex flex-wrap gap-2 md:gap-4 items-center text-xs md:text-sm">
              {/* View Toggle */}
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0.5 bg-white">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-label="Table View"
                >
                  <TableIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden md:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all ${
                    viewMode === 'card'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-label="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden md:inline">Card</span>
                </button>
              </div>

              {/* Date Range Filters for Today, Won/Lost sections */}
              {(activeTab === 'wonlost') && (
                <>
                        <div className="flex items-center gap-1 md:gap-2">
                    <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Filter:</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as 'today'|'all'|'range')}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
                    >
                      <option value="today">Today</option>
                      <option value="all">All Time</option>
                      <option value="range">Date Range</option>
                    </select>
                        </div>

                  {dateFilter === 'range' && (
                        <div className="flex items-center gap-1 md:gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
                        placeholder="Select Date"
                      />
                      {startDate && (
                        <button
                          onClick={() => setStartDate('')}
                          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'fresh' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Search:</label>
                  <input
                    type="text"
                    value={freshSearch}
                    onChange={(e) => setFreshSearch(e.target.value)}
                    placeholder="Name, mobile or UID"
                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-[200px]"
                  />
                </div>
              )}

              {activeTab === 'today' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Search:</label>
                  <input
                    type="text"
                    value={todaySearch}
                    onChange={(e) => setTodaySearch(e.target.value)}
                    placeholder="Name, mobile or UID"
                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-[200px]"
                  />
                </div>
              )}

              {/* Filters for Walk-in Leads */}
              {activeTab === 'walkin' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Search:</label>
                  <input
                    type="text"
                    value={walkinSearch}
                    onChange={(e) => setWalkinSearch(e.target.value)}
                    placeholder="Name, mobile or UID"
                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-[200px]"
                  />
                </div>
              )}

              {/* Filters for Pending Leads */}
              {activeTab === 'pending' && (
                <>
                  {/* Search for Pending */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Search:</label>
                    <input
                      type="text"
                      value={pendingSearch}
                      onChange={(e) => setPendingSearch(e.target.value)}
                      placeholder="Name, mobile or UID"
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-[200px]"
                    />
                  </div>
                  {/* Lead Category Filter */}
                  <div className="flex items-center gap-1 md:gap-2">
                    <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Category:</label>
                    <select
                      value={pendingFilter}
                      onChange={(e) => setPendingFilter(e.target.value as 'all'|'hot'|'warm'|'cold')}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
                    >
                      <option value="all">All</option>
                      <option value="hot">🔥 Hot</option>
                      <option value="warm">🔥 Warm</option>
                      <option value="cold">❄️ Cold</option>
                    </select>
                  </div>

                  {/* Final Status Filter */}
                  <div className="flex items-center gap-1 md:gap-2">
                    <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Status:</label>
                    <select
                      value={pendingStatusFilter}
                      onChange={(e) => setPendingStatusFilter(e.target.value as 'all'|'pending'|'booked')}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="booked">Booked</option>
                    </select>
                  </div>

                  {/* Date Range Filter */}
                  <div className="flex items-center gap-1 md:gap-2">
                    <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Date:</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as 'today'|'all'|'range')}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
                    >
                      <option value="today">Today</option>
                      <option value="all">All Time</option>
                      <option value="range">Date Range</option>
                    </select>
                  </div>

                  {dateFilter === 'range' && (
                    <div className="flex items-center gap-1 md:gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
                        placeholder="Select Date"
                      />
                      {startDate && (
                        <button
                          onClick={() => setStartDate('')}
                          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Show current filter status */}
              <div className="ml-auto text-xs md:text-sm text-gray-600 hidden md:block">
                {activeTab === 'today' && dateFilter === 'range' && startDate && endDate && (
                  <span>Showing: {startDate} to {endDate}</span>
                )}
                {activeTab === 'pending' && (pendingFilter !== 'all' || pendingStatusFilter !== 'all' || dateFilter !== 'today') && (
                  <span>
                    Showing:
                    {pendingFilter !== 'all' && ` ${pendingFilter === 'hot' ? '🔥 Hot' : pendingFilter === 'warm' ? '🔥 Warm' : '❄️ Cold'} leads`}
                    {pendingStatusFilter !== 'all' && ` ${pendingStatusFilter} status`}
                    {dateFilter === 'range' && startDate && endDate && ` from ${startDate} to ${endDate}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600">
                    <th className="text-left p-2 md:p-4 font-semibold text-white text-xs md:text-sm">Lead Info</th>
                    <th className="text-left p-2 md:p-4 font-semibold text-white text-xs md:text-sm hidden md:table-cell">Vehicle Details</th>
                    <th className="text-left p-2 md:p-4 font-semibold text-white text-xs md:text-sm">Status</th>
                    <th className="text-left p-2 md:p-4 font-semibold text-white text-xs md:text-sm hidden md:table-cell">ICROP ID</th>
                    {activeTab !== 'fresh' && (
                      <th className="text-left p-2 md:p-4 font-semibold text-white text-xs md:text-sm">Next Call</th>
                    )}
                    <th className="text-left p-2 md:p-4 font-semibold text-white text-xs md:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFollowUps.map((item: any, index: number) => {
                      // Handle both qualified leads and follow-ups
                      const isQualifiedLead = item.booking_id || item.retailed_id
                      const customerName = isQualifiedLead ? item.customer_name : item.customer_name
                      const customerMobile = isQualifiedLead ? item.customer_mobile_number : item.customer_mobile_number
                      const leadUid = isQualifiedLead ? item.lead_uid : item.lead_uid
                      const assignedDate = isQualifiedLead ? item.created_at : item.ps_assigned_at
                      
                      return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-orange-50/30 transition-colors">
                        <td className="p-2 md:p-4">
                          <div className="space-y-0.5 md:space-y-1">
                            <div className="font-semibold text-gray-800 text-xs md:text-sm leading-tight">{customerName}</div>
                            <div className="text-xs md:text-sm text-gray-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{customerMobile}</span>
                            </div>
                            {/* Source badge for walk-in leads */}
                            {['Walk-in', 'Digital', 'Google', 'Meta', 'WhatsApp', 'Car Dekho', 'Car Wale', 'OEM', 'Tele Out', 'Referral', 'Other'].includes(item.source) && (
                              <div className="flex gap-1">
                                <Badge
                                  className={`text-xs px-2 py-0.5 ${
                                    item.source === 'Walk-in'
                                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                                  }`}
                                >
                                  {item.source === 'Walk-in' ? '🚶 Walk-in' : `💻 ${item.source}`}
                                </Badge>
                                {item.sub_source && item.sub_source !== '' && (
                                  <Badge className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 hover:bg-gray-200">
                                    {item.sub_source}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {activeTab !== 'fresh' && (
                              <>
                                <div className="text-xs text-gray-500 truncate">{leadUid}</div>
                                <div className="text-xs text-gray-500">{formatDate(assignedDate)}</div>
                              </>
                            )}
                            {isQualifiedLead && item.booking_id && (
                              <div className="text-xs text-blue-600 font-medium truncate">Booking ID: {item.booking_id}</div>
                            )}
                            {isQualifiedLead && item.retailed_id && (
                              <div className="text-xs text-green-600 font-medium truncate">Retail ID: {item.retailed_id}</div>
                            )}
                            {/* Show vehicle details on mobile */}
                            <div className="md:hidden mt-1 pt-1 border-t border-gray-100">
                              <div className="text-xs text-gray-600">{item.model_interested || '—'}</div>
                              <div className="text-xs text-gray-500">{item.variant || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 md:p-4 hidden md:table-cell">
                          <div className="space-y-0.5 md:space-y-1">
                            <div className="font-medium text-gray-800 text-xs md:text-sm">{item.model_interested || '—'}</div>
                            <div className="text-xs md:text-sm text-gray-600">{item.variant || '—'}</div>
                            <div className="text-xs text-gray-500">{item.buying_plan || '—'}</div>
                            <div className="text-xs text-gray-500">{item.finance_option || '—'}</div>
                          </div>
                        </td>
                        <td className="p-2 md:p-4">
                          <div className="space-y-1 md:space-y-2">
                            {isQualifiedLead ? (
                              <div className="space-y-0.5 md:space-y-1">
                                {item.booking_status && (
                                  <Badge className={`${item.booking_status === 'Approved' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' : item.booking_status === 'Rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700' : 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700'} border-0 font-medium px-3 py-1`}>
                                    Booking: {item.booking_status}
                        </Badge>
                                )}
                                {item.retailed_status && (
                                  <Badge className={`${item.retailed_status === 'Approved' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' : item.retailed_status === 'Rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700' : 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700'} border-0 font-medium px-3 py-1`}>
                                    Retail: {item.retailed_status}
                                  </Badge>
                                )}
                        </div>
                            ) : (
                              getStatusBadge(item.final_status, item)
                            )}
                        </div>
                        </td>
                        <td className="p-2 md:p-4 hidden md:table-cell">
                          {!isQualifiedLead && item.icrop_id && (
                            <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-0 font-medium px-3 py-1">
                              {item.icrop_id}
                            </Badge>
                          )}
                        </td>
                        {activeTab !== 'fresh' && (
                          <td className="p-4">
                            <div className="space-y-1">
                              {isQualifiedLead ? (
                              <div className="text-sm text-gray-500">
                                {item.booking_requested_at && (
                                  <div>Booking: {formatDate(item.booking_requested_at)}</div>
                                )}
                                {item.retailed_requested_at && (
                                  <div>Retail: {formatDate(item.retailed_requested_at)}</div>
                                )}
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-medium text-gray-700">Call #{getNextCallNumber(item)}</span>
                                <div className="text-xs text-gray-500">{formatDate(item.follow_up_date)}</div>
                                {activeTab === 'today' && (() => {
                                  const overdueDays = getOverdueDays(item.follow_up_date)
                                  return overdueDays > 0 && (
                                    <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 font-medium text-xs px-2 py-1">
                                      Overdue: {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
                                    </Badge>
                                  )
                                })()}
                              </>
                            )}
                            </div>
                          </td>
                        )}
                        <td className="p-2 md:p-4">
                          <div className="flex flex-col gap-2">
                            {/* Always show Update button */}
                            <button
                              onClick={() => openUpdateDialog(item)}
                              disabled={isUpdatingLead}
                              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-3 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                              {isUpdatingLead ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Edit3 className="w-3 h-3" />
                                  Update
                                </>
                              )}
                            </button>
                            
                            {/* Show approval status for qualified leads */}
                            {isQualifiedLead && (
                              <div className="text-xs text-gray-600 font-medium text-center">
                                {item.booking_status === 'Waiting for Approval' && '⏳ Waiting for SM approval'}
                                {item.retailed_status === 'Waiting for Approval' && '⏳ Waiting for SM approval'}
                                {item.booking_status === 'Approved' && '✅ Booking Approved'}
                                {item.retailed_status === 'Approved' && '✅ Retail Approved'}
                                {item.booking_status === 'Rejected' && '❌ Booking Rejected'}
                                {item.retailed_status === 'Rejected' && '❌ Retail Rejected'}
                              </div>
                            )}
                            
                            {/* Show Lost Requested status */}
                            {item.final_status === 'Lost Requested' && (
                              <div className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded-lg text-center">
                                Awaiting CRE Approval
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
              </table>
              {filteredFollowUps.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium">No leads found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or refresh the data</p>
                </div>
              )}
            </div>
          )}

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="transition-all duration-300 ease-in-out">
              {filteredFollowUps.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium">No leads found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or refresh the data</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {filteredFollowUps.map((item: any) => {
                    const isQualifiedLead = item.booking_id || item.retailed_id
                    const customerName = item.customer_name
                    const customerMobile = item.customer_mobile_number
                    const leadUid = item.lead_uid
                    const assignedDate = isQualifiedLead ? item.created_at : item.ps_assigned_at

                    return (
                      <div
                        key={item.id}
                        onClick={() => !isQualifiedLead && openUpdateDialog(item)}
                        role={!isQualifiedLead ? "button" : undefined}
                        tabIndex={!isQualifiedLead ? 0 : undefined}
                        aria-label={!isQualifiedLead ? `Update lead for ${customerName}` : undefined}
                        onKeyDown={(e) => {
                          if (!isQualifiedLead && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            openUpdateDialog(item)
                          }
                        }}
                        className={`relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 ${
                          !isQualifiedLead ? 'cursor-pointer hover:scale-[1.02] focus:ring-2 focus:ring-orange-500 focus:outline-none' : ''
                        }`}
                      >
                        {/* Status Badge - Top Right */}
                        <div className="absolute top-3 right-3 z-10">
                          {isQualifiedLead ? (
                            <div className="space-y-1">
                              {item.booking_status && (
                                <Badge className={`${item.booking_status === 'Approved' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' : item.booking_status === 'Rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700' : 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700'} border-0 font-medium px-2 py-1 text-xs`}>
                                  {item.booking_status === 'Approved' ? '✓ Booked' : item.booking_status === 'Rejected' ? '✗ Rejected' : '⏳ Pending'}
                                </Badge>
                              )}
                              {item.retailed_status && (
                                <Badge className={`${item.retailed_status === 'Approved' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' : item.retailed_status === 'Rejected' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700' : 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700'} border-0 font-medium px-2 py-1 text-xs`}>
                                  {item.retailed_status === 'Approved' ? '✓ Retailed' : item.retailed_status === 'Rejected' ? '✗ Rejected' : '⏳ Pending'}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            getStatusBadge(item.final_status, item)
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="p-4 space-y-4">
                          {/* Customer Info */}
                          <div className="space-y-2 pr-24">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{customerName}</h3>
                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                              <Phone className="w-4 h-4 flex-shrink-0" />
                              <span>{customerMobile}</span>
                            </div>
                            {activeTab !== 'fresh' && leadUid && (
                              <div className="text-xs text-gray-500 font-mono">{leadUid}</div>
                            )}
                            {isQualifiedLead && item.booking_id && (
                              <div className="text-xs text-blue-600 font-medium">Booking ID: {item.booking_id}</div>
                            )}
                            {isQualifiedLead && item.retailed_id && (
                              <div className="text-xs text-green-600 font-medium">Retail ID: {item.retailed_id}</div>
                            )}
                          </div>

                          {/* Vehicle Details Block */}
                          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 border border-gray-100">
                            <div className="flex items-start gap-2">
                              <Car className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm truncate">
                                  {item.model_interested || 'Model not specified'}
                                </div>
                                <div className="text-xs text-gray-600 truncate">{item.variant || 'Variant not specified'}</div>
                              </div>
                            </div>
                            {(item.buying_plan || item.finance_option) && (
                              <div className="text-xs text-gray-500 space-y-0.5 pt-1 border-t border-gray-200">
                                {item.buying_plan && <div>Plan: {item.buying_plan}</div>}
                                {item.finance_option && <div>Finance: {item.finance_option}</div>}
                              </div>
                            )}
                          </div>

                          {/* Next Call Row */}
                          {activeTab !== 'fresh' && !isQualifiedLead && (
                            <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <div>
                                  <div className="text-xs font-semibold text-blue-900">Call #{getNextCallNumber(item)}</div>
                                  <div className="text-xs text-blue-700">{formatDate(item.follow_up_date)}</div>
                                </div>
                              </div>
                              {activeTab === 'today' && (() => {
                                const overdueDays = getOverdueDays(item.follow_up_date)
                                return overdueDays > 0 && (
                                  <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 font-medium text-xs px-2 py-1">
                                    {overdueDays}d overdue
                                  </Badge>
                                )
                              })()}
                            </div>
                          )}

                          {/* ICROP ID Badge - if present */}
                          {!isQualifiedLead && item.icrop_id && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium">ICROP:</span>
                              <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-0 font-medium px-3 py-1 text-xs">
                                {item.icrop_id}
                              </Badge>
                            </div>
                          )}

                          {/* Lost Requested Status */}
                          {!isQualifiedLead && item.final_status === 'Lost Requested' && (
                            <div className="text-xs text-orange-600 font-medium bg-orange-50 px-3 py-2 rounded-lg text-center border border-orange-200">
                              Awaiting CRE Approval
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          </Card>

          {/* Update Modal */}
          <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
              <DialogContent className="max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0">
                <DialogHeader className="pb-4 pt-6 px-6">
                  <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
                    <Edit3 className="w-6 h-6 mr-3 text-orange-500" />
                    Update Follow-up
                  </DialogTitle>
                  <DialogDescription>
                    Update the follow-up status and details for this lead
                  </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                  {/* Lead Information Grid */}
                  {selectedFollowUp && (
                    <div className="px-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl md:max-w-2xl">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Customer Name
                          </label>
                          <div className="text-sm font-medium text-gray-900">{selectedFollowUp.customer_name}</div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Mobile
                          </label>
                          <div className="text-sm font-medium text-gray-900">{selectedFollowUp.customer_mobile_number}</div>
                        </div>

                        {selectedFollowUp.model_interested && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              Model
                            </label>
                            <div className="text-sm font-medium text-gray-900">{selectedFollowUp.model_interested}</div>
                          </div>
                        )}

                        {selectedFollowUp.variant && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                              <Settings className="w-3 h-3" />
                              Variant
                            </label>
                            <div className="text-sm font-medium text-gray-900">{selectedFollowUp.variant}</div>
                          </div>
                        )}

                        {selectedFollowUp.buying_plan && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Buying Plan
                            </label>
                            <div className="text-sm font-medium text-gray-900">{selectedFollowUp.buying_plan}</div>
                          </div>
                        )}

                        {selectedFollowUp.finance_option && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              Finance
                            </label>
                            <div className="text-sm font-medium text-gray-900">{selectedFollowUp.finance_option}</div>
                          </div>
                        )}

                        {extraLeadInfo?.profession && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              Profession
                            </label>
                            <div className="text-sm font-medium text-gray-900">{extraLeadInfo.profession}</div>
                          </div>
                        )}

                        {extraLeadInfo?.test_drive_type && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Test Drive
                            </label>
                            <div className="text-sm font-medium text-gray-900">{extraLeadInfo.test_drive_type}</div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Trade-in
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-sm font-medium text-gray-900 underline decoration-dotted underline-offset-4 hover:text-orange-600"
                              onClick={() => {
                                if ((extraLeadInfo?.trade_in || selectedFollowUp.trade_in) === 'Yes') {
                                  openTradeInModal(selectedFollowUp.lead_uid)
                                }
                              }}
                            >
                              {(extraLeadInfo?.trade_in || selectedFollowUp.trade_in) as string || 'No'}
                            </button>
                            {(extraLeadInfo?.trade_in || selectedFollowUp.trade_in) === 'Yes' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTradeInModal(selectedFollowUp.lead_uid)}
                                className="text-xs px-2 py-1 rounded-lg border-orange-200 text-orange-600 hover:bg-orange-50"
                              >
                                <Car className="w-3 h-3 mr-1" />
                                View Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Call History Section */}
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2 text-orange-500" />
                          Call History
                        </h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto bg-gray-50/50 rounded-xl p-3">
                          {/* CRE Call History */}
                          {[
                            { remark: selectedFollowUp.cre_first_remark, date: selectedFollowUp.cre_first_call_date, status: selectedFollowUp.cre_first_call_lead_status, type: 'CRE', creName: selectedFollowUp.cre_name },
                            { remark: selectedFollowUp.cre_second_remark, date: selectedFollowUp.cre_second_call_date, status: selectedFollowUp.cre_second_call_lead_status, type: 'CRE', creName: selectedFollowUp.cre_name },
                            { remark: selectedFollowUp.cre_third_remark, date: selectedFollowUp.cre_third_call_date, status: selectedFollowUp.cre_third_call_lead_status, type: 'CRE', creName: selectedFollowUp.cre_name },
                            { remark: selectedFollowUp.cre_fourth_remark, date: selectedFollowUp.cre_fourth_call_date, status: selectedFollowUp.cre_fourth_call_lead_status, type: 'CRE', creName: selectedFollowUp.cre_name },
                            { remark: selectedFollowUp.cre_fifth_remark, date: selectedFollowUp.cre_fifth_call_date, status: selectedFollowUp.cre_fifth_call_lead_status, type: 'CRE', creName: selectedFollowUp.cre_name },
                            { remark: selectedFollowUp.cre_sixth_remark, date: selectedFollowUp.cre_sixth_call_date, status: selectedFollowUp.cre_sixth_call_lead_status, type: 'CRE', creName: selectedFollowUp.cre_name }
                          ]
                            .filter(call => call.remark)
                            .map((call, index) => (
                              <div key={`cre-${index}`} className="text-xs bg-blue-50 rounded-lg p-2 border border-blue-200">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex items-center">
                                    <span className="font-semibold text-blue-800">CRE Call #{index + 1}</span>
                                    <Badge className="ml-2 bg-blue-100 text-blue-700 border-0 font-medium text-xs px-2 py-0.5">
                                      {call.creName || 'CRE'}
                                    </Badge>
                                  </div>
                                  <span className="text-blue-600">{call.date ? formatDate(call.date) : ''}</span>
                                </div>
                                <div className="text-blue-700 mb-1">{call.remark}</div>
                                {call.status && (
                                  <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-0 font-medium text-xs px-2 py-0.5">
                                    {call.status}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          
                          {/* PS Call History */}
                          {[
                            { remark: selectedFollowUp.first_call_remark, date: selectedFollowUp.first_call_date, status: selectedFollowUp.first_call_lead_status, type: 'PS' },
                            { remark: selectedFollowUp.second_call_remark, date: selectedFollowUp.second_call_date, status: selectedFollowUp.second_call_lead_status, type: 'PS' },
                            { remark: selectedFollowUp.third_call_remark, date: selectedFollowUp.third_call_date, status: selectedFollowUp.third_call_lead_status, type: 'PS' },
                            { remark: selectedFollowUp.fourth_call_remark, date: selectedFollowUp.fourth_call_date, status: selectedFollowUp.fourth_call_lead_status, type: 'PS' },
                            { remark: selectedFollowUp.fifth_call_remark, date: selectedFollowUp.fifth_call_date, status: selectedFollowUp.fifth_call_lead_status, type: 'PS' },
                            { remark: selectedFollowUp.sixth_call_remark, date: selectedFollowUp.sixth_call_date, status: selectedFollowUp.sixth_call_lead_status, type: 'PS' },
                            { remark: selectedFollowUp.seventh_call_remark, date: selectedFollowUp.seventh_call_date, status: selectedFollowUp.seventh_call_lead_status, type: 'PS' },
                            { remark: selectedFollowUp.eighth_call_remark, date: selectedFollowUp.eighth_call_date, status: selectedFollowUp.eighth_call_lead_status, type: 'PS' },
                            { remark: selectedFollowUp.ninth_call_remark, date: selectedFollowUp.ninth_call_date, status: selectedFollowUp.ninth_call_lead_status, type: 'PS' },
                            { remark: selectedFollowUp.tenth_call_remark, date: selectedFollowUp.tenth_call_date, status: selectedFollowUp.tenth_call_lead_status, type: 'PS' }
                          ]
                            .filter(call => call.remark)
                            .map((call, index) => (
                              <div key={`ps-${index}`} className="text-xs bg-orange-50 rounded-lg p-2 border border-orange-200">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex items-center">
                                    <span className="font-semibold text-orange-800">PS Call #{index + 1}</span>
                                    <Badge className="ml-2 bg-orange-100 text-orange-700 border-0 font-medium text-xs px-2 py-0.5">
                                      PS
                                    </Badge>
                                  </div>
                                  <span className="text-orange-600">{call.date ? formatDate(call.date) : ''}</span>
                                </div>
                                <div className="text-orange-700 mb-1">{call.remark}</div>
                                {call.status && (
                                  <Badge className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-0 font-medium text-xs px-2 py-0.5">
                                    {call.status}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          
                          {/* No call history message */}
                          {![
                            // CRE calls
                            selectedFollowUp.cre_first_remark,
                            selectedFollowUp.cre_second_remark,
                            selectedFollowUp.cre_third_remark,
                            selectedFollowUp.cre_fourth_remark,
                            selectedFollowUp.cre_fifth_remark,
                            selectedFollowUp.cre_sixth_remark,
                            // PS calls
                            selectedFollowUp.first_call_remark,
                            selectedFollowUp.second_call_remark,
                            selectedFollowUp.third_call_remark,
                            selectedFollowUp.fourth_call_remark,
                            selectedFollowUp.fifth_call_remark,
                            selectedFollowUp.sixth_call_remark,
                            selectedFollowUp.seventh_call_remark,
                            selectedFollowUp.eighth_call_remark,
                            selectedFollowUp.ninth_call_remark,
                            selectedFollowUp.tenth_call_remark
                          ].some(remark => remark) && (
                            <div className="text-center text-xs text-gray-500 py-4">
                              No call history available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Update Form */}
                  <div className="px-6 space-y-6">
                    <div>
                      <Label htmlFor="callRemark" className="text-sm font-semibold text-gray-700 mb-2 block flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Call Remark (Call #{getNextCallNumber(selectedFollowUp)})
                      </Label>
                      <Textarea
                        id="callRemark"
                        value={callRemark}
                        onChange={(e) => setCallRemark(e.target.value)}
                        placeholder="Enter your call remarks..."
                        className="min-h-[80px] rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 resize-none"
                      />
                    </div>

                    <div>
                      <Label htmlFor="callOutcome" className="text-sm font-semibold text-gray-700 mb-2 block">
                        Call Outcome
                      </Label>
                      <Select value={callOutcome} onValueChange={setCallOutcome}>
                        <SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                          <SelectValue placeholder="Select call outcome" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-0 shadow-lg">
                          <SelectItem value="Call not Connected">📞 Call not Connected</SelectItem>
                          <SelectItem value="Retailed">🛍️ Retailed</SelectItem>
                          <SelectItem value="Discount Issue">💰 Discount Issue</SelectItem>
                          <SelectItem value="Delayed">⏰ Delayed</SelectItem>
                          <SelectItem value="Booked">✅ Booked</SelectItem>
                          <SelectItem value="Booked with another number">📱 Booked with another number</SelectItem>
                          <SelectItem value="Test Drive">🚗 Test Drive</SelectItem>
                          <SelectItem value="Planning in Next Month">📅 Planning in Next Month</SelectItem>
                          <SelectItem value="Interested">😊 Interested</SelectItem>
                          <SelectItem value="Lost to Competition">❌ Lost to Competition</SelectItem>
                          <SelectItem value="Finance Rejected">💳 Finance Rejected</SelectItem>
                          <SelectItem value="Dropped">❌ Dropped</SelectItem>
                          <SelectItem value="Lost to codealer">❌ Lost to codealer</SelectItem>
                          <SelectItem value="Busy on another call">📞 Busy on another call</SelectItem>
                          <SelectItem value="RNR">📞 RNR</SelectItem>
                          <SelectItem value="Call me Back">📞 Call me Back</SelectItem>
                          <SelectItem value="Not Interested">😞 Not Interested</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Booking/Retailed ID Input */}
                    {isLeadWon(callOutcome) && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                        {(callOutcome === 'Booked' || callOutcome === 'Booked with another number') && (
                          <div>
                            <Label htmlFor="bookingId" className="text-sm font-semibold text-green-700 mb-2 block flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Order Number (ORD + 9 digits)
                            </Label>
                            <Input
                              id="bookingId"
                              value={bookingId}
                              onChange={(e) => setBookingId(e.target.value.toUpperCase())}
                              placeholder="e.g., ORD123456789"
                              className="rounded-xl border-green-200 focus:border-green-500 focus:ring-green-500/20"
                              maxLength={12}
                            />
                            <p className="text-xs text-green-600 mt-1">
                              Format: ORD followed by exactly 9 digits
                            </p>
                          </div>
                        )}

                        {callOutcome === 'Retailed' && (
                          <div>
                            <Label htmlFor="retailedId" className="text-sm font-semibold text-green-700 mb-2 block flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              DN Number (DNN + 9 digits)
                            </Label>
                            <Input
                              id="retailedId"
                              value={retailedId}
                              onChange={(e) => setRetailedId(e.target.value.toUpperCase())}
                              placeholder="e.g., DNN123456789"
                              className="rounded-xl border-green-200 focus:border-green-500 focus:ring-green-500/20"
                              maxLength={12}
                            />
                            <p className="text-xs text-green-600 mt-1">
                              Format: DNN followed by exactly 9 digits
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Follow-up Date */}
                    {!isFollowUpDateLocked(callOutcome) && (
                      <div>
                        <Label htmlFor="followUpDate" className="text-sm font-semibold text-gray-700 mb-2 block flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Next Follow-up Date *
                        </Label>
                        <Input
                          id="followUpDate"
                          type="datetime-local"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                        />
                      </div>
                    )}

                    {/* Status warnings */}
                    {isLeadWon(callOutcome) && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center text-blue-700">
                          <Info className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">
                            This lead will be sent to Sales Manager for approval
                          </span>
                        </div>
                      </div>
                    )}

                    {isLeadLost(callOutcome) && (
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center text-orange-700">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">
                            Lost status request will be sent to CRE for approval
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/30">
                    <Button
                      variant="outline"
                      onClick={() => setUpdateDialog(false)}
                      className="px-6 py-2 rounded-xl border-gray-200 hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateFollowUp}
                      disabled={isUpdatingLead}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingLead ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Update Follow-up
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Trade-in Details Modal */}
            <Dialog open={tradeInOpen} onOpenChange={setTradeInOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-t-2xl -mt-[1px]"></div>
                
                <DialogHeader className="pb-4 pt-6 px-6">
                  <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
                    <Car className="w-6 h-6 mr-3 text-orange-500" />
                    Trade-in Vehicle Details
                  </DialogTitle>
                  <DialogDescription>
                    View and manage trade-in vehicle information for this lead
                  </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6">
                  {tradeInLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                      <span className="ml-3 text-gray-600">Loading trade-in details...</span>
                    </div>
                  ) : tradeInData ? (
                    <div className="space-y-6">
                      {/* Customer Information */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Customer Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoLine label="Customer Name" value={tradeInData.customer_name || selectedFollowUp?.customer_name} />
                          <InfoLine label="Mobile Number" value={tradeInData.customer_mobile_number || selectedFollowUp?.customer_mobile_number} />
                          <InfoLine label="Profession" value={tradeInData.profession} />
                          <InfoLine label="Test Drive Type" value={tradeInData.test_drive_type} />
                        </div>
                      </div>

                      {/* Vehicle Details */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Trade-in Vehicle</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoLine label="Make" value={tradeInData.make} />
                          <InfoLine label="Model" value={tradeInData.model} />
                          <InfoLine label="Year" value={tradeInData.year} />
                          <InfoLine label="KMs Driven" value={tradeInData.kms_driven} />
                          <InfoLine label="Ownership" value={tradeInData.ownership} />
                        </div>
                      </div>

                      {/* Additional Information */}
                      {(tradeInData.additional_info || tradeInData.condition_notes) && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Information</h3>
                          <div className="space-y-2">
                            {tradeInData.additional_info && (
                              <InfoLine label="Additional Info" value={tradeInData.additional_info} />
                            )}
                            {tradeInData.condition_notes && (
                              <InfoLine label="Condition Notes" value={tradeInData.condition_notes} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Car className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No trade-in details found</p>
                    </div>
                  )}

                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={() => setTradeInOpen(false)}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Lead Modal */}
            <Dialog open={addLeadModalOpen} onOpenChange={setAddLeadModalOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0">
                <DialogHeader className="pb-4 pt-6 px-6">
                  <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
                    <User className="w-6 h-6 mr-3 text-orange-500" />
                    Add New Lead
                  </DialogTitle>
                  <DialogDescription>
                    Add a walkin or referral lead to your follow-up list
                  </DialogDescription>
                </DialogHeader>

                <AddLeadForm 
                  onClose={() => setAddLeadModalOpen(false)}
                  onAdd={async (leadData) => {
                    // Lead added callback triggered
                    
                    // Force refresh the follow-ups list
                    setIsRefreshing(true)
                    setCountsUpdating(true)
                    
                    // Multiple rapid refreshes to ensure data syncs
                    await loadFollowUps(true)
                    setTimeout(() => loadFollowUps(true), 500)
                    setTimeout(() => loadFollowUps(true), 1000)
                    
                    // Dispatch custom event for immediate refresh across components
                    window.dispatchEvent(new CustomEvent('lead-added'))
                    
                    // Show success message
                    toast.success(`Lead "${leadData.customer_name}" added successfully!`)
                    
                    // UI refresh completed
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </DashboardLayout>
    </>
  )
}
