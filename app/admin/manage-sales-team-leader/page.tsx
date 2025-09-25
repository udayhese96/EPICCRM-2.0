"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Eye, Users, Building2, Phone, Mail, Shield, RefreshCw, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'

interface SalesTeamLeader {
  id: string
  username: string
  email: string
  full_name: string
  phone?: string
  branch: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PSUser {
  id: string
  username: string
  email: string
  full_name: string
  phone?: string
  branch: string
  is_active: boolean
  sales_team_leader_id?: string
  sales_team_leader_name?: string
}

interface PSAssignment {
  id: string
  ps_user_id: string
  sales_team_leader_id: string
  ps_user: PSUser
  sales_team_leader: SalesTeamLeader
}

const ManageSalesTeamLeaderPage = () => {
  const [salesTeamLeaders, setSalesTeamLeaders] = useState<SalesTeamLeader[]>([])
  const [psUsers, setPSUsers] = useState<PSUser[]>([])
  const [assignments, setAssignments] = useState<PSAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedLeader, setSelectedLeader] = useState<SalesTeamLeader | null>(null)
  const [draggedPS, setDraggedPS] = useState<PSUser | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    branch: '',
    password: '',
    is_active: true
  })

  const fetchSalesTeamLeaders = async () => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch('/api/users?role=sales_team_leader', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sales team leaders')
      }

      const data = await response.json()
      setSalesTeamLeaders(data)
    } catch (error: any) {
      toast.error(error.message || 'Error fetching sales team leaders')
      console.error('Error fetching sales team leaders:', error)
    }
  }

  const fetchPSUsers = async () => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch('/api/users?role=ps', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch PS users')
      }

      const data = await response.json()
      setPSUsers(data)
    } catch (error: any) {
      toast.error(error.message || 'Error fetching PS users')
      console.error('Error fetching PS users:', error)
    }
  }

  const fetchAssignments = async () => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch('/api/ps-assignments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch assignments')
      }

      const data = await response.json()
      setAssignments(data)
    } catch (error: any) {
      toast.error(error.message || 'Error fetching assignments')
      console.error('Error fetching assignments:', error)
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchSalesTeamLeaders(),
        fetchPSUsers(),
        fetchAssignments()
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const handleAddLeader = async () => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          role: 'sales_team_leader'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create sales team leader')
      }

      toast.success('Sales team leader created successfully!')
      setIsAddDialogOpen(false)
      setFormData({
        username: '',
        email: '',
        full_name: '',
        phone: '',
        branch: '',
        password: '',
        is_active: true
      })
      fetchAllData()
    } catch (error: any) {
      toast.error(error.message || 'Error creating sales team leader')
      console.error('Error creating sales team leader:', error)
    }
  }

  const handleEditLeader = async () => {
    if (!selectedLeader) return

    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/users/${selectedLeader.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to update sales team leader')
      }

      toast.success('Sales team leader updated successfully!')
      setIsEditDialogOpen(false)
      setSelectedLeader(null)
      fetchAllData()
    } catch (error: any) {
      toast.error(error.message || 'Error updating sales team leader')
      console.error('Error updating sales team leader:', error)
    }
  }

  const handleDeleteLeader = async (leaderId: string) => {
    if (!confirm('Are you sure you want to delete this sales team leader?')) return

    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/users/${leaderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete sales team leader')
      }

      toast.success('Sales team leader deleted successfully!')
      fetchAllData()
    } catch (error: any) {
      toast.error(error.message || 'Error deleting sales team leader')
      console.error('Error deleting sales team leader:', error)
    }
  }

  const handleAssignPS = async (psUserId: string, salesTeamLeaderId: string) => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch('/api/ps-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ps_user_id: psUserId,
          sales_team_leader_id: salesTeamLeaderId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to assign PS to sales team leader')
      }

      toast.success('PS assigned successfully!')
      fetchAllData()
    } catch (error: any) {
      toast.error(error.message || 'Error assigning PS')
      console.error('Error assigning PS:', error)
    }
  }

  const handleUnassignPS = async (assignmentId: string) => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/ps-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to unassign PS')
      }

      toast.success('PS unassigned successfully!')
      fetchAllData()
    } catch (error: any) {
      toast.error(error.message || 'Error unassigning PS')
      console.error('Error unassigning PS:', error)
    }
  }

  const openEditDialog = (leader: SalesTeamLeader) => {
    setSelectedLeader(leader)
    setFormData({
      username: leader.username,
      email: leader.email,
      full_name: leader.full_name,
      phone: leader.phone || '',
      branch: leader.branch,
      password: '',
      is_active: leader.is_active
    })
    setIsEditDialogOpen(true)
  }

  const onDragStart = (e: React.DragEvent, ps: PSUser) => {
    setDraggedPS(ps)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e: React.DragEvent, salesTeamLeaderId: string) => {
    e.preventDefault()
    if (draggedPS) {
      handleAssignPS(draggedPS.id, salesTeamLeaderId)
      setDraggedPS(null)
    }
  }

  const filteredLeaders = salesTeamLeaders.filter(leader => {
    const matchesSearch = leader.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         leader.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         leader.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBranch = branchFilter === 'all' || leader.branch === branchFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && leader.is_active) ||
                         (statusFilter === 'inactive' && !leader.is_active)
    
    return matchesSearch && matchesBranch && matchesStatus
  })

  const unassignedPS = psUsers.filter(ps => !assignments.some(a => a.ps_user_id === ps.id))
  const branches = Array.from(new Set(salesTeamLeaders.map(leader => leader.branch)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Manage Sales Team Leaders</h1>
            <p className="text-gray-600 text-lg">Assign PS users to Sales Team Leaders for performance monitoring</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button onClick={fetchAllData} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Sales Team Leader
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leaders</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesTeamLeaders.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Shield className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesTeamLeaders.filter(l => l.is_active).length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned PS</CardTitle>
              <UserCheck className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned PS</CardTitle>
              <UserX className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unassignedPS.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by username, name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="md:w-48">
                <Label htmlFor="branch">Branch</Label>
                <Select value={branchFilter} onValueChange={(value) => setBranchFilter(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    <SelectItem value="none">No Branch</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:w-48">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available PS chips (drag source) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Available PS ({unassignedPS.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {unassignedPS.map((ps) => (
                <div
                  key={ps.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, ps)}
                  className="bg-gray-50 p-3 rounded-lg text-center cursor-move select-none border hover:bg-gray-100"
                  title={`@${ps.username}${ps.branch ? ` • ${ps.branch}` : ''}`}
                >
                  <div className="font-medium text-sm truncate">{ps.full_name}</div>
                  <div className="text-xs text-gray-600 truncate">@{ps.username}</div>
                </div>
              ))}
              {unassignedPS.length === 0 && (
                <div className="text-center text-gray-500 py-4 col-span-full">
                  All PS users are currently assigned
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Team Leaders with droppable buckets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              Sales Team Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredLeaders.map((leader) => {
                const assignedPS = assignments.filter(a => a.sales_team_leader_id === leader.id)
                return (
                  <div
                    key={leader.id}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, leader.id)}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium mb-1">{leader.full_name}</div>
                    <div className="text-sm text-gray-500 mb-3">@{leader.username} • {leader.branch}</div>
                    <div className="space-y-2 min-h-12">
                      {assignedPS.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-2 bg-green-50 rounded border"
                        >
                          <div>
                            <div className="font-medium text-sm">{assignment.ps_user.full_name}</div>
                            <div className="text-xs text-gray-500">@{assignment.ps_user.username}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnassignPS(assignment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserX className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      {assignedPS.length === 0 && (
                        <div className="text-center text-gray-500 py-6 text-sm border-2 border-dashed rounded">
                          Drop PS here to assign to this Team Leader
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {filteredLeaders.length === 0 && (
                <div className="text-center text-gray-500 py-8">No team leaders found</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Team Leaders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Team Leaders ({filteredLeaders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading sales team leaders...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Assigned PS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaders.map((leader) => {
                    const assignedCount = assignments.filter(a => a.sales_team_leader_id === leader.id).length
                    return (
                      <TableRow key={leader.id}>
                        <TableCell>
                          <div>
                            <div className="font-semibold">{leader.full_name}</div>
                            <div className="text-sm text-gray-500">@{leader.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-3 h-3" />
                              {leader.email}
                            </div>
                            {leader.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3 h-3" />
                                {leader.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{leader.branch}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            {assignedCount} PS
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={leader.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {leader.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(leader.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(leader)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteLeader(leader.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Leader Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Sales Team Leader</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Enter phone"
                  />
                </div>
                <div>
                  <Label htmlFor="branch">Branch (Optional)</Label>
                  <Select value={formData.branch || 'none'} onValueChange={(value) => setFormData({...formData, branch: value === 'none' ? '' : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Branch</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddLeader}>
                Add Sales Team Leader
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Leader Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Sales Team Leader</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-full_name">Full Name</Label>
                <Input
                  id="edit-full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Enter phone"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-branch">Branch</Label>
                  <Input
                    id="edit-branch"
                    value={formData.branch}
                    onChange={(e) => setFormData({...formData, branch: e.target.value})}
                    placeholder="Enter branch"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter new password"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditLeader}>
                Update Sales Team Leader
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default ManageSalesTeamLeaderPage
