"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Calendar, Phone, MessageSquare, CheckCircle, XCircle, Star, Info, Users, Trophy } from "lucide-react"

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
  second_call_date: string
  second_call_remark: string
  third_call_date: string
  third_call_remark: string
  fourth_call_date: string
  fourth_call_remark: string
  fifth_call_date: string
  fifth_call_remark: string
  sixth_call_date: string
  sixth_call_remark: string
  seventh_call_date: string
  seventh_call_remark: string
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
}

export default function PSDashboard() {
  const [followUps, setFollowUps] = useState<PSFollowUp[]>([])
  const [isLoading, setIsLoading] = useState(false)
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
  const [activeTab, setActiveTab] = useState<'fresh'|'today'|'pending'|'qualified'|'wonlost'>('fresh')

  // Small helper to render uniform label/value pairs on a single line
  const InfoLine = ({ label, value }: { label: string; value?: string }) => (
    <div className="text-[14px] text-gray-800 leading-6">
      <span className="font-medium">{label}:</span> <span>{value || '—'}</span>
    </div>
  )

  useEffect(() => {
    loadFollowUps()
    
    // Set up real-time refresh every 30 seconds to catch ICROP ID updates
    const interval = setInterval(() => {
      loadFollowUps()
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const loadFollowUps = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ps-followup', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      })
      if (response.ok) {
        const data = await response.json()
        console.log('PS Follow-ups loaded:', data)
        setFollowUps(data)
      } else {
        const errorData = await response.json()
        console.error('Error loading follow-ups:', errorData)
        toast.error(errorData.error || 'Failed to load follow-ups')
      }
    } catch (error) {
      console.error('Error loading follow-ups:', error)
      toast.error('Failed to load follow-ups')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateFollowUp = async () => {
    if (!selectedFollowUp) return

    try {
      const updateData: any = {
        id: selectedFollowUp.id,
        follow_up_date: followUpDate || selectedFollowUp.follow_up_date,
        final_status: finalStatus || selectedFollowUp.final_status
      }

      // Add call remark based on call number
      const callFields = [
        'first_call_remark',
        'second_call_remark', 
        'third_call_remark',
        'fourth_call_remark',
        'fifth_call_remark',
        'sixth_call_remark',
        'seventh_call_remark'
      ]

      const effectiveRemark = callOutcome ? `${callOutcome}${callRemark ? ` - ${callRemark}` : ''}` : callRemark
      if (effectiveRemark && callNumber <= callFields.length) {
        updateData[callFields[callNumber - 1]] = effectiveRemark
        updateData[`${callFields[callNumber - 1].replace('_remark', '_date')}`] = new Date().toISOString()
      }

      const response = await fetch('/api/ps-followup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        toast.success('Follow-up updated successfully')
        setUpdateDialog(false)
        setSelectedFollowUp(null)
        setCallRemark("")
        setCallOutcome("")
        setFollowUpDate("")
        setFinalStatus("")
        loadFollowUps()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update follow-up')
      }
    } catch (error) {
      console.error('Error updating follow-up:', error)
      toast.error('Failed to update follow-up')
    }
  }

  const openUpdateDialog = (followUp: PSFollowUp) => {
    setSelectedFollowUp(followUp)
    setUpdateDialog(true)
    setCallNumber(1)
    setCallRemark("")
    setFollowUpDate(followUp.follow_up_date)
    setFinalStatus(followUp.final_status)
    // Load extra info (profession, test_drive_type, trade-in) from backend
    ;(async () => {
      try {
        const res = await fetch(`/api/trade-in/${encodeURIComponent(followUp.lead_uid)}`)
        const data = await res.json()
        if (res.ok) {
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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'won':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Won</Badge>
      case 'lost':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Lost</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      case 'hot':
        return <Badge className="bg-orange-100 text-orange-800">Hot</Badge>
      case 'warm':
        return <Badge className="bg-yellow-100 text-yellow-800">Warm</Badge>
      default:
        return <Badge variant="secondary">{status || 'Pending'}</Badge>
    }
  }

  const getNextCallNumber = (followUp: PSFollowUp) => {
    const calls = [
      followUp.first_call_remark,
      followUp.second_call_remark,
      followUp.third_call_remark,
      followUp.fourth_call_remark,
      followUp.fifth_call_remark,
      followUp.sixth_call_remark,
      followUp.seventh_call_remark
    ]
    
    for (let i = 0; i < calls.length; i++) {
      if (!calls[i]) return i + 1
    }
    return 7
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

  const freshCount = followUps.length
  const todayList = followUps.filter(f => isToday(f.follow_up_date))
  const todayCount = todayList.length
  const pendingList = followUps.filter(f => (f.final_status || '').toLowerCase() === 'pending')
  const pendingCount = pendingList.length
  const qualifiedList = followUps.filter(f => (f.lead_status || '').toLowerCase() === 'qualified')
  const qualifiedCount = qualifiedList.length
  const wonLostList = followUps.filter(f => ['won','lost'].includes((f.final_status || '').toLowerCase()))
  const wonLostCount = wonLostList.length

  const filteredFollowUps = (() => {
    switch(activeTab){
      case 'today': return todayList
      case 'pending': return pendingList
      case 'qualified': return qualifiedList
      case 'wonlost': return wonLostList
      case 'fresh':
      default: return followUps
    }
  })()

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
          <div className="flex items-center justify-between">
              <div>
            <h1 className="text-3xl font-bold text-gray-800">
              GEM Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Manage your assigned leads and follow-ups</p>
              </div>
          <Button 
            onClick={loadFollowUps} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white border-l-4 border-blue-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800">{followUps.length}</div>
              <p className="text-gray-500 text-sm">All leads assigned to you</p>
              </CardContent>
            </Card>
          <Card className="bg-white border-l-4 border-yellow-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800">
                {followUps.filter(f => f.final_status?.toLowerCase() === 'pending').length}
                </div>
              <p className="text-gray-500 text-sm">Awaiting follow-up</p>
              </CardContent>
            </Card>
          <Card className="bg-white border-l-4 border-green-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Won</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800">
                {followUps.filter(f => f.final_status?.toLowerCase() === 'won').length}
                </div>
              <p className="text-gray-500 text-sm">Successful conversions</p>
              </CardContent>
            </Card>
          <Card className="bg-white border-l-4 border-red-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Lost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800">
                {followUps.filter(f => f.final_status?.toLowerCase() === 'lost').length}
                </div>
              <p className="text-gray-500 text-sm">Unsuccessful leads</p>
              </CardContent>
            </Card>
          </div>

        {/* Tabs row */}
        <div className="flex flex-wrap gap-3 mt-6">
          <button onClick={() => setActiveTab('fresh')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${activeTab==='fresh'?'bg-gray-900 text-white':'bg-white text-gray-800'} shadow-sm`}>
            <Star className="w-4 h-4" /> Fresh Leads ({freshCount})
          </button>
          <button onClick={() => setActiveTab('today')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${activeTab==='today'?'bg-gray-900 text-white':'bg-white text-gray-800'} shadow-sm`}>
            <Calendar className="w-4 h-4" /> Today's Follow-ups ({todayCount})
          </button>
          <button onClick={() => setActiveTab('pending')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${activeTab==='pending'?'bg-gray-900 text-white':'bg-white text-gray-800'} shadow-sm`}>
            <Info className="w-4 h-4" /> Pending Leads ({pendingCount})
          </button>
          <button onClick={() => setActiveTab('qualified')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${activeTab==='qualified'?'bg-gray-900 text-white':'bg-white text-gray-800'} shadow-sm`}>
            <Users className="w-4 h-4" /> Qualified Leads ({qualifiedCount})
          </button>
          <button onClick={() => setActiveTab('wonlost')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${activeTab==='wonlost'?'bg-gray-900 text-white':'bg-white text-gray-800'} shadow-sm`}>
            <Trophy className="w-4 h-4" /> Won/Lost Leads ({wonLostCount})
          </button>
        </div>

        {/* Lead sections grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
        {/* Today's Follow-up */}
        {activeTab === 'today' && (
        <Card className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden">
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="text-xl font-bold">Today's Follow-up</CardTitle>
            <p className="text-gray-300 text-sm">Leads with follow-up scheduled for today</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableHead className="font-semibold text-gray-700">Lead UID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                  <TableHead className="font-semibold text-gray-700">ICROP ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Mobile</TableHead>
                  <TableHead className="font-semibold text-gray-700">Model</TableHead>
                  <TableHead className="font-semibold text-gray-700">Follow-up Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Next Call</TableHead>
                  <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps
                  .filter(f => {
                    const d = f.follow_up_date ? new Date(f.follow_up_date) : null
                    if (!d) return false
                    const today = new Date()
                    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
                  })
                  .map((followUp, index) => (
                  <TableRow key={followUp.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <TableCell className="font-medium text-blue-600">{followUp.lead_uid}</TableCell>
                    <TableCell className="font-medium text-gray-800">{followUp.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={followUp.icrop_id ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}>
                        {followUp.icrop_id || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{followUp.customer_mobile_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">{followUp.model_interested || '—'}</TableCell>
                    <TableCell className="text-gray-600">{formatDate(followUp.follow_up_date)}</TableCell>
                    <TableCell>{getStatusBadge(followUp.final_status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">Call #{getNextCallNumber(followUp)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openUpdateDialog(followUp)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )}

        {/* Open Leads */}
        {activeTab === 'pending' && (
        <Card className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden">
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="text-xl font-bold">Open Leads</CardTitle>
            <p className="text-gray-300 text-sm">Leads with final status Pending</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableHead className="font-semibold text-gray-700">Lead UID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                  <TableHead className="font-semibold text-gray-700">ICROP ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Mobile</TableHead>
                  <TableHead className="font-semibold text-gray-700">Model</TableHead>
                  <TableHead className="font-semibold text-gray-700">Follow-up Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Next Call</TableHead>
                  <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps
                  .filter(f => (f.final_status || '').toLowerCase() === 'pending')
                  .map((followUp, index) => (
                  <TableRow key={followUp.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <TableCell className="font-medium text-blue-600">{followUp.lead_uid}</TableCell>
                    <TableCell className="font-medium text-gray-800">{followUp.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={followUp.icrop_id ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}>
                        {followUp.icrop_id || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{followUp.customer_mobile_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">{followUp.model_interested || '—'}</TableCell>
                    <TableCell className="text-gray-600">{formatDate(followUp.follow_up_date)}</TableCell>
                    <TableCell>{getStatusBadge(followUp.final_status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">Call #{getNextCallNumber(followUp)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openUpdateDialog(followUp)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )}
        {activeTab === 'fresh' && (
        <Card className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden">
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="text-xl font-bold">Fresh Leads</CardTitle>
            <p className="text-gray-300 text-sm">Leads newly assigned to you</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableHead className="font-semibold text-gray-700">Lead UID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                  <TableHead className="font-semibold text-gray-700">ICROP ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Mobile</TableHead>
                  <TableHead className="font-semibold text-gray-700">Model</TableHead>
                  <TableHead className="font-semibold text-gray-700">Follow-up Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Next Call</TableHead>
                  <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((followUp, index) => (
                  <TableRow 
                    key={followUp.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <TableCell className="font-medium text-blue-600">{followUp.lead_uid}</TableCell>
                    <TableCell className="font-medium text-gray-800">{followUp.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={followUp.icrop_id ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"}>
                        {followUp.icrop_id || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{followUp.customer_mobile_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">{followUp.model_interested || '—'}</TableCell>
                    <TableCell className="text-gray-600">{formatDate(followUp.follow_up_date)}</TableCell>
                    <TableCell>{getStatusBadge(followUp.final_status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                        Call #{getNextCallNumber(followUp)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => openUpdateDialog(followUp)}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Update
            </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )}
        </div>

        <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Update Follow-up</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedFollowUp && (
                <div className="space-y-1">
                  <InfoLine label="Lead UID" value={selectedFollowUp.lead_uid} />
                  <InfoLine label="Customer" value={selectedFollowUp.customer_name} />
                  <InfoLine label="Mobile" value={selectedFollowUp.customer_mobile_number} />
                  <div className="pt-2 space-y-1">
                    <InfoLine label="Model" value={selectedFollowUp.model_interested} />
                    <InfoLine label="Variant" value={selectedFollowUp.variant} />
                    <InfoLine label="Buying Plan" value={selectedFollowUp.buying_plan} />
                    <InfoLine label="Finance Option" value={selectedFollowUp.finance_option} />
                    <InfoLine label="ICROP ID" value={selectedFollowUp.icrop_id} />
                    <InfoLine label="Profession" value={extraLeadInfo?.profession} />
                    <InfoLine label="Test Drive Type" value={extraLeadInfo?.test_drive_type} />
                    <InfoLine label="Trade-in" value={(extraLeadInfo?.trade_in || selectedFollowUp.trade_in) as string} />
                  </div>
                  {(extraLeadInfo?.trade_in?.toLowerCase() === 'yes' || selectedFollowUp.trade_in?.toLowerCase() === 'yes') && (
                    <div>
                      <Button
                        variant="outline"
                        className="mt-1"
                        onClick={async () => {
                          try {
                            setTradeInLoading(true)
                            setTradeInOpen(true)
                            const res = await fetch(`/api/trade-in/${encodeURIComponent(selectedFollowUp.lead_uid)}`)
                            const data = await res.json()
                            if (!res.ok) {
                              toast.error(data?.error || 'Failed to fetch trade-in details')
                              setTradeInData(null)
                            } else {
                              setTradeInData(data?.trade_in_details || data || null)
                            }
                          } catch (e) {
                            console.error('Trade-in fetch error', e)
                            toast.error('Error fetching trade-in details')
                            setTradeInData(null)
                          } finally {
                            setTradeInLoading(false)
                          }
                        }}
                      >
                        View trade-in details
                      </Button>
                      <Dialog open={tradeInOpen} onOpenChange={setTradeInOpen}>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Trade-in details</DialogTitle>
                          </DialogHeader>
                          <div className="text-sm text-gray-800">
                            {tradeInLoading ? (
                              <div>Loading...</div>
                            ) : tradeInData ? (
                              <div className="space-y-1">
                                <div><span className="font-medium">Make:</span> {tradeInData.trade_in_make || '—'}</div>
                                <div><span className="font-medium">Model:</span> {tradeInData.trade_in_model || '—'}</div>
                                <div><span className="font-medium">Year:</span> {tradeInData.trade_in_year || '—'}</div>
                                <div><span className="font-medium">KM:</span> {tradeInData.trade_in_km || '—'}</div>
                                <div><span className="font-medium">Ownership:</span> {tradeInData.trade_in_ownership || '—'}</div>
                              </div>
                            ) : (
                              <div>No trade-in details available.</div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <Label htmlFor="callNumber">Call Number</Label>
                <Select value={callNumber.toString()} onValueChange={(value) => setCallNumber(parseInt(value))}>
                  <SelectTrigger disabled>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        Call #{num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
          </div>
              <div>
                <Label htmlFor="callOutcome">Lead Status / Outcome</Label>
                <Select value={callOutcome} onValueChange={setCallOutcome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Lead Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'Call not Connected',
                      'Retailed',
                      'Discount Issue',
                      'Delayed',
                      'Booked',
                      'Booked with another number',
                      'Test Drive',
                      'Planning in Next Month',
                      'Interested',
                      'Lost to Competition',
                      'Finance Rejected',
                      'Dropped',
                      'Lost to codealer',
                      'Busy on another call',
                      'RNR',
                      'Call me Back',
                      'Not Interested'
                    ].map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="callRemark">Call Remark</Label>
                <Textarea
                  id="callRemark"
                  value={callRemark}
                  onChange={(e) => setCallRemark(e.target.value)}
                  placeholder="Enter call details..."
                />
          </div>

              <div>
                <Label htmlFor="followUpDate">Next Follow-up Date</Label>
                  <Input 
                  id="followUpDate"
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="finalStatus">Final Status</Label>
                <Select value={finalStatus} onValueChange={setFinalStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Hot">Hot</SelectItem>
                    <SelectItem value="Warm">Warm</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setUpdateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateFollowUp}>
                  Update Follow-up
                  </Button>
                </div>
              </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}