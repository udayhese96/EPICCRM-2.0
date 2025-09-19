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
import { Calendar, Phone, MessageSquare, CheckCircle, XCircle } from "lucide-react"

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
  updated_at: string
  ps_assigned_at: string
  won_timestamp: string
  lost_timestamp: string
  variant: string
  buying_plan: string
  finance_option: string
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

  useEffect(() => {
    loadFollowUps()
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

      if (callRemark && callNumber <= callFields.length) {
        updateData[callFields[callNumber - 1]] = callRemark
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">GEM Dashboard</h1>
          <Button onClick={loadFollowUps} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{followUps.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {followUps.filter(f => f.final_status?.toLowerCase() === 'pending').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Won</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {followUps.filter(f => f.final_status?.toLowerCase() === 'won').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {followUps.filter(f => f.final_status?.toLowerCase() === 'lost').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead UID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Follow-up Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Call</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((followUp) => (
                  <TableRow key={followUp.id}>
                    <TableCell className="font-medium">{followUp.lead_uid}</TableCell>
                    <TableCell>{followUp.customer_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {followUp.customer_mobile_number}
                      </div>
                    </TableCell>
                    <TableCell>{followUp.model_interested}</TableCell>
                    <TableCell>{formatDate(followUp.follow_up_date)}</TableCell>
                    <TableCell>{getStatusBadge(followUp.final_status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        Call #{getNextCallNumber(followUp)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => openUpdateDialog(followUp)}
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

        <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Follow-up</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedFollowUp && (
                <div className="space-y-2">
                  <div>
                    <Label>Lead UID: {selectedFollowUp.lead_uid}</Label>
                  </div>
                  <div>
                    <Label>Customer: {selectedFollowUp.customer_name}</Label>
                  </div>
                  <div>
                    <Label>Mobile: {selectedFollowUp.customer_mobile_number}</Label>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="callNumber">Call Number</Label>
                <Select value={callNumber.toString()} onValueChange={(value) => setCallNumber(parseInt(value))}>
                  <SelectTrigger>
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