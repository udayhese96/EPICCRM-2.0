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
import { useState } from "react"

interface CREUser {
  id: string
  name: string
  username: string
  email: string
  phone: string
  branch: string
  is_active: boolean
  created_at: string
}

const branches = ["Mount Road", "Vyasarpadi", "Cuddalore"]

export default function ManageCREPage() {
  const [creUsers, setCREUsers] = useState<CREUser[]>([
    {
      id: "1",
      name: "Rajesh Kumar",
      username: "rajesh.cre",
      email: "rajesh@toyota.com",
      phone: "9876543210",
      branch: "Mount Road",
      is_active: true,
      created_at: "2025-01-15"
    },
    {
      id: "2", 
      name: "Priya Singh",
      username: "priya.cre",
      email: "priya@toyota.com",
      phone: "9876543211",
      branch: "Vyasarpadi",
      is_active: true,
      created_at: "2025-01-20"
    }
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<CREUser | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    branch: "",
    password: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingUser) {
      // Update existing user
      setCREUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...formData, is_active: true }
          : user
      ))
    } else {
      // Add new user
      const newUser: CREUser = {
        id: Date.now().toString(),
        ...formData,
        is_active: true,
        created_at: new Date().toISOString().split('T')[0]
      }
      setCREUsers(prev => [...prev, newUser])
    }
    
    // Reset form
    setFormData({
      name: "",
      username: "",
      email: "",
      phone: "",
      branch: "",
      password: ""
    })
    setEditingUser(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (user: CREUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      branch: user.branch,
      password: ""
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (userId: string) => {
    setCREUsers(prev => prev.filter(user => user.id !== userId))
  }

  const toggleUserStatus = (userId: string) => {
    setCREUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, is_active: !user.is_active }
        : user
    ))
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
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
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
                  <p className="text-2xl font-bold">{branches.length}</p>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.branch}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.is_active ? "default" : "destructive"}
                        className={user.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.created_at}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={user.is_active ? "destructive" : "default"}
                          onClick={() => toggleUserStatus(user.id)}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
