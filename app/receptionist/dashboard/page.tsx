'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Phone,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  User,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast, Toaster } from 'sonner'

interface LeadCaptureFormData {
  customer_name: string
  customer_mobile_number: string
  profession: string
  source: string
  sub_source: string
  interested_model: string
  variant: string
  purchase_timeline: string
  ps_id: string
  ps_name: string
  branch: string
  allow_duplicate: boolean
}

interface Stats {
  today: number
  this_week: number
  this_month: number
  by_source: { [key: string]: number }
  by_model: { [key: string]: number }
  by_ps: { [key: string]: number }
}

interface RecentCapture {
  lead_uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  interested_model: string
  ps_name: string
  created_at: string
  time_ago: string
}

interface DuplicateCheck {
  isDuplicate: boolean
  existingLead?: {
    lead_uid: string
    customer_name: string
    customer_mobile_number: string
    created_at: string
    ps_name: string
    source: string
    branch: string
  }
}

interface PSUser {
  id: string
  username: string
  email: string
  full_name: string
}

// Source options for digital leads
const SOURCE_OPTIONS: { [key: string]: string[] } = {
  "Google": ["Web", "Tele In", "GMB Tele In"],
  "WhatsApp": ["Tele In", "Bulk Message"],
  "Car Dekho": ["CD B", "CD G"],
  "Car Wale": ["CWA", "CWB", "CWC", "CWG", "CWH", "CWK"],
  "OEM": ["Dealer CMS", "TKM"],
  "Meta": ["Web"],
  "Tele Out": ["Web"],
  "Referral": [],
  "Other": []
}

