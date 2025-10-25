"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Phone, Mail, MapPin, Building, User, Car, Clock, DollarSign, Home, Users, CheckCircle2, Lock, Circle, X, AlertTriangle, CheckCircle, Star, Thermometer, Snowflake, Flame, Search, ChevronDown, FileText } from "lucide-react"
import { toast } from "sonner"

// Car make and model data
const CAR_DATA = {
  "Maruti": [
    "Wagon R", "Baleno", "Swift", "Swift Dzire", "Ciaz", "Vitara Brezza",
    "Alto 800", "Alto K10", "Ertiga", "Celerio", "Ritz", "SX4", "Alto",
    "Eeco", "Ignis", "S-Presso", "Zen Estilo", "XL6", "800", "Gypsy",
    "Wagon R Stingray", "Zen", "Esteem", "Kizashi", "Omni", "Celerio X",
    "A-Star", "S-Cross", "Grand Vitara", "Jimny"
  ],
  "Hyundai": [
    "Creta", "i20", "i10", "Grand i10", "Verna", "Santro Xing", "Venue",
    "Xcent", "Eon", "Elantra", "Tucson", "Santa Fe", "Alcazar", "i20 Active",
    "Accent", "Santro", "Grand i10 Nios", "Aura", "IONIQ", "Kona"
  ],
  "Honda": [
    "City", "Amaze", "Jazz", "Brio", "Civic", "WR-V", "Mobilio", "Accord",
    "BR-V", "CR-V"
  ],
  "Toyota": [
    "Fortuner", "Innova Crysta", "Corolla Altis", "Innova", "Etios Liva",
    "Etios", "Camry", "Glanza", "Yaris", "Etios Cross", "Land Cruiser",
    "Corolla", "Land Cruiser Prado", "Urban Cruiser", "Platinum Etios",
    "Hyryder"
  ],
  "Mahindra": [
    "Scorpio", "XUV500", "Thar", "TUV300", "KUV100", "Quanto", "Bolero",
    "XUV300", "KUV100 Nxt", "XUV700", "Xylo", "Alturas G4", "Marazzo",
    "Bolero Power Plus", "Nuvo Sport", "XUV400"
  ],
  "Mercedes-Benz": [
    "E-Class", "C-Class", "GLC", "CLA", "GLS", "S-Class", "GLA Class", "GLE",
    "M-Class", "GL-Class", "A-Class", "SLK-Class", "A-Class Limousine",
    "B-Class", "V-Class", "A 35", "GLA", "SLC", "E-Class All-Terrain", "EQC",
    "C-Class 2021", "AMG GLC", "AMG GLE", "EQA", "EQB", "C 63 AMG",
    "ML 250 CDI", "R 350", "CLS 250 CDI", "AMG A35", "MAYBACH GLS 400 4M",
    "GLB", "AMG GLA 35 4MATIC", "AMG C43", "ML 350 CDI", "GL 350 CDI"
  ],
  "Audi": [
    "A6", "A4", "Q3", "Q7", "Q5", "A3", "Q2", "A8", "A3 Cabriolet", "S5", "Q8"
  ],
  "BMW": [
    "3 Series", "5 Series", "X1", "X5", "7 Series", "X3", "3 Series GT",
    "6 Series", "X7", "1 Series", "2 Series", "M Series", "X6", "X4",
    "220 I", "745 LE X DRIVE"
  ],
  "Ford": [
    "Ecosport", "Endeavour", "Figo", "Fiesta", "Mustang", "Figo Aspire",
    "Ikon", "Freestyle"
  ],
  "Renault": [
    "Kwid", "Duster", "Triber", "Captur", "Kiger", "Fluence", "Koleos",
    "Scala", "Lodgy", "Pulse"
  ],
  "Tata": [
    "Harrier", "Nexon", "Tiago", "Safari Storme", "Hexa", "Altroz", "Safari",
    "Zest", "Tigor", "Indica", "Indigo", "Nexon EV", "Bolt", "Manza",
    "Nano", "Sumo", "Indica Vista"
  ],
  "Volkswagen": [
    "Polo", "Vento", "Beetle", "Ameo", "Jetta", "Tiguan", "Passat", "T-Roc",
    "Virtus", "Taigun"
  ],
  "Land Rover": [
    "Range Rover Evoque", "Discovery Sport", "Freelander 2", "Range Rover",
    "Range Rover Sport", "Range Rover Velar", "Discovery"
  ],
  "MG": [
    "Hector", "Hector Plus", "ZS EV", "Astor", "Gloster", "Comet EV", "Windsor"
  ],
  "Kia": ["Seltos", "Sonet", "Carnival", "Carens", "EV6"],
  "Skoda": [
    "Rapid", "Superb", "Kushaq", "Fabia", "Laura", "Octavia", "Kodiaq",
    "KAROQ BSIV", "Slavia"
  ],
  "Nissan": ["Terrano", "Sunny", "Micra", "Kicks", "Magnite", "X-Trail"],
  "Jaguar": ["XF", "XE", "F-Pace", "XJ"],
  "Jeep": ["Compass"],
  "Porsche": ["Porsche"],
  "Volvo": [
    "S60", "S90", "XC40", "XC90", "XC60", "V40", "V40 Cross Country"
  ],
  "Chevrolet": [
    "Beat", "Cruze", "Aveo U-VA", "Spark", "Captiva", "Enjoy", "Sail",
    "Optra", "Tavera", "Trailblazer"
  ],
  "Mini": [
    "Cooper", "3 Door", "5 Door", "Cooper Countryman", "Cooper Convertible",
    "Cooper SE", "Mini Cooper Convertible"
  ],
  "Datsun": ["Redi Go", "Go", "Go+"],
  "Mitsubishi": ["Pajero", "Outlander", "Lancer"],
  "Isuzu": ["D-Max", "MU-X", "MU-7"],
  "Fiat": ["Grande Punto", "Linea", "Linea Classic", "Palio", "Punto Evo"],
  "Mahindra Ssangyong": ["Rexton"],
  "Bentley": ["Continental"],
  "Hindustan Motors": ["Ambassador"],
  "Lamborghini": ["Huracan EVO"],
  "Maserati": ["Maserati"],
  "Lexus": ["Lexus"],
  "Citroen": ["C3", "eC3", "C5 Aircross"]
}

// SearchableSelect Component
interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: string[]
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
}

const SearchableSelect = ({ 
  value, 
  onValueChange, 
  placeholder, 
  options, 
  searchPlaceholder = "Search...",
  disabled = false,
  className = ""
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isMobile, setIsMobile] = useState(false)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Filter options based on debounced search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  )

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          onValueChange(filteredOptions[selectedIndex])
          setIsOpen(false)
          setSearchTerm("")
          setSelectedIndex(-1)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSearchTerm("")
        setSelectedIndex(-1)
        triggerRef.current?.focus()
        break
      case 'Home':
        e.preventDefault()
        setSelectedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setSelectedIndex(filteredOptions.length - 1)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm("")
        setSelectedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Reset selected index when search term changes
  useEffect(() => {
    setSelectedIndex(-1)
  }, [debouncedSearchTerm])

  const handleOptionClick = (option: string) => {
    onValueChange(option)
    setIsOpen(false)
    setSearchTerm("")
    setSelectedIndex(-1)
  }

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
    }
  }

  // Highlight matched text
  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="font-semibold text-blue-600">{part}</span>
      ) : part
    )
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full min-h-[44px] px-3 py-2 text-left text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={placeholder}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 ${
          isMobile ? 'fixed inset-x-4 bottom-4 top-auto max-h-96' : 'relative'
        }`}>
          <div className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200 rounded-lg transition-all duration-200">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-3 py-2 text-sm border-b border-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  role="searchbox"
                  aria-label="Search vehicle makes"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                <>
                  {filteredOptions.map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleOptionClick(option)}
                      onKeyDown={handleKeyDown}
                      className={`w-full min-h-[44px] px-3 py-2 text-left text-sm cursor-pointer transition-colors duration-150 flex items-center ${
                        index === selectedIndex
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      role="option"
                      aria-selected={value === option}
                    >
                      {highlightText(option, debouncedSearchTerm)}
                    </button>
                  ))}
                  {/* Results count */}
                  <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">
                    Showing {filteredOptions.length} of {options.length} makes
                  </div>
                </>
              ) : (
                <div className="px-3 py-4 text-sm text-gray-500 text-center" aria-live="polite">
                  No options found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
  final_status?: string
  branch?: string
  ps_assigned?: string
  profession?: string
  buying_plan?: string
  finance_option?: string
  test_drive?: boolean
  test_drive_type?: string
  trade_in?: string
  trade_in_make?: string
  trade_in_model?: string
  trade_in_year?: string
  trade_in_km?: string
  trade_in_ownership?: string
  // removed duplicate lead_category type
  customer_email?: string
  customer_location?: string
  remarks?: string
  lead_remark?: string
  first_call_remark?: string
  first_call_date?: string
  // Prior follow-up fields for display
  second_call_date?: string
  second_remark?: string
  second_call_lead_status?: string
  third_call_date?: string
  third_remark?: string
  third_call_lead_status?: string
  fourth_call_date?: string
  fourth_remark?: string
  fourth_call_lead_status?: string
  fifth_call_date?: string
  fifth_remark?: string
  fifth_call_lead_status?: string
  sixth_call_date?: string
  sixth_remark?: string
  sixth_call_lead_status?: string
  // Pending reasons for pending leads (JSONB array) - multiple attempts
  pending_reasons?: Array<{
    attempt: number
    reason: string
    status: string
    date: string
    user?: string
  }>
  // Existing remarks for unqualified/lost leads
  existing_remarks?: string
}

