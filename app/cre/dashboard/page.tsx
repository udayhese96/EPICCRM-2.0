"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  BarChart3, 
  Star,
  Calendar,
  Users,
  Trophy,
  AlertCircle,
  Search,
  X,
  Phone,
  User
} from "lucide-react"
import { useState, useEffect } from "react"
import { LeadUpdateModal } from "./components/lead-update-modal"

interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  name?: string
  role: string
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
  lead_category?: "Hot" | "Warm" | "Cold"
  follow_up_date?: string // ISO yyyy-mm-dd
  pending_reason?: string
  followup_count?: number // 0..5
  call_logs?: { date: string; outcome: string; remarks: string }[]
  customer_email?: string
  customer_location?: string
  remarks?: string
}

export default function CREDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [activeTab, setActiveTab] = useState<string>("fresh")
  const [activeStatus, setActiveStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [pendingCategory, setPendingCategory] = useState<"all" | "Hot" | "Warm" | "Cold">("all")

  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      setUser(JSON.parse(supabaseUser))
    }
    
    // Load sample leads - in real app, fetch from database
    setLeads([
      {
        id: "1",
        uid: "MK-6742-3632",
        customer_name: "Mohd kaleemuddin",
        customer_mobile_number: "9133716742",
        source: "META",
        campaign: "Scratch And Win",
        date: "2025-09-12",
        lead_status: "Fresh",
        lead_category: "Warm",
        followup_count: 0,
        customer_email: "mohd@example.com"
      },
      {
        id: "2", 
        uid: "MU-0460-3649",
        customer_name: "Nani Nani",
        customer_mobile_number: "9618140460",
        source: "META",
        campaign: "New 450x Video",
        date: "2025-09-12",
        lead_status: "Fresh",
        lead_category: "Hot",
        followup_count: 0
      },
      {
        id: "3",
        uid: "AB-1234-5678",
        customer_name: "John Smith",
        customer_mobile_number: "9876543210",
        source: "Website",
        campaign: "Test Drive",
        date: "2025-09-11",
        lead_status: "Called",
        lead_category: "Cold",
        followup_count: 0
      },
      {
        id: "4",
        uid: "CD-5678-9012",
        customer_name: "Jane Doe",
        customer_mobile_number: "8765432109",
        source: "Referral",
        campaign: "Referral Program",
        date: "2025-09-10",
        lead_status: "Follow Up",
        lead_category: "Hot",
        followup_count: 0,
        follow_up_date: new Date().toISOString().slice(0,10)
      },
      {
        id: "5",
        uid: "EF-9012-3456",
        customer_name: "Mike Johnson",
        customer_mobile_number: "7654321098",
        source: "META",
        campaign: "New Campaign",
        date: "2025-09-09",
        lead_status: "Qualified",
        lead_category: "Warm",
        followup_count: 1,
        follow_up_date: new Date().toISOString().slice(0,10),
        call_logs: [
          { date: new Date().toISOString().slice(0,10), outcome: "Connected", remarks: "Initial qualification done" }
        ]
      }
    ])
  }, [])

  const handleUpdateLead = (leadData: any) => {
    console.log("Updating lead:", leadData)
    // In real app, send to backend API
    // Update leads state or refetch data
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadData.leadId 
          ? {
              ...lead,
              lead_status: leadData.lead_status || lead.lead_status,
              updated_at: leadData.updated_at,
              follow_up_date: leadData.follow_up_date ?? lead.follow_up_date,
              followup_count: leadData.followup_count ?? lead.followup_count,
              call_logs: leadData.call_status || leadData.general_remarks
                ? [
                    ...(lead.call_logs || []),
                    {
                      date: (leadData.follow_up_date || new Date().toISOString().slice(0,10)),
                      outcome: leadData.call_status || "",
                      remarks: leadData.general_remarks || ""
                    }
                  ]
                : (lead.call_logs || [])
            }
          : lead
      )
    )

    // After update, route the view to the correct tab
    const newStatus = leadData.lead_status
    if (newStatus === "Qualified") {
      setActiveTab("qualified")
      setPendingCategory("all")
      setActiveStatus("all")
    } else if (newStatus === "Pending") {
      setActiveTab("pending")
      setPendingCategory("all")
      setActiveStatus("all")
    } else if (newStatus === "Lost" || newStatus === "Won") {
      setActiveTab("wonlost")
      setActiveStatus("all")
    }
  }

  const openUpdateModal = (lead: Lead) => {
    setSelectedLead(lead)
    setIsUpdateModalOpen(true)
  }

  // Filter leads based on active tab and status
  const getFilteredLeads = () => {
    let filteredLeads = leads

    // Filter by tab
    switch (activeTab) {
      case "fresh":
        filteredLeads = leads.filter(lead => 
          ["Fresh", "Called", "Follow Up"].includes(lead.lead_status)
        )
        break
      case "followup":
        {
          const today = new Date().toISOString().slice(0,10)
          filteredLeads = leads.filter(lead => lead.follow_up_date === today)
        }
        break
      case "pending":
        filteredLeads = leads.filter(lead => {
          const isQualified = lead.lead_status === "Qualified"
          const isCallMeBack = lead.lead_status === "Pending" && lead.pending_reason === "Call me back"
          return isQualified || isCallMeBack
        })
        if (pendingCategory !== "all") {
          filteredLeads = filteredLeads.filter(lead => lead.lead_category === pendingCategory)
        }
        break
      case "qualified":
        filteredLeads = leads.filter(lead => lead.lead_status === "Qualified")
        break
      case "wonlost":
        filteredLeads = leads.filter(lead => 
          ["Won", "Lost"].includes(lead.lead_status)
        )
        break
      case "events":
        filteredLeads = leads.filter(lead => lead.source === "Event")
        break
      default:
        filteredLeads = leads
    }

    // Filter by status within tab
    if (activeStatus !== "all") {
      filteredLeads = filteredLeads.filter(lead => lead.lead_status === activeStatus)
    }

    // Filter by search term
    if (searchTerm) {
      filteredLeads = filteredLeads.filter(lead => 
        lead.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_mobile_number.includes(searchTerm)
      )
    }

    return filteredLeads
  }

  const getTabCounts = () => {
    const today = new Date().toISOString().slice(0,10)
    return {
      fresh: leads.filter(lead => ["Fresh", "Called", "Follow Up"].includes(lead.lead_status)).length,
      followup: leads.filter(lead => lead.follow_up_date === today).length,
      pending: leads.filter(lead => (lead.lead_status === "Qualified") || (lead.lead_status === "Pending" && lead.pending_reason === "Call me back")).length,
      qualified: leads.filter(lead => lead.lead_status === "Qualified").length,
      wonlost: leads.filter(lead => ["Won", "Lost"].includes(lead.lead_status)).length,
      events: leads.filter(lead => lead.source === "Event").length
    }
  }

  const getStatusCounts = () => {
    const freshLeads = leads.filter(lead => ["Fresh", "Called", "Follow Up"].includes(lead.lead_status))
    return {
      untouched: freshLeads.filter(lead => lead.lead_status === "Fresh").length,
      called: freshLeads.filter(lead => lead.lead_status === "Called").length,
      followup: freshLeads.filter(lead => lead.lead_status === "Follow Up").length
    }
  }

  const userName = user?.first_name || user?.name || user?.username || "Kumari"
  const filteredLeads = getFilteredLeads()
  const tabCounts = getTabCounts()
  const statusCounts = getStatusCounts()

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <User className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>CRE Dashboard</h1>
                <p className="text-gray-600" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>Welcome back, {userName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => window.location.assign('/leads/add')} style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
            <Button variant="outline" onClick={() => window.location.assign('/analytics')} style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="ghost" className="text-red-600" onClick={() => { localStorage.clear(); window.location.assign('/auth/login') }} style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>Sign Out</Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="bg-blue-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>Fresh Leads</p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>{tabCounts.fresh}</p>
                    <div className="flex items-center space-x-1 mt-2">
                      <Badge variant="secondary" className="bg-blue-600 text-white text-xs">{statusCounts.untouched}</Badge>
                      <Badge variant="secondary" className="bg-blue-400 text-white text-xs">{statusCounts.called}</Badge>
                      <Badge variant="secondary" className="bg-blue-600 text-white text-xs">{statusCounts.followup}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-amber-100 text-sm">Today's Follow-ups</p>
                  <p className="text-3xl font-bold">{tabCounts.followup}</p>
                  <Calendar className="h-6 w-6 mx-auto mt-2 text-amber-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-teal-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-teal-100 text-sm">Pending Leads</p>
                  <p className="text-3xl font-bold">{tabCounts.pending}</p>
                  <AlertCircle className="h-6 w-6 mx-auto mt-2 text-teal-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-600 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-emerald-100 text-sm">Qualified Leads</p>
                  <p className="text-3xl font-bold">{tabCounts.qualified}</p>
                  <Users className="h-6 w-6 mx-auto mt-2 text-emerald-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-600 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-green-100 text-sm">Won Leads</p>
                  <p className="text-3xl font-bold">{tabCounts.wonlost}</p>
                  <Trophy className="h-6 w-6 mx-auto mt-2 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-500 text-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-red-100 text-sm">Lost Leads</p>
                  <p className="text-3xl font-bold">{tabCounts.wonlost}</p>
                  <X className="h-6 w-6 mx-auto mt-2 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={activeTab === "fresh" ? "default" : "outline"}
              className={activeTab === "fresh" ? "bg-gray-900 text-white" : ""}
              onClick={() => setActiveTab("fresh")}
            >
              <Star className="h-4 w-4 mr-2" />
              Fresh Leads ({tabCounts.fresh})
            </Button>
            <Button 
              variant={activeTab === "followup" ? "default" : "outline"}
              className={activeTab === "followup" ? "bg-gray-900 text-white" : ""}
              onClick={() => setActiveTab("followup")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Today's Follow-ups ({tabCounts.followup})
            </Button>
            <Button 
              variant={activeTab === "pending" ? "default" : "outline"}
              className={activeTab === "pending" ? "bg-gray-900 text-white" : ""}
              onClick={() => setActiveTab("pending")}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Pending Leads ({tabCounts.pending})
            </Button>
            <Button 
              variant={activeTab === "qualified" ? "default" : "outline"}
              className={activeTab === "qualified" ? "bg-gray-900 text-white" : ""}
              onClick={() => setActiveTab("qualified")}
            >
              <Users className="h-4 w-4 mr-2" />
              Qualified Leads ({tabCounts.qualified})
            </Button>
            <Button 
              variant={activeTab === "wonlost" ? "default" : "outline"}
              className={activeTab === "wonlost" ? "bg-gray-900 text-white" : ""}
              onClick={() => setActiveTab("wonlost")}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Won/Lost Leads ({tabCounts.wonlost})
            </Button>
            <Button 
              variant={activeTab === "events" ? "default" : "outline"}
              className={activeTab === "events" ? "bg-gray-900 text-white" : ""}
              onClick={() => setActiveTab("events")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Event Leads ({tabCounts.events})
            </Button>
          </div>

          {/* Dynamic Leads Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {activeTab === "fresh" && "Fresh Leads"}
                    {activeTab === "followup" && "Today's Follow-ups"}
                    {activeTab === "pending" && "Pending Leads"}
                    {activeTab === "qualified" && "Qualified Leads"}
                    {activeTab === "wonlost" && "Won/Lost Leads"}
                    {activeTab === "events" && "Event Leads"}
                    {" "}({filteredLeads.length})
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-3">
                  <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                    <option>All Time</option>
                    <option>Today</option>
                    <option>This Week</option>
                  </select>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input 
                      placeholder="Search by UID, name..." 
                      className="pl-10 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Status Tabs - Only show for Fresh Leads */}
              {activeTab === "fresh" && (
                <div className="flex space-x-2 mb-4">
                  <Badge 
                    variant="secondary" 
                    className={`cursor-pointer ${activeStatus === "all" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                    onClick={() => setActiveStatus("all")}
                  >
                    All <span className="ml-1 bg-gray-300 px-1 rounded">{tabCounts.fresh}</span>
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={`cursor-pointer ${activeStatus === "Fresh" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                    onClick={() => setActiveStatus("Fresh")}
                  >
                    Untouched <span className="ml-1 bg-gray-300 px-1 rounded">{statusCounts.untouched}</span>
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={`cursor-pointer ${activeStatus === "Called" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                    onClick={() => setActiveStatus("Called")}
                  >
                    Called <span className="ml-1 bg-gray-300 px-1 rounded">{statusCounts.called}</span>
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={`cursor-pointer ${activeStatus === "Follow Up" ? "bg-amber-900 text-white" : "bg-amber-100 text-amber-800"}`}
                    onClick={() => setActiveStatus("Follow Up")}
                  >
                    Follow Up <span className="ml-1 bg-amber-300 px-1 rounded">{statusCounts.followup}</span>
                  </Badge>
                </div>
              )}

              {/* Pending Filters - Hot/Warm/Cold */}
              {activeTab === "pending" && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-600">Lead Category:</span>
                  {(["all", "Hot", "Warm", "Cold"] as const).map(cat => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className={`cursor-pointer ${pendingCategory === cat ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                      onClick={() => setPendingCategory(cat)}
                    >
                      {cat.toString()}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Leads Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>ACTION</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>LEAD STATUS</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>CALL STATS</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>CUSTOMER NAME</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>MOBILE</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>SOURCE</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>CAMPAIGN</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>DATE</th>
                      <th className="text-left p-3 font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>UID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => (
                        <tr key={lead.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <Button 
                              size="sm" 
                              className="bg-red-500 hover:bg-red-600 text-white"
                              onClick={() => openUpdateModal(lead)}
                              style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}
                            >
                              Update
                            </Button>
                          </td>
                          <td className="p-3">
                            <Badge 
                              variant="outline"
                              className={
                                lead.lead_status === "Fresh" ? "bg-blue-100 text-blue-800" :
                                lead.lead_status === "Called" ? "bg-green-100 text-green-800" :
                                lead.lead_status === "Follow Up" ? "bg-yellow-100 text-yellow-800" :
                                lead.lead_status === "Qualified" ? "bg-purple-100 text-purple-800" :
                                lead.lead_status === "Won" ? "bg-green-100 text-green-800" :
                                lead.lead_status === "Lost" ? "bg-red-100 text-red-800" :
                                "bg-gray-100 text-gray-800"
                              }
                            >
                              {lead.lead_status}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {lead.lead_status === "Called" ? "1 call" : "No calls"}
                          </td>
                          <td className="p-3 font-medium">{lead.customer_name}</td>
                          <td className="p-3">{lead.customer_mobile_number}</td>
                          <td className="p-3">{lead.source}</td>
                          <td className="p-3">{lead.campaign}</td>
                          <td className="p-3 text-sm">{lead.date}</td>
                          <td className="p-3 text-sm font-mono">{lead.uid}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500">
                          No leads found for the selected criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lead Update Modal */}
      <LeadUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        lead={selectedLead}
        onUpdate={handleUpdateLead}
      />
    </DashboardLayout>
  )
}
