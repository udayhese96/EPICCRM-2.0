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
import { Plus, Edit, Trash2, Eye, Users, Building2, Phone, Mail, Shield, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface CRETeamLeaderUser {
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

const ManageCRETeamLeaderPage = () => {
  const [users, setUsers] = useState<CRETeamLeaderUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<CRETeamLeaderUser | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    branch: '',
    password: '',
    is_active: true
  })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      // Call FastAPI backend directly
      const response = await fetch('/api/users?role=cre_team_leader', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch CRE Team Leader users')
      }

      const data = await response.json()
      const list = Array.isArray(data) ? data : (Array.isArray(data.users) ? data.users : [])
      setUsers(list as any)
    } catch (error: any) {
      toast.error(error.message || 'Error fetching CRE Team Leader users')
      console.error('Error fetching CRE Team Leader users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAddUser = async () => {
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
          role: 'cre_team_leader'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create CRE Team Leader user')
      }

      toast.success('CRE Team Leader user created successfully!')
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
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error creating CRE Team Leader user')
      console.error('Error creating CRE Team Leader user:', error)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to update CRE Team Leader user')
      }

      toast.success('CRE Team Leader user updated successfully!')
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error updating CRE Team Leader user')
      console.error('Error updating CRE Team Leader user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this CRE Team Leader user?')) return

    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete CRE Team Leader user')
      }

      toast.success('CRE Team Leader user deleted successfully!')
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error deleting CRE Team Leader user')
      console.error('Error deleting CRE Team Leader user:', error)
    }
  }

  const openEditDialog = (user: CRETeamLeaderUser) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || '',
      branch: user.branch,
      password: '',
      is_active: user.is_active
    })
    setIsEditDialogOpen(true)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBranch = branchFilter === 'all' || user.branch === branchFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active)
    
    return matchesSearch && matchesBranch && matchesStatus
  })

  const branches = Array.from(new Set(users.map(user => user.branch)))

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Manage CRE Team Leaders</h1>
            <p className="text-gray-600 text-lg">Manage CRE Team Leader accounts and permissions</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button onClick={fetchUsers} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add CRE Team Leader
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total CRE Team Leaders</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Shield className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => u.is_active).length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <Eye className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => !u.is_active).length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Branches</CardTitle>
              <Building2 className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{branches.length}</div>
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
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
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

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>CRE Team Leaders ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading CRE Team Leaders...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{user.full_name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.branch}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(user)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add User Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New CRE Team Leader</DialogTitle>
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
                  <Select value={formData.branch} onValueChange={(value) => setFormData({...formData, branch: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Branch</SelectItem>
                      <SelectItem value="Mount Road">Mount Road</SelectItem>
                      <SelectItem value="Vyasarpadi">Vyasarpadi</SelectItem>
                      <SelectItem value="Cuddalore">Cuddalore</SelectItem>
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
              <Button onClick={handleAddUser}>
                Add CRE Team Leader
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit CRE Team Leader</DialogTitle>
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
              <Button onClick={handleEditUser}>
                Update CRE Team Leader
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </DashboardLayout>
  )
}

export default ManageCRETeamLeaderPage