interface LeadUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onUpdate: (leadData: any) => void
}

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

const branches = ["Mount Road", "Vyasarpadi", "Cuddalore"]

const professions = [
  "Salaried", "Business", "Self Employed", "Doctor", "Govt Employee"
]

const buyingPlan = [
  "Immediate", "1-2 Months", "2-3 Months", "Greater than 3 months"
]

const financeOptions = ["Inhouse", "Outright"]

const testDriveOptions = ["Home Test Drive", "Showroom visit"]

const tradeInOptions = ["Yes", "Additional", "Buying for first time"]

const leadCategories = ["Hot", "Warm", "Cold"]

const chennaiLocations = [
  "MOUNT ROAD", "CHINTHADRIPET", "EGMORE", "PUDHUPET", "CHETPET", "CHOOLAIMEDU", "NUNGAMBAKKAM", "KODAMBAKKAM", "VADAPALANI", "ANNASALAI", "ARUMBAKKAM", "ADYAR", "THIRUVANMIYUR", "VELACHERRY", "MEDAVAKKAM", "KILKATTALAI", "PERAMBAKKAM", "SHOLINGANALLUR", "PERUNGUDI", "NEELANGARAI", "SAIDAPET", "ST THOMAS MOUNT", "PAZHAVANTHANGAL", "PALLAVARAM", "MMDA COLONY", "MYLAPORE", "TRIPLICANE", "THOUSAND LIGHTS", "GREAMS ROAD", "ORMES ROAD", "ROYAPETTAH", "T NAGAR", "TEYNAMPET", "GUINDY", "MENAMBAKKAM", "TIRUSULAM", "ALWARPET", "R A PURAM", "AMINJIKARAI", "WEST MAMBALAM", "K K NAGAR", "ASHOK NAGAR", "EKKATUTHANGAL", "NANDANAM", "IIT", "KOTTURPURAM", "CHROMEPET", "SANITORIUM", "KELAMBAKKAM", "SELAIYUR", "KOVILAMBAKKAM", "SUNNAMBU KOLATHUR", "ASTHINAPURAM", "ANKAPUTTUR", "PAMMAL", "POZHICHALUR", "CHITLAPAKKAM", "VENGAIVASAL", "CHINMAYANAGAR", "VALASARAWALKAM", "VIRUGAMBAKKAM", "NESAPAKKAM", "MGR NAGAR", "JAFFERKHANPET", "FLOWERS ROAD", "GOPALAPURAM", "ALWARTHIRUNAGAR", "KOLAPAKKAM", "ADAMBAKKAM", "NANDAMBAKKAM", "MOULIVAKKAM", "RAMAPURAM", "MADIPAKKAM", "SALIGRAMAM", "KANDHANCHAVADI", "THARAMANI", "GOWRIVAKKAM", "TRUSTPURAM", "CIT NAGAR", "RANGARAJAPURAM", "ICE HOUSE", "JAM BAZAAR", "CENATOPH ROAD", "MRC NAGAR", "SANTHOME", "OKKIYAM", "NAVALUR", "THORAIPAKKAM", "GREENWAYS ROAD", "RAJAJI SALAI", "ECR", "OMR", "ABIRAMAPURAM", "MANDAVELI", "MUDICHUR", "IRUMBULIYUR", "PERUNGALATHUR", "VANDALUR", "URAPAKKAM", "KILAMBAKKAM", "GUDUVANCHERY", "MARAIMALAI NAGAR", "SP KOIL", "CHENGALPATTU", "VYSARPADI", "PURASAIWALKAM", "PERAMBUR", "CHOOLAI", "ANNANAGAR", "SHANTHI COLONY", "SHENOY NAGAR", "THIRUMANGALAM", "MUGAPPAIR", "NOLAMBUR", "AYANAVARAM", "VILLIVAKKAM", "PADI", "KORATTUR", "KOLATHUR", "MADHAVARAM", "KELLYS", "KILPAUK", "CENTRAL", "NERKUNDRAM", "MADURAVOYAL", "VELAPANCHAVADI", "IYYAPANTHANGAL", "POONAMALLEE", "THIRUMAZHISAI", "SRIPERUMBUTHUR", "PARRYS", "KANCHEEPURAM", "MANGADU", "SUNGUVARCHATIRAM", "REDHILLS", "CHOZHAVARAM", "KARANODAI", "PERIYAPALAYAM", "AMBATTUR", "THIRUMULLAIVOYAL", "AVADI", "PATTABIRAM", "THIRUNINRAVUR", "VEPPAMPATTU", "TIRUVALLUR", "ARAKONAM", "TIRUTHANI", "TIRUPATHI", "MINT", "WASHERMENPET", "TONDIARPET", "THIRUVOTRIYUR", "ENNORE", "PERAMBUR", "MOOLAKADAI", "ERUKANCHERY", "VYSARPADI", "MANALI", "GOOMIDIPOONDI", "PADAPPAI", "ORAGADAM", "KUNDRATHUR", "PORUR", "PARK TOWN", "VANAGARAM", "THIRUVERKADU", "MUGALIVAKKAM", "KATTUPAKKAM", "GERUGAMBAKKAM", "MADHURANTHANGAM", "MELMARUVATHUR", "AYAPAKKAM"
]

const lostReasons = [
  "Invalid Number", "Wrong Number", "Just enquired", "Service", "Insurance", "Internal",
  "Used car", "No Response", "Mock Call", "Plan Dropped", "DSA Enq",
  "BH Registration", "Existing Enq", "Duplicate Lead", "Not interested", "Did not enquire",
  "Lost to co-dealer", "Lost to competition", "Low Budget", "Out of Territory", "Not Eligible", "Job Enquiry"
]

const pendingReasons = [
  "RNR", "DND", "Not Reachable", "Switched Off", "Busy",
  "Disconnecting the call", "Temporary out of Service", "Call me back",
  "Incoming call facility not available", "Out of Network", "Plan Postponed"
]

