"use client"

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { RoleGuard } from '@/components/auth/role-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Users, GripVertical, Trash2, Edit } from 'lucide-react'
// import { toast } from 'sonner' // Commented out for now
// import { UserInfoDebug } from '@/components/debug/user-info' // Removed debug component

interface User {
  id: string
  username: string
  full_name: string
  email: string
  branch: string
  role: string
  team_leader_id?: string | null
}

interface TeamLeaderAssignmentLike {
  id: string
  ps_user_id: string
  team_leader_id: string
  ps_user: User
  team_leader?: User
}

interface TeamLeader {
  id: string
  username: string
  full_name: string
  email: string
  branch: string
  assigned_ps: TeamLeaderAssignmentLike[]
}

export default function ManageTeamLeadersPage() {
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [psUsers, setPsUsers] = useState<User[]>([])
  const [filteredPS, setFilteredPS] = useState<User[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [availableBranches, setAvailableBranches] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newTeamLeader, setNewTeamLeader] = useState({
    username: '',
    full_name: '',
    email: '',
    branch: '',
    password: ''
  })

  // Fetch data
  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all PS users
      const psResponse = await fetch('/api/users?role=ps')
      const psData = await psResponse.json()
      
      // Fetch team leaders
      const tlResponse = await fetch('/api/users?role=team_leader')
      const tlData = await tlResponse.json()
      
      // Build assignments from ps users' team_leader_id
      const psList: User[] = psData.users
      const teamLeadersWithPS: TeamLeader[] = tlData.users.map((tl: User) => ({
        ...tl,
        assigned_ps: psList
          .filter((ps: any) => ps.team_leader_id === tl.id)
          .map((ps: any) => ({
            id: ps.id,
            ps_user_id: ps.id,
            team_leader_id: tl.id,
            ps_user: ps
          }))
      }))

      // Compute available branches from PS and TL
      const branchSet = new Set<string>()
      psList.forEach(u => { if (u.branch) branchSet.add(u.branch) })
      tlData.users.forEach((u: User) => { if (u.branch) branchSet.add(u.branch) })

      const unassigned = psList.filter((ps: any) => !ps.team_leader_id)
      const branches = [...branchSet]
      branches.sort()
      
      setTeamLeaders(teamLeadersWithPS)
      setPsUsers(unassigned)
      setAvailableBranches(['all', ...branches])
      
      // Apply initial filter
      applyBranchFilter('all', unassigned)
    } catch (error) {
      console.error('Error fetching data:', error)
      console.error('Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  // Apply branch filter
  const applyBranchFilter = (branch: string, psList: User[] = psUsers) => {
    const filtered = branch === 'all' 
      ? psList 
      : psList.filter(ps => ps.branch === branch)
    
    setFilteredPS(filtered)
    setSelectedBranch(branch)
  }

  // Get team leaders filtered by selected branch
  const getFilteredTeamLeaders = () => {
    if (selectedBranch === 'all') {
      return teamLeaders
    }
    return teamLeaders.filter(tl => tl.branch === selectedBranch)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    applyBranchFilter(selectedBranch, psUsers)
  }, [psUsers])

  // Handle PS assignment by updating PS user's team_leader_id
  const handleAssignPS = async (psUserId: string, teamLeaderId: string) => {
    try {
      const response = await fetch(`/api/users/${psUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_leader_id: teamLeaderId })
      })

      if (!response.ok) {
        throw new Error('Failed to assign PS user')
      }

      console.log('PS user assigned successfully')
      fetchData()
    } catch (error) {
      console.error('Error assigning PS user:', error)
      console.error('Failed to assign PS user')
    }
  }

  // Handle PS unassignment by clearing team_leader_id on the PS user
  const handleUnassignPS = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/users/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_leader_id: null })
      })

      if (!response.ok) {
        throw new Error('Failed to unassign PS user')
      }

      console.log('PS user unassigned successfully')
      fetchData()
    } catch (error) {
      console.error('Error unassigning PS user:', error)
      console.error('Failed to unassign PS user')
    }
  }

  // Handle creating new team leader
  const handleCreateTeamLeader = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTeamLeader,
          role: 'team_leader'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create team leader')
      }

      console.log('Team leader created successfully')
      setNewTeamLeader({
        username: '',
        full_name: '',
        email: '',
        branch: '',
        password: ''
      })
      setIsAddDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error creating team leader:', error)
      console.error('Failed to create team leader')
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <RoleGuard requiredRole="admin" route="/admin/manage-team-leaders">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Team Leaders</h1>
              <p className="text-gray-600">Assign PS team members to team leaders for analytical oversight</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Team Leader
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team Leader</DialogTitle>
                  <DialogDescription>
                    Create a new team leader to oversee PS team analytics.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newTeamLeader.username}
                      onChange={(e) => setNewTeamLeader({ ...newTeamLeader, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={newTeamLeader.full_name}
                      onChange={(e) => setNewTeamLeader({ ...newTeamLeader, full_name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newTeamLeader.email}
                      onChange={(e) => setNewTeamLeader({ ...newTeamLeader, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch">Branch</Label>
                    <Select value={newTeamLeader.branch} onValueChange={(value) => setNewTeamLeader({ ...newTeamLeader, branch: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mount Road">Mount Road</SelectItem>
                        <SelectItem value="Vysarapadi">Vysarapadi</SelectItem>
                        <SelectItem value="Cuddalore">Cuddalore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newTeamLeader.password}
                      onChange={(e) => setNewTeamLeader({ ...newTeamLeader, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTeamLeader}>
                    Create Team Leader
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Branch Filter */}
          <Card className="border rounded-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="text-base">Unassigned PS Team Members</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Filter:</span>
                  <Select value={selectedBranch} onValueChange={(value) => applyBranchFilter(value)}>
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches ({psUsers.length})</SelectItem>
                      {availableBranches.slice(1).map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch} ({psUsers.filter(ps => ps.branch === branch).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
              <CardDescription className="text-xs">
                Drag and drop PS users to assign them to team leaders
                {selectedBranch !== 'all' && (
                  <span className="ml-1 text-blue-600 font-medium">
                    • {filteredPS.length} from {selectedBranch}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Quick Branch Filter Buttons */}
              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  variant={selectedBranch === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyBranchFilter('all')}
                >
                  All ({psUsers.length})
                </Button>
                {availableBranches.slice(1).map((branch) => (
                  <Button
                    key={branch}
                    variant={selectedBranch === branch ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyBranchFilter(branch)}
                  >
                    {branch} ({psUsers.filter(ps => ps.branch === branch).length})
                  </Button>
                ))}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredPS.map((ps) => (
                  <div
                    key={ps.id}
                    className="p-2 border rounded-md bg-gray-50 cursor-move hover:bg-gray-100 transition-colors text-sm"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', ps.id)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{ps.full_name}</h4>
                        <p className="text-xs text-gray-600">{ps.username}</p>
                        <Badge variant="secondary" className="mt-1 px-2 py-0.5 text-[10px]">
                          {ps.branch}
                        </Badge>
                      </div>
                      <GripVertical className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredPS.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <h3 className="text-base font-medium mb-1">No PS Members Found</h3>
                  <p className="text-xs">
                    {selectedBranch === 'all' 
                      ? 'No PS members available.'
                      : `No unassigned PS members found in ${selectedBranch} branch.`
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Leaders with Assigned PS */}
          {getFilteredTeamLeaders().length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Team Leaders {selectedBranch !== 'all' && `in ${selectedBranch}`}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({getFilteredTeamLeaders().length} team leader{getFilteredTeamLeaders().length !== 1 ? 's' : ''})
                </span>
              </h3>
              <p className="text-sm text-gray-600">
                {selectedBranch === 'all' 
                  ? 'All team leaders from all branches'
                  : `Team leaders from ${selectedBranch} branch only`
                }
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {getFilteredTeamLeaders().map((teamLeader) => (
              <Card key={teamLeader.id} className="rounded-md">
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {teamLeader.full_name}
                    </div>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {teamLeader.assigned_ps.length} PS
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {teamLeader.username} • {teamLeader.branch}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div
                    className="min-h-[140px] p-3 border-2 border-dashed border-gray-300 rounded-md"
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add('border-blue-500', 'bg-blue-50')
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50')
                      const psUserId = e.dataTransfer.getData('text/plain')
                      handleAssignPS(psUserId, teamLeader.id)
                    }}
                  >
                    {teamLeader.assigned_ps.length === 0 ? (
                      <div className="text-center text-gray-500 py-6 text-sm">
                        Drop PS members here to assign them to this team leader
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {teamLeader.assigned_ps.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between p-2 bg-white border rounded-md text-sm"
                          >
                            <div>
                              <h4 className="font-medium text-sm">{assignment.ps_user.full_name}</h4>
                              <p className="text-xs text-gray-600">{assignment.ps_user.username}</p>
                              <Badge variant="secondary" className="mt-1 px-2 py-0.5 text-[10px]">
                                {assignment.ps_user.branch}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleUnassignPS(assignment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {getFilteredTeamLeaders().length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedBranch === 'all' ? 'No Team Leaders' : `No Team Leaders in ${selectedBranch}`}
                </h3>
                <p className="text-gray-600 mb-4">
                  {selectedBranch === 'all' 
                    ? 'Create team leaders to start assigning PS team members for analytical oversight.'
                    : `Create team leaders for ${selectedBranch} branch to start assigning PS team members.`
                  }
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {selectedBranch === 'all' ? 'Create First Team Leader' : `Create Team Leader for ${selectedBranch}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </RoleGuard>
    </DashboardLayout>
  )
}
