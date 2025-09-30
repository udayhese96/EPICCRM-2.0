"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Users } from "lucide-react"
import { useState, useEffect } from "react"

interface CREUser {
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

const branches = ["Mount Road", "Vyasarpadi", "Cuddalore"]


export default function ManageCREPage() {
  const [creUsers, setCREUsers] = useState<CREUser[]>([])
  const [loading, setLoading] = useState(true)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<CREUser | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    phone: "",
    branch: "",
    password: "",
    is_active: true
  })

  // Fetch CRE users from API
  useEffect(() => {
    fetchCREUsers()
  }, [])

  const fetchCREUsers = async () => {
    try {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''

      // Call FastAPI backend directly with unified users API
      const response = await fetch('/api/users?role=cre', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const users = await response.json()
        setCREUsers(users)
      } else {
        console.error('Failed to fetch CRE users:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching CRE users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingUser ? `/api/cre-users/${editingUser.id}` : '/api/cre-users'
      const fastApiUrl = editingUser ? `/api/cre-users/${editingUser.id}` : `/api/cre-users`
      const method = editingUser ? 'PUT' : 'POST'
      
      // Try Next.js API first
      let response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      // If Next.js API fails, try FastAPI directly
      if (!response.ok) {
        console.log('Next.js API failed, trying FastAPI directly...')
        response = await fetch(fastApiUrl, {
          method,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })
      }

      if (response.ok) {
        await fetchCREUsers() // Refresh the list
        // Reset form
        setFormData({
          name: "",
          username: "",
          email: "",
          phone: "",
          password: ""
        })
        setEditingUser(null)
        setIsDialogOpen(false)
        alert('CRE user saved successfully!')
      } else {
        const errorData = await response.text()
        console.error('Failed to save CRE user:', response.status, errorData)
        alert(`Failed to save CRE user: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error saving CRE user:', error)
      alert('Error saving CRE user. Please check console for details.')
    }
  }

  const handleEdit = (user: CREUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      password: ""
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (userId: string) => {
    try {
      const response = await fetch(`/api/cre-users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        await fetchCREUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting CRE user:', error)
    }
  }

  const toggleUserStatus = async (userId: string) => {
    try {
      const user = creUsers.find(u => u.id === userId)
      if (!user) return

      const response = await fetch(`/api/cre-users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !user.is_active })
      })
      if (response.ok) {
        await fetchCREUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Error updating CRE user status:', error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage CRE Users</h1>
            <p className="text-gray-600 mt-1">Customer Relationship Executive Management</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add CRE User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Edit CRE User" : "Add New CRE User"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="branch">Branch (Optional)</Label>
                  <Select value={formData.branch || 'none'} onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value === 'none' ? '' : value }))}>
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
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required={!editingUser}
                    placeholder={editingUser ? "Leave blank to keep current password" : ""}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingUser ? "Update" : "Create"} User
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{creUsers.length}</p>
                  <p className="text-sm text-gray-600">Total CRE Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{creUsers.filter(u => u.is_active).length}</p>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{creUsers.filter(u => !u.is_active).length}</p>
                  <p className="text-sm text-gray-600">Inactive Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-gray-600">Branches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CRE Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>CRE Users</span>
            </CardTitle>
            <CardDescription>
              Manage Customer Relationship Executive users and their access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creUsers.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Badge className="bg-pink-100 text-pink-800">
                        #{(index + 1).toString().padStart(2, '0')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-purple-600">{user.username}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        📞 {user.phone || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-pink-600">
                        📧 {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.branch || 'No Branch'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.is_active ? "default" : "destructive"}
                        className={user.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {user.is_active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={() => toggleUserStatus(user.id)}
                        >
                          🔄 Deactivate
                        </Button>
                        <Button
                          size="sm"
                          className="bg-pink-500 hover:bg-pink-600 text-white"
                          onClick={() => handleEdit(user)}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-500 hover:bg-red-600 text-white"
                          onClick={() => handleDelete(user.id)}
                        >
                          🗑️ Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