export function LeadUpdateModal({ isOpen, onClose, lead, onUpdate }: LeadUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<"qualified" | "unqualified" | "pending" | null>(null)
  const today = new Date().toISOString().slice(0,10)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0,10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTradeInDialog, setShowTradeInDialog] = useState(false)
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
    sales_outcome: "Pending", // Booked, Retailed, Lost, Pending
    customer_location: ""
  })
  
  const [availableVariants, setAvailableVariants] = useState<string[]>([])
  const [availablePS, setAvailablePS] = useState<string[]>([])
  const [isTradeInDialogOpen, setIsTradeInDialogOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [isLoadingVariants, setIsLoadingVariants] = useState(false)
  const [selectedVariants, setSelectedVariants] = useState<string[]>([])

  // Validation functions
  const validateTradeInYear = (year: string): string => {
    if (!year) return ""
    
    // Check if year is exactly 4 digits
    if (!/^\d{4}$/.test(year)) {
      return "Year must be exactly 4 digits"
    }
    
    const yearNum = parseInt(year)
    const currentYear = new Date().getFullYear()
    
    if (isNaN(yearNum)) return "Year must be a valid number"
    // Allow older vehicles; accept years from 1950 onwards
    if (yearNum < 1950) return "Year cannot be before 1950"
    if (yearNum > currentYear + 1) return `Year cannot be after ${currentYear + 1}`
    
    return ""
  }

  const validateTradeInKm = (km: string): string => {
    if (!km) return ""
    const kmNum = parseInt(km.replace(/,/g, ''))
    if (isNaN(kmNum)) return "Kilometers must be a number"
    if (kmNum < 0) return "Kilometers cannot be negative"
    if (kmNum > 1000000) return "Kilometers cannot exceed 1,000,000"
    return ""
  }

  const validateMobileNumber = (mobile: string): string => {
    if (!mobile) return ""
    const mobileRegex = /^[6-9]\d{9}$/
    if (!mobileRegex.test(mobile)) return "Please enter a valid 10-digit mobile number"
    return ""
  }

  const validateEmail = (email: string): string => {
    if (!email) return ""
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return "Please enter a valid email address"
    return ""
  }

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    // Validate trade-in year
    if (formData.trade_in === "Yes" && formData.trade_in_year) {
      const yearError = validateTradeInYear(formData.trade_in_year)
      if (yearError) errors.trade_in_year = yearError
    }
    
    // Validate trade-in kilometers
    if (formData.trade_in === "Yes" && formData.trade_in_km) {
      const kmError = validateTradeInKm(formData.trade_in_km)
      if (kmError) errors.trade_in_km = kmError
    }

    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

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
      follow_up_date: tomorrow,
      lead_category: "",
      lost_reason: "",
      pending_reason: "",
      general_remarks: "",
      call_status: "",
      sales_outcome: "",
        customer_location: "",
    }))
  }, [isOpen, lead])

  useEffect(() => {
    if (formData.model_interested && toyotaModels[formData.model_interested as keyof typeof toyotaModels]) {
      setIsLoadingVariants(true)
      // Simulate loading delay for better UX
      setTimeout(() => {
      setAvailableVariants(toyotaModels[formData.model_interested as keyof typeof toyotaModels])
        setIsLoadingVariants(false)
        // Reset selected variants when model changes
        setSelectedVariants([])
        setFormData(prev => ({ ...prev, variant: "" }))
      }, 300)
    } else {
      setAvailableVariants([])
      setSelectedVariants([])
      setIsLoadingVariants(false)
    }
  }, [formData.model_interested])

  useEffect(() => {
    // Removing Branch/PS assignment from CRE flow
    setAvailablePS([])
  }, [])

  const handleStatusChange = (status: "qualified" | "unqualified" | "pending") => {
    setSelectedStatus(status)
    setFormData(prev => ({
      ...prev,
      lost_reason: "",
      pending_reason: ""
    }))
  }

  const handleModelSelect = (model: string) => {
    setFormData(prev => ({ ...prev, model_interested: model }))
  }

  const handleVariantSelect = (variant: string) => {
    // Single select for variants
    setSelectedVariants([variant])
    setFormData(prev => ({ ...prev, variant: variant }))
  }

  const handleSubmit = async () => {
    // DEBUG: Log all state before processing
    console.log('========== SUBMIT DEBUG START ==========')
    console.log('selectedStatus:', selectedStatus)
    console.log('formData.pending_reason:', formData.pending_reason)
    console.log('formData.general_remarks:', formData.general_remarks)
    console.log('lead?.lead_status:', lead?.lead_status)
    console.log('lead?.pending_reasons:', lead?.pending_reasons)
    console.log('========================================')
    
    // Validate form before submission (only trade-in validations)
    if (!validateForm()) {
      console.log('❌ [Validation] Form validation failed:', validationErrors)
      return
    }

    // Prevent empty updates during follow-up workflow (lead already qualified, no new status selected)
    const currentStatus = (lead?.lead_status || "").trim()
    const isClosed = currentStatus === "Won" || currentStatus === "Lost"
    const isFollowUpWorkflow = !isClosed && currentStatus !== "" && !selectedStatus
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

    // Main validation for all scenarios
    // Exception: when call outcome is a terminal lost reason, follow-up date is NOT required
    const isLostCallOutcome = (val?: string) => {
      const v = (val || "").trim().toLowerCase()
      return v === "lost to co-dealer" || v === "lost to competitor" || v === "not interested"
    }
    
    // Check if sales outcome is Lost
    const isSalesOutcomeLost = formData.sales_outcome === "Lost"
    
    if (currentStatus === "Qualified" && !formData.follow_up_date) {
      if (!isLostCallOutcome(formData.call_status) && !isSalesOutcomeLost) {
        toast.error("Please select a follow-up date before submitting.")
        return
      }
    }

    if (selectedStatus === "qualified") {
      const missingFields = []
      if (!formData.model_interested) missingFields.push("Model Interested")
      if (!formData.variant) missingFields.push("Variant")
      if (!formData.profession) missingFields.push("Profession")
      if (!formData.buying_plan) missingFields.push("Buying Plan")
      if (!formData.finance_option) missingFields.push("Finance Option")
      if (!formData.follow_up_date) missingFields.push("Follow-up Date")
      if (formData.trade_in === "Yes") {
        if (!formData.trade_in_make) missingFields.push("Trade-in Make")
        if (!formData.trade_in_model) missingFields.push("Trade-in Model")
        if (!formData.trade_in_year) missingFields.push("Trade-in Year")
        if (!formData.trade_in_km) missingFields.push("Trade-in KM")
        if (!formData.trade_in_ownership) missingFields.push("Trade-in Ownership")
      }
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.join(", ")}`)
        return
      }
    }

    if (selectedStatus === "pending") {
      const missingFields = []
      if (!formData.pending_reason) missingFields.push("Pending Reason")
      if (!formData.general_remarks) missingFields.push("Remarks")
      // Require follow-up date for ALL pending reasons (including Call me back)
      if (!formData.follow_up_date) missingFields.push("Follow-up Date")
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.join(", ")}`)
        return
      }
    }

    if (selectedStatus === "unqualified") {
      const missingFields = []
      if (!formData.lost_reason) missingFields.push("Lost Reason")
      if (!formData.general_remarks) missingFields.push("Remarks")
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.join(", ")}`)
        return
      }
    }

    // Validation for normal update (no status selected) - should have some field filled
    if (!selectedStatus && currentStatus !== "Qualified") {
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

    // Take a snapshot of the current form values BEFORE closing/unmounting
    const formSnapshot = { ...formData }

    const leadStatus = currentStatus
    // Reuse isClosed and isFollowUpWorkflow computed above
    // For Pending flow: lead_status must match the exact pending reason chosen.
    // In Fresh tab routing, "Call me back" => Follow Up queue; all others => Called queue.
    const pendingExactStatus = formData.pending_reason || "Called"
    // Build pending_reasons array for pending status
    const buildPendingReasons = () => {
      // Check if we're adding a new pending reason (either new pending or updating existing pending)
      const isNewPending = selectedStatus === "pending" && formData.pending_reason
      const isExistingPendingUpdate = lead?.lead_status && ["RNR", "DND", "Busy", "Call me back", "Not Reachable", "Switched Off", "Disconnecting the call", "Temporary out of Service", "Incoming call facility not available", "Out of Network", "Plan Postponed"].includes(lead.lead_status) && formData.pending_reason
      
      console.log('🔍 buildPendingReasons debug:', {
        selectedStatus,
        pending_reason: formData.pending_reason,
        general_remarks: formData.general_remarks,
        lead_status: lead?.lead_status,
        isNewPending,
        isExistingPendingUpdate,
        existingReasonsCount: lead?.pending_reasons?.length || 0,
        willAddPendingReason: isNewPending || isExistingPendingUpdate
      })
      
      if (isNewPending || isExistingPendingUpdate) {
        const existingReasons = lead?.pending_reasons || []
        const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
        const parsed = session ? JSON.parse(session) : null
        const userName = parsed?.user?.name || parsed?.name || "CRE"
        
        const newAttempt = {
          attempt: existingReasons.length + 1,
          reason: formData.general_remarks || "",
          status: formData.pending_reason || "",
          date: new Date().toISOString(),
          user: userName
        }
        
        const result = [...existingReasons, newAttempt]
        console.log('✅ Adding new attempt:', newAttempt)
        console.log('✅ Final pending_reasons:', result)
        return result
      }
      
      console.log('❌ No pending reason update needed, returning undefined to avoid sending null')
      return undefined // Return undefined instead of empty array to avoid sending it in the payload
    }

    const updateData = isFollowUpWorkflow
      ? {
          leadId: lead?.id,
          uid: lead?.uid,
          updated_at: new Date().toISOString(),
          lead_status: formData.sales_outcome === "Lost" ? "Lost" :
                       (formData.sales_outcome === "Booked" || formData.sales_outcome === "Retailed") ? "Won" : "Qualified",
          final_status: formData.sales_outcome === "Lost" ? "Lost" :
                       (formData.sales_outcome === "Booked" || formData.sales_outcome === "Retailed") ? "Won" : "Pending",
          follow_up_date: formData.follow_up_date || tomorrow,
          followup_count: (lead?.followup_count || 0) + 1,
          call_status: formData.call_status,
          general_remarks: formData.general_remarks,
          followup_note: formData.general_remarks
        }
      : {
          leadId: lead?.id,
          uid: lead?.uid,
          ...formData,
          updated_at: new Date().toISOString(),
          // Lead status mapping per business rules - MUST come after formData spread
          status: selectedStatus,
          lead_status: selectedStatus === "qualified" ? "Qualified" : 
                       selectedStatus === "unqualified" ? (formData.lost_reason || "Lost") : 
                       selectedStatus === "pending" ? (formData.pending_reason === "Call me back" ? "Call me back" : formData.pending_reason || "Called") : null,
          // Final status mapping - when qualified, final_status should be Pending
          final_status: selectedStatus === "qualified" ? "Pending" :
                       selectedStatus === "unqualified" ? "Lost" : 
                       selectedStatus === "pending" ? "Pending" : "Pending",
          // Ensure follow up date exists for qualified and all pending reasons
          follow_up_date: selectedStatus === "qualified" ? (formData.follow_up_date || tomorrow) : 
                         selectedStatus === "pending" ? (formData.follow_up_date || tomorrow) : 
                         selectedStatus === "unqualified" ? undefined : 
                         (formData.follow_up_date || undefined),
          is_lost: selectedStatus === "unqualified",
          // Mark all pending updates as needing follow-up
          needs_follow_up: selectedStatus === "pending",
          // Add pending_reasons for pending status
          pending_reasons: (() => {
            const result = buildPendingReasons()
            console.log('🚀 Final payload pending_reasons:', result)
            console.log('🚀 Debug info:', {
              selectedStatus,
              pending_reason: formData.pending_reason,
              general_remarks: formData.general_remarks,
              lead_status: lead?.lead_status
            })
            return result
          })(),
          // For unqualified leads, store remark in first_remark
          first_remark: selectedStatus === "unqualified" ? formData.general_remarks : undefined
        }

    // DEBUG: Log the constructed payload
    console.log('========== PAYLOAD DEBUG ==========')
    console.log('updateData:', JSON.stringify(updateData, null, 2))
    console.log('updateData.lead_status:', (updateData as any).lead_status)
    console.log('updateData.pending_reasons:', (updateData as any).pending_reasons)
    console.log('updateData.follow_up_date:', (updateData as any).follow_up_date)
    console.log('===================================')
    
    // NOTE: Do NOT use worker for lead_master updates. Worker is used only
    // for inserting into qualified_leads (and trade-in) after direct update succeeds.

    // Qualified follow-up: record outcome in per-step status column without changing main lead_status.
    // F1 -> second_call_lead_status, F2 -> third_call_lead_status, ... F5 -> sixth_call_lead_status
    if (formData.call_status && isFollowUpWorkflow) {
      const normalized = formData.call_status.trim()
      const stepToStatusColumn: Record<number, string> = {
        1: 'second_call_lead_status',
        2: 'third_call_lead_status',
        3: 'fourth_call_lead_status',
        4: 'fifth_call_lead_status',
        5: 'sixth_call_lead_status'
      }
      const statusColumn = stepToStatusColumn[nextFollowupNumber]
      if (statusColumn) {
        ;(updateData as any)[statusColumn] = normalized
      }
      if (normalized.toLowerCase() === "call me back") {
        ;(updateData as any).follow_up_date = formData.follow_up_date || tomorrow
      } else if (!formData.follow_up_date) {
        delete (updateData as any).follow_up_date
      }
      // Terminal lost outcomes during follow-up should close the lead as Lost, no follow-up date needed
      if (isLostCallOutcome(normalized)) {
        ;(updateData as any).final_status = "Lost"
        ;(updateData as any).lead_status = "Lost"
        delete (updateData as any).follow_up_date
      }
    }

    // For non-qualified flows (Fresh → Pending/Qualified/Lost), allow call_status to drive lead_status
    if (formData.call_status && !isFollowUpWorkflow) {
      // Normalize to match option labels shown in menu
      const normalized = formData.call_status.trim()
      ;(updateData as any).lead_status = normalized
      // If Not Interested via call outcome, close as Lost
      if (normalized.toLowerCase() === "not interested" || isLostCallOutcome(normalized)) {
        ;(updateData as any).final_status = "Lost"
      }
      if (normalized.toLowerCase() === "call me back") {
        ;(updateData as any).follow_up_date = formData.follow_up_date || tomorrow
      } else if (!formData.follow_up_date) {
        // Avoid sending empty string which breaks backend timestamp parsing
        delete (updateData as any).follow_up_date
      }
    }
    
    // Get authentication token
    const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
    const parsed = session ? JSON.parse(session) : null
    const token = parsed?.access_token || ''
    
    // Direct API call to lead_master - this will trigger background worker for other tables
    console.log('🚀 [Direct API] Lead update started - updating lead_master directly (no worker)!')
    // Keep modal open and show loading until lead_master update succeeds
    setIsSubmitting(true)
    
    fetch(`/api/leads/${lead?.uid}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        // map modal fields to backend
        status: (updateData as any).lead_status,
        lead_status: (updateData as any).lead_status, // ADD: Lead status field for backend
        final_status: (updateData as any).final_status,
        pending_reasons: (updateData as any).pending_reasons, // ADD: Pending reasons array
        // first_remark should only be sent during Qualify (first call). For follow-ups, we send followup_note instead
        // For pending/unqualified first calls, use first_call_remark instead of first_remark
        first_remark: isFollowUpWorkflow ? undefined : (selectedStatus === "qualified" ? formSnapshot.general_remarks : undefined),
        first_call_remark: isFollowUpWorkflow ? undefined : (selectedStatus === "pending" || selectedStatus === "unqualified" ? formSnapshot.general_remarks : undefined),
        profession: formSnapshot.profession,
        variant: formSnapshot.variant,
        model_interested: formSnapshot.model_interested,
        lead_category: formSnapshot.lead_category,
        buying_plan: formSnapshot.buying_plan,
        finance_option: formSnapshot.finance_option,
        trade_in: formSnapshot.trade_in,
        trade_in_make: formSnapshot.trade_in_make,
        trade_in_model: formSnapshot.trade_in_model,
        trade_in_year: formSnapshot.trade_in_year,
        trade_in_km: formSnapshot.trade_in_km,
        trade_in_ownership: formSnapshot.trade_in_ownership,
        test_drive_type: formSnapshot.test_drive_type,
        follow_up_date: (updateData as any).follow_up_date ?? (formSnapshot.follow_up_date || undefined),
        customer_location: formSnapshot.customer_location,
        followup_note: isFollowUpWorkflow ? formSnapshot.general_remarks : undefined,
        // Per-step follow-up status capture (only one will be set per save)
        second_call_lead_status: (updateData as any).second_call_lead_status,
        third_call_lead_status: (updateData as any).third_call_lead_status,
        fourth_call_lead_status: (updateData as any).fourth_call_lead_status,
        fifth_call_lead_status: (updateData as any).fifth_call_lead_status,
        sixth_call_lead_status: (updateData as any).sixth_call_lead_status
      })
    })
    .then(resp => {
      if (!resp.ok) {
        console.error('❌ [Direct API] Failed to update lead_master')
        throw new Error(`HTTP error! status: ${resp.status}`)
      }
      return resp.json()
    })
    .then(data => {
      // 🔍 Enhanced Debug Logging
      const payloadSent = {
        first_remark: isFollowUpWorkflow ? undefined : (selectedStatus === "qualified" ? formSnapshot.general_remarks : undefined),
        first_call_remark: isFollowUpWorkflow ? undefined : (selectedStatus === "pending" || selectedStatus === "unqualified" ? formSnapshot.general_remarks : undefined),
        followup_note: isFollowUpWorkflow ? formSnapshot.general_remarks : undefined,
        isFollowUpWorkflow: isFollowUpWorkflow,
        selectedStatus: selectedStatus
      }
      
      console.log('🔍 [Frontend Debug] Request body analysis:', {
        leadId: lead?.uid,
        leadStatus: lead?.lead_status,
        isClosed: lead?.lead_status === "Won" || lead?.lead_status === "Lost",
        isFollowUpWorkflow: isFollowUpWorkflow,
        general_remarks: formData.general_remarks,
        payload: payloadSent,
        followup_note_present: 'followup_note' in payloadSent,
        followup_note_value: payloadSent.followup_note,
        followup_note_truthy: !!payloadSent.followup_note,
        first_remark_present: 'first_remark' in payloadSent,
        first_remark_value: payloadSent.first_remark,
        first_call_remark_present: 'first_call_remark' in payloadSent,
        first_call_remark_value: payloadSent.first_call_remark
      })
      
      console.log('✅ [Direct API] Lead master updated successfully!')

      // Proactively notify dashboard to refresh immediately
      try {
        // Get current user from localStorage
        const supabaseUser = localStorage.getItem("supabase_user")
        const currentUser = supabaseUser ? JSON.parse(supabaseUser) : null
        
        // Dispatch CRE-specific events to avoid affecting other CREs
        const eventName = `lead-master-updated-${currentUser?.username}`
        window.dispatchEvent(new CustomEvent(eventName, { 
          detail: { 
            uid: lead?.uid,
            creName: currentUser?.username,
            currentUser: currentUser?.username 
          } 
        }))
        
        // Also trigger CRE-specific lead status change event
        const statusEventName = `lead-status-changed-${currentUser?.username}`
        window.dispatchEvent(new CustomEvent(statusEventName, {
          detail: {
            leadUid: lead?.uid,
            oldStatus: lead?.lead_status,
            newStatus: (updateData as any).lead_status,
            selectedStatus: selectedStatus,
            creName: currentUser?.username,
            currentUser: currentUser?.username
          }
        }))
      } catch {}

      // Now update UI and close modal
      onUpdate(updateData)
      onClose()

      // Queue background processing for qualified_leads and trade-in only after successful direct update
      if (selectedStatus === 'qualified') {
        try {
          const session2 = localStorage.getItem('supabase_user') || localStorage.getItem('user')
          const parsed2 = session2 ? JSON.parse(session2) : null
          const token2 = parsed2?.access_token || ''

          const payload: any = {
            model_interested: formSnapshot.model_interested || '',
            variant: formSnapshot.variant || '',
            first_remark: formSnapshot.general_remarks || '',
            first_call_remark: formSnapshot.general_remarks || '',
            profession: formSnapshot.profession || '',
            buying_plan: formSnapshot.buying_plan || '',
            finance_option: formSnapshot.finance_option || '',
            test_drive_type: formSnapshot.test_drive_type || '',
            lead_category: formSnapshot.lead_category || '',
            trade_in: formSnapshot.trade_in || ''
          }
          // Always include trade-in fields explicitly; backend will decide whether to insert
          payload.trade_in_make = formSnapshot.trade_in_make || ''
          payload.trade_in_model = formSnapshot.trade_in_model || ''
          payload.trade_in_year = formSnapshot.trade_in_year || ''
          payload.trade_in_km = formSnapshot.trade_in_km || ''
          payload.trade_in_ownership = formSnapshot.trade_in_ownership || ''

          // Fire-and-forget; no impact on direct update UX
          fetch(`/api/leads/${lead?.uid}/qualify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token2}`
            },
            body: JSON.stringify(payload)
          })
          .then(r => r.json())
          .then(res => {
            console.log('🔄 [Worker] Queued qualified_leads insertion (and trade-in if applicable):', res)
          })
          .catch(err => {
            console.error('❌ [Worker] Failed to enqueue qualification:', err)
          })
        } catch (err) {
          console.error('❌ [Worker] Error preparing queue payload:', err)
        }
      }
    })
    .catch(e => {
      console.error('❌ [Direct API] Failed to update lead:', e)
      alert('Failed to update lead. Please try again.')
    })
    .finally(() => setIsSubmitting(false))
  }

  if (!lead) return null
  const currentStatus = (lead.lead_status || "").trim()
  const isClosedStatus = currentStatus === "Won" || currentStatus === "Lost"
  // Show follow-up ONLY after qualification: non-empty initial remark (lead_remark or first_call_remark) and not closed
  const hasInitialRemark = !!(lead.lead_remark && String(lead.lead_remark).trim()) || !!(lead.first_call_remark && String(lead.first_call_remark).trim())
  const shouldShowFollowUp = !isClosedStatus && hasInitialRemark

  // Derive completed follow-ups from stored remarks (second..sixth)
  const followupRemarks = [
    lead.second_remark,
    lead.third_remark,
    lead.fourth_remark,
    lead.fifth_remark,
    lead.sixth_remark
  ]
  const derivedFollowupCount = followupRemarks.filter(r => !!(r && String(r).trim())).length
  const nextFollowupNumber = Math.min(derivedFollowupCount + 1, 5)

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px] max-h-[90vh] overflow-y-auto p-0">
        {/* Compact Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 leading-tight">
             Update Lead - {lead.uid}
           </DialogTitle>
                <div className="mt-1 space-x-2">
                  {(lead.final_status === 'Won' || lead.lead_status === 'Won') && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Won</span>
                  )}
                  {(lead.final_status === 'Lost' || lead.lead_status === 'Lost') && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Lost</span>
                  )}
                </div>
              <DialogDescription className="text-sm text-gray-500 mt-1">
             Update lead information and call history
           </DialogDescription>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Information Card - Apple Magnus Style */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/90 to-indigo-50/70 rounded-xl border border-blue-200/30 shadow-lg backdrop-blur-sm">
            {/* Apple Magnus glassy effect layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
            <div className="absolute inset-0 backdrop-filter backdrop-blur-[4px]"></div>
            
            <div className="relative p-5">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-blue-100/80 rounded-lg backdrop-blur-sm">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">Customer Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Name</span>
                    <span className="text-sm font-medium text-gray-900">{lead.customer_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Date</span>
                    <span className="text-sm font-medium text-gray-900">{lead.date}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Campaign</span>
                    <span className="text-sm font-medium text-gray-900">{lead.campaign}</span>
                </div>
                {lead.lead_category && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Category:</span>
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${
                      lead.lead_category === 'Hot' 
                        ? 'bg-red-100 text-red-800 border-red-200' 
                        : lead.lead_category === 'Warm' 
                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {lead.lead_category === 'Hot' && <Flame className="h-3 w-3 inline mr-1" />}
                      {lead.lead_category === 'Warm' && <Thermometer className="h-3 w-3 inline mr-1" />}
                      {lead.lead_category === 'Cold' && <Snowflake className="h-3 w-3 inline mr-1" />}
                      {lead.lead_category}
                    </Badge>
                  </div>
                )}
                </div>
                <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Phone</span>
                    <span className="text-sm font-medium text-gray-900">{lead.customer_mobile_number}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Building className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Source</span>
                    <Badge variant="outline" className="bg-blue-100/80 text-blue-800 border-blue-200 text-xs px-2 py-0.5">{lead.source}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">UID</span>
                    <Badge variant="secondary" className="bg-gray-100/80 text-gray-700 text-xs px-2 py-0.5">{lead.uid}</Badge>
                  </div>
                </div>
              </div>

              {/* Pending Reasons - Multiple attempts */}
              {lead.pending_reasons && lead.pending_reasons.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-amber-50/80 to-orange-50/60 border border-amber-200/40 backdrop-blur-sm">
                  <div className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Pending Attempts ({lead.pending_reasons.length})
                  </div>
                  <div className="space-y-2">
                    {lead.pending_reasons.map((reason, index) => (
                      <div key={index} className="bg-white/60 rounded-md p-2 border border-amber-200/60">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-amber-800">Attempt #{reason.attempt}</span>
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                              {reason.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{(reason.date || '').slice(0,10)}</span>
                        </div>
                        <div className="text-xs text-gray-700 leading-relaxed">
                          {reason.reason}
                        </div>
                        {reason.user && (
                          <div className="text-xs text-gray-500 mt-1">
                            by {reason.user}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Remarks - Unqualified/Lost leads */}
              {lead.existing_remarks && (
                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-red-50/80 to-pink-50/60 border border-red-200/40 backdrop-blur-sm">
                  <div className="text-xs font-semibold text-red-900 mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Lost/Unqualified Reason
                  </div>
                  <div className="text-xs text-gray-700 leading-relaxed">
                    {lead.existing_remarks}
                  </div>
                </div>
              )}

              {/* Previous Calls - Compact */}
              <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/40 backdrop-blur-sm">
                <div className="text-xs font-semibold text-blue-900 mb-2">Previous Calls</div>
                <div className="text-xs text-gray-700 space-y-1 leading-tight">
                  <div>First Call: <span className="font-medium">{(lead.first_call_date || '').slice(0,10) || '-'}</span> · {lead.lead_status ? (<Badge variant="outline" className="mr-1">{lead.lead_status}</Badge>) : null}{lead.first_call_remark || lead.lead_remark || lead.remarks || '—'}</div>
                  {(lead.second_remark || lead.second_call_lead_status) && (
                    <div>F1: <span className="font-medium">{(lead.second_call_date || '').slice(0,10)}</span> · {lead.second_call_lead_status ? (<Badge variant="outline" className="mr-1">{lead.second_call_lead_status}</Badge>) : null}{lead.second_remark}</div>
                  )}
                  {lead.third_remark && (
                    <div>F2: <span className="font-medium">{(lead.third_call_date || '').slice(0,10)}</span> · {lead.third_call_lead_status ? (<Badge variant="outline" className="mr-1">{lead.third_call_lead_status}</Badge>) : null}{lead.third_remark}</div>
                  )}
                  {lead.fourth_remark && (
                    <div>F3: <span className="font-medium">{(lead.fourth_call_date || '').slice(0,10)}</span> · {lead.fourth_call_lead_status ? (<Badge variant="outline" className="mr-1">{lead.fourth_call_lead_status}</Badge>) : null}{lead.fourth_remark}</div>
                  )}
                  {lead.fifth_remark && (
                    <div>F4: <span className="font-medium">{(lead.fifth_call_date || '').slice(0,10)}</span> · {lead.fifth_call_lead_status ? (<Badge variant="outline" className="mr-1">{lead.fifth_call_lead_status}</Badge>) : null}{lead.fifth_remark}</div>
                  )}
                  {lead.sixth_remark && (
                    <div>F5: <span className="font-medium">{(lead.sixth_call_date || '').slice(0,10)}</span> · {lead.sixth_call_lead_status ? (<Badge variant="outline" className="mr-1">{lead.sixth_call_lead_status}</Badge>) : null}{lead.sixth_remark}</div>
                  )}
                </div>
              </div>

              {/* Qualification Summary (if present) */}
              {(lead.model_interested || lead.branch || lead.ps_assigned || lead.lead_category || true) && (
                <div className="mt-4 pt-3 border-t border-blue-200/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Always show Model Interested */}
                  <div className="flex items-center space-x-2">
                    <Car className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Model:</span>
                    {lead.model_interested ? (
                      <span className="text-sm font-medium text-gray-900">{lead.model_interested}</span>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300 text-xs px-2 py-0.5">Not Set</Badge>
                    )}
                  </div>
                  {/* Always show Variant */}
                  <div className="flex items-center space-x-2">
                    <Car className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Variant:</span>
                    {lead.variant ? (
                      <span className="text-sm font-medium text-gray-900">{lead.variant}</span>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300 text-xs px-2 py-0.5">Not Set</Badge>
                    )}
                  </div>
                  {lead.branch && (
                    <div className="flex items-center space-x-2">
                        <Building className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">Branch:</span>
                        <span className="text-sm font-medium text-gray-900">{lead.branch}</span>
                    </div>
                  )}
                  {lead.ps_assigned && (
                    <div className="flex items-center space-x-2">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">PS:</span>
                        <span className="text-sm font-medium text-gray-900">{lead.ps_assigned}</span>
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Previous Follow-ups */}
          {lead.call_logs && lead.call_logs.length > 0 && (
            <div className="border-2 rounded-lg border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 shadow-md">
              <div className="p-4 border-b border-purple-200 bg-purple-100/50">
                <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Previous Follow-ups
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {lead.call_logs.map((log, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                      <div className="text-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-3 w-3 text-purple-600" />
                          <span className="font-medium text-sm">{log.date}</span>
                          <Badge variant="outline" className="ml-auto bg-purple-50 text-purple-700 border-purple-200">{log.outcome || "—"}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 pl-5">
                          {log.remarks || "No remarks"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Status Selection or Follow-up Workflow */}
          {!shouldShowFollowUp ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-50/90 to-gray-100/70 rounded-xl border border-gray-200/30 shadow-lg backdrop-blur-sm">
              {/* Apple Magnus glassy effect layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-gray-300/25"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
              <div className="absolute inset-0 backdrop-filter backdrop-blur-[4px]"></div>
              
              <div className="relative p-5">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-gray-100/80 rounded-lg backdrop-blur-sm">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Lead Status Update</h3>
                  </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      selectedStatus === "qualified" 
                        ? "bg-gradient-to-br from-green-100/90 to-green-200/70 text-green-800 border border-green-300/30 shadow-lg backdrop-blur-[6px] focus:ring-green-300" 
                        : "bg-gradient-to-br from-white/90 to-green-50/70 text-green-700 border border-green-200/30 hover:shadow-md hover:from-green-50/90 hover:to-green-100/70 backdrop-blur-[6px] focus:ring-green-300"
                    }`}
                    onClick={() => handleStatusChange("qualified")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    <span className="relative z-10 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Qualified
                    </span>
                  </button>
                  
                  <button
                    className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      selectedStatus === "unqualified" 
                        ? "bg-gradient-to-br from-red-100/90 to-red-200/70 text-red-800 border border-red-300/30 shadow-lg backdrop-blur-[6px] focus:ring-red-300" 
                        : "bg-gradient-to-br from-white/90 to-red-50/70 text-red-700 border border-red-200/30 hover:shadow-md hover:from-red-50/90 hover:to-red-100/70 backdrop-blur-[6px] focus:ring-red-300"
                    }`}
                    onClick={() => handleStatusChange("unqualified")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    <span className="relative z-10 flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Unqualified
                    </span>
                  </button>
                  
                  <button
                    className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      selectedStatus === "pending" 
                        ? "bg-gradient-to-br from-amber-100/90 to-amber-200/70 text-amber-800 border border-amber-300/30 shadow-lg backdrop-blur-[6px] focus:ring-amber-300" 
                        : "bg-gradient-to-br from-white/90 to-amber-50/70 text-amber-700 border border-amber-200/30 hover:shadow-md hover:from-amber-50/90 hover:to-amber-100/70 backdrop-blur-[6px] focus:ring-amber-300"
                    }`}
                    onClick={() => handleStatusChange("pending")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    <span className="relative z-10 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pending
                    </span>
                  </button>
                  </div>
                </div>
            </div>
          ) : (
            isClosedStatus ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-50/90 to-gray-100/70 rounded-xl border border-gray-200/30 shadow-lg backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-gray-300/25"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
              <div className="absolute inset-0 backdrop-filter backdrop-blur-[4px]"></div>
              
              <div className="relative p-5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gray-100/80 rounded-lg backdrop-blur-sm">
                    <Lock className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">
                  {currentStatus === "Won" ? "Lead is Closed as Won" : "Lead is Closed as Lost"}
                  </h3>
                </div>
              </div>
            </div>
            ) : (
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/90 to-indigo-50/70 rounded-xl border border-blue-200/30 shadow-lg backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                <div className="absolute inset-0 backdrop-filter backdrop-blur-[4px]"></div>
                
                <div className="relative p-5">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-blue-100/80 rounded-lg backdrop-blur-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Qualified Lead - Follow-up {nextFollowupNumber} of 5</h3>
                      <p className="text-xs text-gray-500">Final: {lead.final_status || 'Pending'} · Status: {currentStatus || 'Qualified'}</p>
                    </div>
                  </div>
                  
                {/* Stepper */}
                <div className="flex items-center gap-3 mb-4">
                  {[1,2,3,4,5].map((step) => {
                    const completed = derivedFollowupCount >= step
                    const current = nextFollowupNumber === step
                    return (
                      <div key={step} className="flex items-center gap-2">
                        {completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : current ? (
                            <Circle className="h-4 w-4 text-blue-600" />
                        ) : (
                            <Lock className="h-4 w-4 text-gray-400" />
                        )}
                          <span className={`text-xs ${completed ? "text-green-700" : current ? "text-blue-700" : "text-gray-500"}`}>F{step}</span>
                      </div>
                    )
                  })}
                </div>

                  {/* Qualification Details Summary */}
                  <div className="bg-white/60 rounded-lg p-3 border border-blue-100 mb-4">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      Qualification Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {lead.model_interested && (
                        <div className="flex items-start gap-1">
                          <span className="text-gray-500">Model:</span>
                          <span className="font-medium text-gray-800">{lead.model_interested}</span>
                        </div>
                      )}
                      {lead.variant && (
                        <div className="flex items-start gap-1">
                          <span className="text-gray-500">Variant:</span>
                          <span className="font-medium text-gray-800">{lead.variant}</span>
                        </div>
                      )}
                      {lead.buying_plan && (
                        <div className="flex items-start gap-1">
                          <span className="text-gray-500">Buying:</span>
                          <span className="font-medium text-gray-800">{lead.buying_plan}</span>
                        </div>
                      )}
                      {lead.finance_option && (
                        <div className="flex items-start gap-1">
                          <span className="text-gray-500">Finance:</span>
                          <span className="font-medium text-gray-800">{lead.finance_option}</span>
                        </div>
                      )}
                      {lead.trade_in && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Trade-in:</span>
                          <span className="font-medium text-gray-800">{lead.trade_in}</span>
                          {lead.trade_in === 'Yes' && lead.trade_in_make && (
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
                      )}
                      {lead.test_drive_type && (
                        <div className="flex items-start gap-1">
                          <span className="text-gray-500">Test Drive:</span>
                          <span className="font-medium text-gray-800">{lead.test_drive_type}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-2 block">Follow-up Date (Today)</Label>
                      <Input type="date" value={today} readOnly className="h-10 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-2 block">Call Outcome</Label>
                      <div className="space-y-2">
                        <Select value={formData.call_status} onValueChange={(value) => {
                          const v = (value || '').trim().toLowerCase()
                          const isTerminalLost = v === 'lost to co-dealer' || v === 'lost to competitor'
                          const isNotInterested = v === 'not interested'
                          setFormData(prev => ({
                            ...prev,
                            call_status: value,
                            // Auto-close as Lost and clear follow-up date for terminal lost outcomes
                            sales_outcome: (isTerminalLost || isNotInterested) ? 'Lost' : prev.sales_outcome,
                            follow_up_date: (isTerminalLost || isNotInterested) ? '' : prev.follow_up_date
                          }))
                        }}>
                           <SelectTrigger>
                             <SelectValue placeholder="Select outcome" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="Lead Status">Lead Status</SelectItem>
                             <SelectItem value="DND">DND</SelectItem>
                             <SelectItem value="Booked">Booked</SelectItem>
                             <SelectItem value="Duplicate Lead">Duplicate Lead</SelectItem>
                             <SelectItem value="Existing Enquiry">Existing Enquiry</SelectItem>
                             <SelectItem value="Invalid Number">Invalid Number</SelectItem>
                             <SelectItem value="Lost to Co-Dealer">Lost to Co-Dealer</SelectItem>
                             <SelectItem value="Lost to competitor">Lost to competitor</SelectItem>
                             <SelectItem value="RNR">RNR</SelectItem>
                             <SelectItem value="Not Enquired">Not Enquired</SelectItem>
                             <SelectItem value="Not Interested">Not Interested</SelectItem>
                             <SelectItem value="Interested">Interested</SelectItem>
                             <SelectItem value="Call me back">Call me back</SelectItem>
                             <SelectItem value="Not reachable">Not reachable</SelectItem>
                             <SelectItem value="Switched off">Switched off</SelectItem>
                             <SelectItem value="Busy">Busy</SelectItem>
                             <SelectItem value="Disconnecting the call">Disconnecting the call</SelectItem>
                             <SelectItem value="No Response">No Response</SelectItem>
                             <SelectItem value="Low Budget">Low Budget</SelectItem>
                             <SelectItem value="Out of Territory">Out of Territory</SelectItem>
                             <SelectItem value="Number does not exist">Number does not exist</SelectItem>
                             <SelectItem value="DSA">DSA</SelectItem>
                             <SelectItem value="Just enquired">Just enquired</SelectItem>
                             <SelectItem value="Not Eligible">Not Eligible</SelectItem>
                             <SelectItem value="Out of Network">Out of Network</SelectItem>
                             <SelectItem value="Used Car">Used Car</SelectItem>
                             <SelectItem value="Incoming call not available">Incoming call not available</SelectItem>
                             <SelectItem value="Plan Dropped">Plan Dropped</SelectItem>
                             <SelectItem value="Temporary out of Service">Temporary out of Service</SelectItem>
                             <SelectItem value="Service">Service</SelectItem>
                             <SelectItem value="Internal call">Internal call</SelectItem>
                             <SelectItem value="Wrong number">Wrong number</SelectItem>
                             <SelectItem value="Insurance">Insurance</SelectItem>
                             <SelectItem value="Warranty">Warranty</SelectItem>
                             <SelectItem value="Marketing">Marketing</SelectItem>
                             <SelectItem value="Yard">Yard</SelectItem>
                             <SelectItem value="Job Enq">Job Enq</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="mt-3">
                         <Label className="text-xs font-medium text-gray-600 mb-2 block">Remarks</Label>
                         <Textarea
                           placeholder="Add call remarks"
                           value={formData.general_remarks}
                           onChange={(e) => setFormData(prev => ({ ...prev, general_remarks: e.target.value }))}
                           rows={3}
                           className="text-sm"
                         />
                       </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-2 block">
                        {(() => {
                          const v = (formData.call_status || '').trim().toLowerCase()
                          const isTerminalLost = v === 'lost to co-dealer' || v === 'lost to competitor'
                          const isNotInterested = v === 'not interested'
                          const isSalesOutcomeLost = formData.sales_outcome === 'Lost'
                          return (isTerminalLost || isNotInterested || isSalesOutcomeLost) ? 'Next Follow-up Date (not required for Lost)' : 'Next Follow-up Date *'
                        })()}
                      </Label>
                      {(() => {
                        const v = (formData.call_status || '').trim().toLowerCase()
                        const isTerminalLost = v === 'lost to co-dealer' || v === 'lost to competitor'
                        const isNotInterested = v === 'not interested'
                        const isSalesOutcomeLost = formData.sales_outcome === 'Lost'
                        const isLostOutcome = isTerminalLost || isNotInterested || isSalesOutcomeLost
                        return (
                          <Input
                            type="date"
                            value={isLostOutcome ? today : (formData.follow_up_date || tomorrow)}
                            onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                            disabled={isLostOutcome}
                            readOnly={isLostOutcome}
                            className={`h-10 text-sm ${isLostOutcome ? 'opacity-60 cursor-not-allowed' : ''}`}
                          />
                        )
                      })()}
                    </div>
                </div>

                  {/* Sales Outcome */}
                  <div className="mt-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-2 block">Sales Outcome</Label>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sales Outcome options">
                        {["Booked", "Retailed", "Lost", "Pending"].map((outcome) => (
                          <button
                            key={outcome}
                            type="button"
                            role="radio"
                            aria-checked={formData.sales_outcome === outcome}
                            className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                              formData.sales_outcome === outcome
                                ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              sales_outcome: outcome,
                              // Clear follow-up date when Lost is selected
                              follow_up_date: outcome === 'Lost' ? '' : prev.follow_up_date
                            }))}
                          >
                            {outcome}
                          </button>
                        ))}
                  </div>
                </div>
                  </div>
                  
                <div className="mt-4">
                  {/* History Button - Apple Magnus Blue Design */}
                  <button
                    type="button"
                    className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px] w-full justify-center transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 bg-gradient-to-br from-blue-50/90 to-blue-100/70 text-blue-800 border border-blue-200/30 shadow-lg backdrop-blur-[6px] hover:shadow-xl"
                    onClick={() => {
                      // Add history functionality here
                      console.log('History button clicked')
                    }}
                  >
                    {/* Apple Magnus glassy effect layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                    
                    <span className="relative z-10 flex items-center gap-2">
                      <div className="p-1 bg-blue-100/80 rounded-lg backdrop-blur-sm">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      History
                      <ChevronDown className="h-4 w-4 text-blue-600" />
                    </span>
                  </button>
                </div>
                </div>
              </div>
            )
          )}

          {/* Qualified Section (only when moving from Fresh/Pending to Qualified) */}
          {selectedStatus === "qualified" && lead.lead_status !== "Qualified" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Model Interest Card */}
              <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-green-100/80 rounded-lg backdrop-blur-sm">
                    <Car className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Model Interested</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-medium text-gray-600">Select Toyota Model</Label>
                      <span className="text-xs text-blue-600 font-medium">Required</span>
                    </div>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, model_interested: value }))}>
                      <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Select Toyota Model" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(toyotaModels).map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                </div>
              </div>

              {/* Variant Card */}
              <div className={`relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4 transition-all duration-200 ${
                !formData.model_interested ? "opacity-60" : ""
              }`}>
                <div className="flex items-center space-x-2 mb-4">
                  <div className={`p-2 rounded-lg backdrop-blur-sm ${
                    !formData.model_interested 
                      ? "bg-gray-100/80" 
                      : "bg-blue-100/80"
                  }`}>
                    <Car className={`h-4 w-4 ${
                      !formData.model_interested 
                        ? "text-gray-400" 
                        : "text-blue-600"
                    }`} />
                  </div>
                  <h3 className={`text-sm font-semibold ${
                    !formData.model_interested 
                      ? "text-gray-500" 
                      : "text-gray-800"
                  }`}>Variant</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-medium text-gray-600">Select Variant</Label>
                      {!formData.model_interested && (
                        <span className="text-xs text-amber-600 italic font-medium">⚠️ Select model to unlock variants</span>
                      )}
                    </div>
                    
                    {isLoadingVariants ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-xs text-gray-600">Loading variants...</span>
                      </div>
                    ) : (
                      <Select 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, variant: value }))}
                        disabled={!formData.model_interested}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Select Variant" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVariants.map((variant) => (
                            <SelectItem key={variant} value={variant}>{variant}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    </div>
                </div>
              </div>

              {/* Customer Details Card */}
              <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-purple-100/80 rounded-lg backdrop-blur-sm">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Customer Details</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Profession *</Label>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Profession options">
                          {professions.map((profession) => (
                        <button
                          key={profession}
                          type="button"
                          role="radio"
                          aria-checked={formData.profession === profession}
                          className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                            formData.profession === profession
                              ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, profession }))}
                        >
                          {profession}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="customer_location" className="text-xs font-medium text-gray-600">Location</Label>
                    <Select value={formData.customer_location} onValueChange={(value) => setFormData(prev => ({ ...prev, customer_location: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {chennaiLocations.map((location) => (
                          <SelectItem key={location} value={location}>{location}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="Or type a location"
                      value={formData.customer_location}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_location: e.target.value }))}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Purchase Planning Card */}
              <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-orange-100/80 rounded-lg backdrop-blur-sm">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Purchase Planning</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Buying Plan *</Label>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Buying Plan options">
                          {buyingPlan.map((plan) => (
                        <button
                          key={plan}
                          type="button"
                          role="radio"
                          aria-checked={formData.buying_plan === plan}
                          className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                            formData.buying_plan === plan
                              ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, buying_plan: plan }))}
                        >
                          {plan}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Finance Options Card */}
              <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-emerald-100/80 rounded-lg backdrop-blur-sm">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Finance Options</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Finance Option *</Label>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Finance Option options">
                          {financeOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={formData.finance_option === option}
                          className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                            formData.finance_option === option
                              ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, finance_option: option }))}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Drive Card */}
              <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-cyan-100/80 rounded-lg backdrop-blur-sm">
                    <Car className="h-4 w-4 text-cyan-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Test Drive</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Test Drive Type</Label>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Test Drive Type options">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={formData.test_drive_type === "No"}
                        className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                          formData.test_drive_type === "No"
                            ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                        onClick={() => setFormData(prev => ({ 
                        ...prev, 
                          test_drive_type: "No",
                          test_drive: false
                        }))}
                      >
                        No
                      </button>
                          {testDriveOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={formData.test_drive_type === option}
                          className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                            formData.test_drive_type === option
                              ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            test_drive_type: option,
                            test_drive: true
                          }))}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade In Card */}
              <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-violet-100/80 rounded-lg backdrop-blur-sm">
                    <Car className="h-4 w-4 text-violet-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Trade In</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Trade In</Label>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Trade In options">
                          {tradeInOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={formData.trade_in === option}
                          className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                            formData.trade_in === option
                              ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, trade_in: option }))
                            if (option === "Yes") setIsTradeInDialogOpen(true)
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Follow Up Card */}
              <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-indigo-100/80 rounded-lg backdrop-blur-sm">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Follow Up</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="follow_up_date" className="text-xs font-medium text-gray-600">Follow Up Date *</Label>
                    <Input 
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                      className="h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Remarks *</Label>
                    <Textarea
                      placeholder="Add qualification/notes"
                      value={formData.general_remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, general_remarks: e.target.value }))}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Category Card */}
              <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-amber-100/80 rounded-lg backdrop-blur-sm">
                    <User className="h-4 w-4 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Lead Category</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Lead Category</Label>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Lead Category options">
                          {leadCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          role="radio"
                          aria-checked={formData.lead_category === category}
                          className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                            formData.lead_category === category
                              ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, lead_category: category }))}
                        >
                          {category === 'Hot' && <Flame className="h-3 w-3" />}
                          {category === 'Warm' && <Thermometer className="h-3 w-3" />}
                          {category === 'Cold' && <Snowflake className="h-3 w-3" />}
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* History Button Card - Apple Magnus Blue Design */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/90 to-indigo-50/70 rounded-xl border border-blue-200/30 shadow-lg backdrop-blur-sm">
                {/* Apple Magnus glassy effect layers */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                <div className="absolute inset-0 backdrop-filter backdrop-blur-[4px]"></div>
                
                <div className="relative p-5">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-blue-100/80 rounded-lg backdrop-blur-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">History</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <button
                        type="button"
                        className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px] w-full justify-center transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 bg-gradient-to-br from-blue-50/90 to-blue-100/70 text-blue-800 border border-blue-200/30 shadow-lg backdrop-blur-[6px] hover:shadow-xl"
                        onClick={() => {
                          // Add history functionality here
                          console.log('History button clicked')
                        }}
                      >
                        {/* Apple Magnus glassy effect layers */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                        <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                        
                        <span className="relative z-10 flex items-center gap-2">
                          <div className="p-1 bg-blue-100/80 rounded-lg backdrop-blur-sm">
                            <Clock className="h-4 w-4 text-blue-600" />
                          </div>
                          View Call History
                          <ChevronDown className="h-4 w-4 text-blue-600" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unqualified Section */}
          {selectedStatus === "unqualified" && (
            <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-red-100/80 rounded-lg backdrop-blur-sm">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-sm font-semibold text-red-800">Lead Lost Reason</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-2 block">Reason for Loss</Label>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Lost Reason options">
                      {lostReasons.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        role="radio"
                        aria-checked={formData.lost_reason === reason}
                        className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                          formData.lost_reason === reason
                            ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, lost_reason: reason }))}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-2 block">Remarks *</Label>
                  <Textarea
                    placeholder="Add reason/remark for loss"
                    value={formData.general_remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, general_remarks: e.target.value }))}
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center space-x-2 p-3 bg-red-50/80 rounded-lg border border-red-200/40">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-xs text-red-700 font-medium">
                    Lead will be marked as lost and moved to won/lost leads section after update.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pending Section */}
          {selectedStatus === "pending" && (
            <div className="space-y-4">
              <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-amber-100/80 rounded-lg backdrop-blur-sm">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-amber-800">Pending Reason</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Pending Status</Label>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pending Reason options">
                        {pendingReasons.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          role="radio"
                          aria-checked={formData.pending_reason === reason}
                          className={`rounded-full px-3 py-2 text-sm border min-h-[44px] inline-flex items-center gap-2 transition-all duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                            formData.pending_reason === reason
                              ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, pending_reason: reason }))
                            setSelectedStatus("pending") // Auto-set status to pending when reason is selected
                          }}
                        >
                          {reason}
                        </button>
                      ))}
                  </div>
                  
                  {/* Pending Reason Remark Input */}
                  <div>
                    <Label htmlFor="pending_remark" className="text-xs font-medium text-gray-600 mb-2 block">
                      Remark for Pending Reason *
                    </Label>
                    <Textarea
                      id="pending_remark"
                      placeholder="Enter detailed remark for this pending reason..."
                      value={formData.general_remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, general_remarks: e.target.value }))}
                      className="min-h-[80px] text-sm"
                      required
                    />
                  </div>
                  </div>
                </div>
              </div>

              {/* Follow Up Date - Required for ALL pending reasons */}
              {selectedStatus === "pending" && (
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-blue-100/80 rounded-lg backdrop-blur-sm">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-blue-800">Follow Up Details</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="follow_up_date" className="text-xs font-medium text-gray-600">Follow Up Date *</Label>
                      <Input 
                        type="date"
                        value={formData.follow_up_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                        className="h-10 text-sm"
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        Lead will be moved to the correct follow-up section after update.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sticky Action Buttons */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-4 -mx-6 -mb-6">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 min-h-[44px] bg-gradient-to-br from-gray-50/90 to-gray-100/70 text-gray-700 border border-gray-200/30 backdrop-blur-[6px] ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}`}
                aria-label="Close modal"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                <span className="relative z-10">Close</span>
              </button>
              
            {!(lead.lead_status === "Won" || lead.lead_status === "Lost") && (
                <button
                onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 min-h-[44px] backdrop-blur-[6px] ${
                    selectedStatus === "unqualified" 
                      ? "bg-gradient-to-br from-red-100/90 to-red-200/70 text-red-800 border border-red-300/30 shadow-md" 
                      : selectedStatus === "pending" 
                      ? "bg-gradient-to-br from-amber-100/90 to-amber-200/70 text-amber-800 border border-amber-300/30 shadow-md"
                      : "bg-gradient-to-br from-blue-100/90 to-blue-200/70 text-blue-800 border border-blue-300/30 shadow-md"
                  } ${isSubmitting ? 'opacity-70 cursor-wait' : 'hover:shadow-lg'}`}
                  aria-label={
                    lead.lead_status === "Qualified" ? "Save Follow-up" :
                    selectedStatus === "qualified" ? "Qualify Lead" :
                    selectedStatus === "unqualified" ? "Mark as Lost" :
                    selectedStatus === "pending" ? "Mark as Pending" :
                    "Update Lead"
                  }
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
                  <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    {isSubmitting && (
                      <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
                    )}
                    {isSubmitting
                      ? (selectedStatus === 'qualified' ? 'Qualifying...' :
                         selectedStatus === 'unqualified' ? 'Saving...' :
                         selectedStatus === 'pending' ? 'Saving...' : 'Saving...')
                      : (lead.lead_status === 'Qualified' ? 'Save Follow-up' :
                         selectedStatus === 'qualified' ? 'Qualify Lead' :
                         selectedStatus === 'unqualified' ? 'Mark as Lost' :
                         selectedStatus === 'pending' ? 'Mark as Pending' :
                         'Update Lead')}
                  </span>
                </button>
            )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {/* Trade-in Popup */}
    <Dialog open={isTradeInDialogOpen} onOpenChange={setIsTradeInDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trade In Vehicle Details</DialogTitle>
          <DialogDescription>
            Enter details about the trade-in vehicle
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label htmlFor="trade_in_make" className="text-sm font-medium mb-2 block">Make *</Label>
              <SearchableSelect
                value={formData.trade_in_make}
                onValueChange={(value) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    trade_in_make: value,
                    trade_in_model: "" // Reset model when make changes
                  }))
                }}
                placeholder="Select Vehicle Make"
                options={Object.keys(CAR_DATA)}
                searchPlaceholder="Search makes..."
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="trade_in_model" className="text-sm font-medium mb-2 block">Model *</Label>
              <Select 
                value={formData.trade_in_model} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, trade_in_model: value }))}
                disabled={!formData.trade_in_make}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Vehicle Model" />
                </SelectTrigger>
                <SelectContent>
                  {formData.trade_in_make && CAR_DATA[formData.trade_in_make as keyof typeof CAR_DATA]?.map((model) => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label htmlFor="trade_in_year" className="text-sm font-medium mb-2 block">Year *</Label>
              <Input 
                type="text"
                placeholder="Manufacturing Year (e.g., 2020)"
                value={formData.trade_in_year}
                onChange={(e) => {
                  let value = e.target.value
                  
                  // Only allow digits
                  value = value.replace(/\D/g, '')
                  
                  // Limit to 4 digits maximum
                  if (value.length > 4) {
                    value = value.slice(0, 4)
                  }
                  
                  setFormData(prev => ({ ...prev, trade_in_year: value }))
                  
                  // Clear validation error when user types
                  if (validationErrors.trade_in_year) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.trade_in_year
                      return newErrors
                    })
                  }
                }}
                className={validationErrors.trade_in_year ? "border-red-500" : ""}
                maxLength={4}
              />
              {validationErrors.trade_in_year && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.trade_in_year}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="trade_in_km" className="text-sm font-medium mb-2 block">KM Driven *</Label>
              <Input 
                type="number"
                placeholder="KM Driven (0-1,000,000)"
                value={formData.trade_in_km}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, trade_in_km: e.target.value }))
                  // Clear validation error when user types
                  if (validationErrors.trade_in_km) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.trade_in_km
                      return newErrors
                    })
                  }
                }}
                className={validationErrors.trade_in_km ? "border-red-500" : ""}
              />
              {validationErrors.trade_in_km && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.trade_in_km}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="trade_in_ownership" className="text-sm font-medium mb-2 block">Ownership Type *</Label>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsTradeInDialogOpen(false)}>Close</Button>
            <Button onClick={() => setIsTradeInDialogOpen(false)} className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </div>
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
                <div className="text-sm font-semibold text-gray-900">{lead?.trade_in_make || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Model</div>
                <div className="text-sm font-semibold text-gray-900">{lead?.trade_in_model || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Year</div>
                <div className="text-sm font-semibold text-gray-900">{lead?.trade_in_year || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">KM Driven</div>
                <div className="text-sm font-semibold text-gray-900">{lead?.trade_in_km ? `${lead.trade_in_km} km` : 'Not specified'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500 mb-1">Ownership</div>
                <div className="text-sm font-semibold text-gray-900">
                  {lead?.trade_in_ownership === 'first' ? 'First Owner' :
                   lead?.trade_in_ownership === 'second' ? 'Second Owner' :
                   lead?.trade_in_ownership === 'third' ? 'Third Owner' :
                   lead?.trade_in_ownership === 'more' ? 'More than 3 Owners' :
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