// Toyota models and variants
const TOYOTA_MODELS: { [key: string]: string[] } = {
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

// Purchase timeline options (same as CRE form)
const PURCHASE_TIMELINE = [
  "Immediate",
  "Within 1 week",
  "1-2 weeks",
  "2-4 weeks",
  "1-3 months",
  "3-6 months",
  "6+ months"
]

// Profession options (same as CRE form)
const PROFESSION_OPTIONS = [
  "Business",
  "Salaried",
  "Professional",
  "Government Employee",
  "Self Employed",
  "Student",
  "Retired",
  "Housewife",
  "Other"
]

export default function ReceptionistDashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentCaptures, setRecentCaptures] = useState<RecentCapture[]>([])
  const [psUsers, setPsUsers] = useState<PSUser[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<LeadCaptureFormData>({
    customer_name: '',
    customer_mobile_number: '',
    profession: '',
    source: 'Walk-in',
    sub_source: '',
    interested_model: '',
    variant: '',
    purchase_timeline: '',
    ps_id: '',
    ps_name: '',
    branch: '',
    allow_duplicate: false
  })

  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheck | null>(null)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)

  // Load user data from localStorage
  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      try {
        const userData = JSON.parse(supabaseUser)
        console.log("✅ Receptionist dashboard loaded for user:", userData)
        
        // Extract branch from username if not present in userData
        if (!userData.branch && userData.username) {
          // Extract branch from username (e.g., "reception_cuddalore" -> "Cuddalore")
          const username = userData.username
          if (username.startsWith('reception_')) {
            const branchName = username.replace('reception_', '').replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            userData.branch = branchName
          }
        }
        
        setUser(userData)
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }
  }, [])

  // Load initial data
  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user || user.role !== 'receptionist') {
      console.error('User is not authenticated as receptionist')
      return
    }

    setLoading(true)
    try {
      console.log('Loading receptionist dashboard data for:', user.branch)

      // Load stats
      const statsResponse = await fetch('/api/receptionist/stats', {
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('Stats loaded:', statsData)
        setStats(statsData)
      } else {
        console.error('Failed to load stats:', statsResponse.status, statsResponse.statusText)
      }

      // Load recent captures
      await loadRecentCaptures()

      // Load PS users for branch
      const psResponse = await fetch('/api/receptionist/ps-users', {
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      })
      if (psResponse.ok) {
        const psData = await psResponse.json()
        console.log('PS users loaded:', psData.length)
        setPsUsers(psData)
      } else {
        console.error('Failed to load PS users:', psResponse.status, psResponse.statusText)
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Separate function to load only recent captures
  const loadRecentCaptures = async () => {
    if (!user || user.role !== 'receptionist') {
      return
    }

    try {
      const recentResponse = await fetch('/api/receptionist/recent-captures?limit=10', {
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      })
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        console.log('Recent captures refreshed:', recentData.length)
        setRecentCaptures(recentData)
      } else {
        console.error('Failed to load recent captures:', recentResponse.status, recentResponse.statusText)
      }
    } catch (error) {
      console.error('Error loading recent captures:', error)
    }
  }

  // Separate function to load only stats
  const loadStats = async () => {
    if (!user || user.role !== 'receptionist') {
      return
    }

    try {
      const statsResponse = await fetch('/api/receptionist/stats', {
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('Stats refreshed:', statsData)
        setStats(statsData)
      } else {
        console.error('Failed to load stats:', statsResponse.status, statsResponse.statusText)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Check for duplicate mobile number
  const checkDuplicate = async (mobile: string) => {
    if (!mobile || mobile.length !== 10) {
      setDuplicateCheck(null)
      setShowDuplicateWarning(false)
      return
    }

    try {
      const response = await fetch(`/api/receptionist/check-duplicate?mobile=${mobile}`, {
        headers: { 'Authorization': `Bearer ${user?.access_token}` }
      })
      if (response.ok) {
        const result = await response.json()
        setDuplicateCheck(result)
        setShowDuplicateWarning(result.isDuplicate)
      }
    } catch (error) {
      console.error('Error checking duplicate:', error)
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return

    setSubmitting(true)
    try {
      // Add branch to form data before sending
      const formDataWithBranch = {
        ...formData,
        branch: user?.branch || 'Mount Road' // Default to Mount Road if not set
      }
      
      const response = await fetch('/api/receptionist/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify(formDataWithBranch)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Lead captured successfully! Lead ID: ${result.lead_uid}`)

        // Reset form
        setFormData({
          customer_name: '',
          customer_mobile_number: '',
          profession: '',
          source: 'Walk-in',
          sub_source: '',
          interested_model: '',
          variant: '',
          purchase_timeline: '',
          ps_id: '',
          ps_name: '',
          branch: '',
          allow_duplicate: false
        })
        setDuplicateCheck(null)
        setShowDuplicateWarning(false)

        // Refresh both recent captures and stats for real-time updates
        await loadRecentCaptures()
        await loadStats()
      } else if (response.status === 409) {
        const error = await response.json()
        toast.error(error.detail || 'Duplicate mobile number')
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to capture lead')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('Failed to capture lead')
    } finally {
      setSubmitting(false)
    }
  }

  // Form validation
  const validateForm = () => {
    if (!formData.customer_name.trim()) {
      toast.error('Customer name is required')
      return false
    }
    if (!formData.customer_mobile_number || formData.customer_mobile_number.length !== 10) {
      toast.error('Valid 10-digit mobile number is required')
      return false
    }
    if (formData.source === 'Digital' && !formData.sub_source) {
      toast.error('Sub source is required for digital leads')
      return false
    }
    if (!formData.interested_model) {
      toast.error('Interested model is required')
      return false
    }
    if (!formData.variant) {
      toast.error('Variant is required')
      return false
    }
    if (!formData.purchase_timeline) {
      toast.error('Purchase timeline is required')
      return false
    }
    if (!formData.ps_id) {
      toast.error('PS assignment is required')
      return false
    }
    return true
  }

  // Handle mobile number change
  const handleMobileChange = (value: string) => {
    setFormData(prev => ({ ...prev, customer_mobile_number: value }))
    if (value.length === 10) {
      checkDuplicate(value)
    } else {
      setDuplicateCheck(null)
      setShowDuplicateWarning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" richColors duration={2000} closeButton />
      <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Receptionist Dashboard - {user?.branch || 'Branch'}
            </h1>
            <p className="text-gray-600 mt-2">
              Capture walk-in and digital leads for your branch
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                {/* Today's Stats */}
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center text-gray-700">
                      <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mr-3">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      Today's Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                      {stats?.today || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Leads captured today</p>
                  </CardContent>
                </Card>

                {/* This Week */}
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center text-gray-700">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mr-3">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                      {stats?.this_week || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Leads this week</p>
                  </CardContent>
                </Card>

                {/* Source Breakdown */}
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700">By Source</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats?.by_source && Object.entries(stats.by_source).map(([source, count]) => (
                      <div key={source} className="flex justify-between items-center py-1">
                        <span className="text-sm text-gray-600">{source}</span>
                        <Badge 
                          variant="secondary" 
                          className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-0 rounded-full px-3"
                        >
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="capture" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm shadow-md border-0 p-1 rounded-2xl">
                  <TabsTrigger 
                    value="capture" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-xl transition-all duration-300"
                  >
                    Capture New Lead
                  </TabsTrigger>
                  <TabsTrigger 
                    value="recent"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-xl transition-all duration-300"
                  >
                    Recent Captures
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="capture" className="mt-6">
                  <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-gray-100">
                      <CardTitle className="flex items-center text-xl">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mr-3">
                          <Plus className="h-5 w-5 text-white" />
                        </div>
                        Capture New Lead
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      {/* Duplicate Warning */}
                      {showDuplicateWarning && duplicateCheck?.existingLead && (
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-400 rounded-2xl shadow-md">
                          <div className="flex items-start">
                            <div className="p-2 bg-orange-400 rounded-xl mr-3">
                              <AlertTriangle className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-orange-800">
                                Duplicate Mobile Number Detected
                              </h3>
                              <p className="text-sm text-orange-700 mt-1">
                                This mobile number already exists in the system:
                              </p>
                              <div className="mt-3 p-3 bg-white/60 rounded-2xl text-sm text-gray-700 space-y-1">
                                <p><strong>Lead ID:</strong> {duplicateCheck.existingLead.lead_uid}</p>
                                <p><strong>Customer:</strong> {duplicateCheck.existingLead.customer_name}</p>
                                <p><strong>PS:</strong> {duplicateCheck.existingLead.ps_name}</p>
                                <p><strong>Source:</strong> {duplicateCheck.existingLead.source}</p>
                                <p><strong>Captured:</strong> {new Date(duplicateCheck.existingLead.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="mt-4 flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowDuplicateWarning(false)}
                                  className="border-gray-300 hover:bg-gray-100 rounded-xl"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, allow_duplicate: true }))
                                    setShowDuplicateWarning(false)
                                  }}
                                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 rounded-xl"
                                >
                                  Continue Anyway
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Customer Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <User className="h-4 w-4 mr-2 text-orange-500" />
                            Customer Name *
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                            value={formData.customer_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                            placeholder="Enter customer name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-orange-500" />
                            Mobile Number *
                          </label>
                          <input
                            type="tel"
                            className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                            value={formData.customer_mobile_number}
                            onChange={(e) => handleMobileChange(e.target.value)}
                            placeholder="10-digit mobile number"
                            maxLength={10}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Profession</label>
                        <select
                          className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                          value={formData.profession}
                          onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                        >
                          <option value="">Select profession (optional)</option>
                          {PROFESSION_OPTIONS.map(profession => (
                            <option key={profession} value={profession}>{profession}</option>
                          ))}
                        </select>
                      </div>

                      {/* Source Selection */}
                      <div className="space-y-4">
                        <label className="text-sm font-semibold text-gray-700">Source *</label>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex items-center p-4 bg-blue-50/50 border-2 border-blue-100 rounded-2xl cursor-pointer hover:bg-blue-100/50 transition-all duration-300 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                            <input
                              type="radio"
                              name="source"
                              value="Walk-in"
                              checked={formData.source === 'Walk-in'}
                              onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value, sub_source: '' }))}
                              className="mr-3 w-4 h-4 text-orange-500 focus:ring-orange-500"
                            />
                            <span className="font-medium text-gray-700">Walk-in</span>
                          </label>
                          <label className="flex items-center p-4 bg-blue-50/50 border-2 border-blue-100 rounded-2xl cursor-pointer hover:bg-blue-100/50 transition-all duration-300 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                            <input
                              type="radio"
                              name="source"
                              value="Digital"
                              checked={formData.source === 'Digital'}
                              onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value, sub_source: '' }))}
                              className="mr-3 w-4 h-4 text-orange-500 focus:ring-orange-500"
                            />
                            <span className="font-medium text-gray-700">Digital</span>
                          </label>
                        </div>
                      </div>

                      {/* Digital Source Sub-fields */}
                      {formData.source === 'Digital' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Digital Source *</label>
                            <select
                              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                              value={formData.sub_source.split(' - ')[0] || ''}
                              onChange={(e) => {
                                const source = e.target.value
                                const subSource = SOURCE_OPTIONS[source]?.[0] || ''
                                setFormData(prev => ({ ...prev, sub_source: `${source} - ${subSource}` }))
                              }}
                            >
                              <option value="">Select digital source</option>
                              {Object.keys(SOURCE_OPTIONS).map(source => (
                                <option key={source} value={source}>{source}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Sub Source *</label>
                            <select
                              className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                              value={formData.sub_source.split(' - ')[1] || ''}
                              onChange={(e) => {
                                const [source] = formData.sub_source.split(' - ')
                                setFormData(prev => ({ ...prev, sub_source: `${source} - ${e.target.value}` }))
                              }}
                            >
                              <option value="">Select sub source</option>
                              {formData.sub_source.split(' - ')[0] && SOURCE_OPTIONS[formData.sub_source.split(' - ')[0]]?.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Model and Variant */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Model Interested *</label>
                          <select
                            className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                            value={formData.interested_model}
                            onChange={(e) => setFormData(prev => ({ ...prev, interested_model: e.target.value, variant: '' }))}
                          >
                            <option value="">Select model</option>
                            {Object.keys(TOYOTA_MODELS).map(model => (
                              <option key={model} value={model}>{model}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Variant *</label>
                          <select
                            className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                            value={formData.variant}
                            onChange={(e) => setFormData(prev => ({ ...prev, variant: e.target.value }))}
                            disabled={!formData.interested_model}
                          >
                            <option value="">Select variant</option>
                            {formData.interested_model && TOYOTA_MODELS[formData.interested_model]?.map(variant => (
                              <option key={variant} value={variant}>{variant}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Purchase Timeline *</label>
                        <select
                          className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                          value={formData.purchase_timeline}
                          onChange={(e) => setFormData(prev => ({ ...prev, purchase_timeline: e.target.value }))}
                        >
                          <option value="">Select timeline</option>
                          {PURCHASE_TIMELINE.map(timeline => (
                            <option key={timeline} value={timeline}>{timeline}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Assign to PS *</label>
                        <select
                          className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                          value={formData.ps_id}
                          onChange={(e) => {
                            const selectedPS = psUsers.find(ps => ps.id === e.target.value)
                            setFormData(prev => ({
                              ...prev,
                              ps_id: e.target.value,
                              ps_name: selectedPS?.full_name || ''
                            }))
                          }}
                        >
                          <option value="">Select PS</option>
                          {psUsers.map(ps => (
                            <option key={ps.id} value={ps.id}>{ps.full_name} ({ps.username})</option>
                          ))}
                        </select>
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFormData({
                              customer_name: '',
                              customer_mobile_number: '',
                              profession: '',
                              source: 'Walk-in',
                              sub_source: '',
                              interested_model: '',
                              variant: '',
                              purchase_timeline: '',
                              ps_id: '',
                              ps_name: '',
                              branch: '',
                              allow_duplicate: false
                            })
                            setDuplicateCheck(null)
                            setShowDuplicateWarning(false)
                          }}
                          className="px-6 border-2 border-gray-300 hover:bg-gray-100 rounded-2xl"
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="px-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 min-w-[140px]"
                        >
                          {submitting ? (
                            <span className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                              Submitting...
                            </span>
                          ) : (
                            'Submit Lead'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recent" className="mt-6">
                  <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-gray-100">
                      <CardTitle className="flex items-center text-xl">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mr-3">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        Recent Captures
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {recentCaptures.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-lg">No recent captures</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recentCaptures.map((capture) => (
                            <div 
                              key={capture.lead_uid} 
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/50 to-orange-50/50 border border-gray-100 rounded-2xl hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Badge 
                                    variant={capture.source === 'Walk-in' ? 'default' : 'secondary'}
                                    className={`${capture.source === 'Walk-in' 
                                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0' 
                                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0'
                                    } rounded-full px-3`}
                                  >
                                    {capture.source}
                                  </Badge>
                                  <span className="font-semibold text-gray-800">{capture.customer_name}</span>
                                </div>
                                <div className="text-sm text-gray-600 flex items-center">
                                  <span className="mr-2">📱 {capture.customer_mobile_number}</span>
                                  <span className="mx-2">•</span>
                                  <span className="mr-2">{capture.interested_model}</span>
                                  <span className="mx-2">•</span>
                                  <span>👤 {capture.ps_name}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-orange-600">{capture.time_ago}</div>
                                <div className="text-xs text-gray-500 mt-1 font-mono">{capture.lead_uid}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
    </>
  )
}
