"use client"

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { RoleGuard } from '@/components/auth/role-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Users, GripVertical, Trash2 } from 'lucide-react'

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
  const [view, setView] = useState<'overview' | 'assignments' | 'unassigned'>('assignments')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newTeamLeader, setNewTeamLeader] = useState({
    username: '',
    full_name: '',
    email: '',
    branch: '',
    password: ''
  })

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assignTargetTeamLeaderId, setAssignTargetTeamLeaderId] = useState<string | null>(null)
  const [assignSelectedPsId, setAssignSelectedPsId] = useState<string | null>(null)

  // UI helpers
  const branchPill = (branch?: string) => {
    const b = (branch || '').toLowerCase()
    if (b.includes('mount')) return 'bg-blue-100 text-blue-800'
    if (b.includes('vysa') || b.includes('vysa')) return 'bg-amber-100 text-amber-800'
    if (b.includes('cudd')) return 'bg-emerald-100 text-emerald-800'
    if (b.includes('chid')) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const supabaseUserRaw = typeof window !== 'undefined' ? localStorage.getItem('supabase_user') : null
      const supabaseToken = supabaseUserRaw ? (JSON.parse(supabaseUserRaw)?.access_token || null) : null
      const token = supabaseToken || (typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('access_token')) : null)
      
      const [psResponse, creResponse] = await Promise.all([
        fetch(`/api/users?role=ps&_=${Date.now()}`, { cache: 'no-store' as any, headers: token ? { 'Authorization': `Bearer ${token}` } : {} }),
        fetch(`/api/users?role=cre&_=${Date.now()}`, { cache: 'no-store' as any, headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      ])
      const psData = await psResponse.json()
      const creData = await creResponse.json()
      
      const tlResponse = await fetch(`/api/users?role=team_leader&_=${Date.now()}`, { cache: 'no-store' as any, headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      const tlData = await tlResponse.json()
      
      const allCandidates: User[] = [...(psData?.users || []), ...(creData?.users || [])]
      const teamLeadersWithPS: TeamLeader[] = (tlData?.users || []).map((tl: User) => ({
        ...tl,
        assigned_ps: allCandidates
          .filter((ps: any) => !!ps.team_leader_id && ps.team_leader_id === tl.id)
          .map((ps: any) => ({
            id: ps.id,
            ps_user_id: ps.id,
            team_leader_id: tl.id,
            ps_user: ps
          }))
      }))

      const branchSet = new Set<string>()
      allCandidates.forEach(u => { if (u?.branch) branchSet.add(u.branch) })
      ;(tlData?.users || []).forEach((u: User) => { if (u?.branch) branchSet.add(u.branch) })

      const unassigned = (psData?.users || []).filter((ps: any) => !ps.team_leader_id)
      const branches = [...branchSet].sort()
      
      setTeamLeaders(teamLeadersWithPS)
      setPsUsers(unassigned)
      setAvailableBranches(['all', ...branches])
      applyBranchFilter('all', unassigned)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyBranchFilter = (branch: string, psList: User[] = psUsers) => {
    const filtered = branch === 'all' ? psList : psList.filter(ps => ps.branch === branch)
    setFilteredPS(filtered)
    setSelectedBranch(branch)
  }

  const getFilteredTeamLeaders = useMemo(() => {
    if (selectedBranch === 'all') return teamLeaders
    return teamLeaders.filter(tl => tl.branch === selectedBranch)
  }, [selectedBranch, teamLeaders])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    applyBranchFilter(selectedBranch, psUsers)
  }, [psUsers])

  const handleAssignPS = async (psUserId: string, teamLeaderId: string) => {
    try {
      const ps = psUsers.find(u => u.id === psUserId)
      if (ps) {
        setPsUsers(prev => prev.filter(u => u.id !== psUserId))
        setFilteredPS(prev => prev.filter(u => u.id !== psUserId))
        setTeamLeaders(prev => prev.map(tl => tl.id === teamLeaderId
          ? {
              ...tl,
              assigned_ps: [...tl.assigned_ps, {
                id: ps.id,
                ps_user_id: ps.id,
                team_leader_id: teamLeaderId,
                ps_user: { ...ps, team_leader_id: teamLeaderId },
              }]
            }
          : tl
        ))
      }

      const response = await fetch(`/api/users/${psUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_leader_id: teamLeaderId })
      })
      if (!response.ok) throw new Error('Failed to assign PS user')
      fetchData()
    } catch (error) {
      console.error('Error assigning PS user:', error)
      await fetchData()
    }
  }

  const handleUnassignPS = async (assignmentId: string) => {
    try {
      const assignedFrom = teamLeaders.find(tl => tl.assigned_ps.some(a => a.id === assignmentId))
      const assignment = assignedFrom?.assigned_ps.find(a => a.id === assignmentId)
      if (assignedFrom && assignment) {
        setTeamLeaders(prev => prev.map(tl => tl.id === assignedFrom.id
          ? { ...tl, assigned_ps: tl.assigned_ps.filter(a => a.id !== assignmentId) }
          : tl
        ))
        const restored = { ...assignment.ps_user, team_leader_id: null as any }
        setPsUsers(prev => [...prev, restored])
        applyBranchFilter(selectedBranch, [...psUsers, restored])
      }

      const response = await fetch(`/api/users/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_leader_id: null })
      })
      if (!response.ok) throw new Error('Failed to unassign PS user')
      fetchData()
    } catch (error) {
      console.error('Error unassigning PS user:', error)
      await fetchData()
    }
  }

  const handleCreateTeamLeader = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTeamLeader, role: 'team_leader' })
      })
      if (!response.ok) throw new Error('Failed to create team leader')
      setNewTeamLeader({ username: '', full_name: '', email: '', branch: '', password: '' })
      setIsAddDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error creating team leader:', error)
    }
  }

  const assignedCount = useMemo(() => teamLeaders.reduce((acc, t) => acc + t.assigned_ps.length, 0), [teamLeaders])
  const totalPS = assignedCount + psUsers.length
  const assignmentRate = totalPS > 0 ? Math.round((assignedCount / totalPS) * 100) : 0

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          Loading...
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <RoleGuard requiredRole="admin" route="/admin/manage-team-leaders">
        <div className="space-y-4">
          {/* Top toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-0.5">
              <h1 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-indigo-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">Manage Team Leaders</h1>
              <p className="text-xs text-muted-foreground">Assign PS members to leaders for analysis and reporting</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-md p-1">
                <Button variant={view === 'overview' ? 'default' : 'ghost'} size="sm" onClick={() => setView('overview')}>Overview</Button>
                <Button variant={view === 'assignments' ? 'default' : 'ghost'} size="sm" onClick={() => setView('assignments')}>Assignments</Button>
                <Button variant={view === 'unassigned' ? 'default' : 'ghost'} size="sm" onClick={() => setView('unassigned')}>Unassigned</Button>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                  <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                    Add Leader
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Team Leader</DialogTitle>
                    <DialogDescription>Set up a leader to oversee PS analytics.</DialogDescription>
                </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                    <Label htmlFor="username">Username</Label>
                      <Input id="username" value={newTeamLeader.username} onChange={(e) => setNewTeamLeader({ ...newTeamLeader, username: e.target.value })} placeholder="Username" />
                  </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="full_name">Full name</Label>
                      <Input id="full_name" value={newTeamLeader.full_name} onChange={(e) => setNewTeamLeader({ ...newTeamLeader, full_name: e.target.value })} placeholder="Full name" />
                  </div>
                    <div className="grid gap-1.5">
                    <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={newTeamLeader.email} onChange={(e) => setNewTeamLeader({ ...newTeamLeader, email: e.target.value })} placeholder="Email" />
                  </div>
                    <div className="grid gap-1.5">
                    <Label htmlFor="branch">Branch</Label>
                    <Select value={newTeamLeader.branch} onValueChange={(value) => setNewTeamLeader({ ...newTeamLeader, branch: value })}>
                        <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mount Road">Mount Road</SelectItem>
                        <SelectItem value="Vysarapadi">Vysarapadi</SelectItem>
                        <SelectItem value="Cuddalore">Cuddalore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                    <div className="grid gap-1.5">
                    <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" value={newTeamLeader.password} onChange={(e) => setNewTeamLeader({ ...newTeamLeader, password: e.target.value })} placeholder="Password" />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateTeamLeader}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="rounded-lg shadow-sm hover:shadow-md transition-all border-0 bg-gradient-to-br from-indigo-50 to-indigo-100">
              <CardContent className="p-3">
                <div className="text-[11px] text-indigo-700">Team Leaders</div>
                <div className="text-xl font-semibold text-indigo-900">{getFilteredTeamLeaders.length}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-sm hover:shadow-md transition-all border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardContent className="p-3">
                <div className="text-[11px] text-emerald-700">Assigned PS</div>
                <div className="text-xl font-semibold text-emerald-900">{assignedCount}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-sm hover:shadow-md transition-all border-0 bg-gradient-to-br from-rose-50 to-rose-100">
              <CardContent className="p-3">
                <div className="text-[11px] text-rose-700">Unassigned PS</div>
                <div className="text-xl font-semibold text-rose-900">{psUsers.length}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-sm hover:shadow-md transition-all border-0 bg-gradient-to-br from-violet-50 to-violet-100">
              <CardContent className="p-3">
                <div className="text-[11px] text-violet-700">Assignment Rate</div>
                <div className="text-xl font-semibold text-violet-900">{assignmentRate}%</div>
              </CardContent>
            </Card>
                </div>

          {/* Main layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left column: Filters + Unassigned */}
            <div className="lg:col-span-4">
              <div className="sticky top-4 space-y-3">
                <Card className="rounded-xl shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Filters</CardTitle>
                    <CardDescription className="text-xs">Narrow by branch</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                  <Select value={selectedBranch} onValueChange={(value) => applyBranchFilter(value)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Branch" />
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
                  </CardContent>
                </Card>

                <Card className="rounded-xl shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Unassigned PS
              </CardTitle>
              <CardDescription className="text-xs">
                      Drag to a leader to assign
                {selectedBranch !== 'all' && (
                        <span className="ml-1 text-primary font-medium">
                          • {filteredPS.length} in {selectedBranch}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-2 flex flex-wrap gap-2">
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
                          <span className={`px-1.5 py-0.5 rounded ${branchPill(branch)}`}>{branch}</span> ({psUsers.filter(ps => ps.branch === branch).length})
                  </Button>
                ))}
              </div>
              
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredPS.map((ps) => (
                  <div
                    key={ps.id}
                          className="p-2 rounded-md bg-muted/40 border border-transparent hover:border-border transition-all cursor-move"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', ps.id)
                    }}
                  >
                    <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm truncate">{ps.full_name}</h4>
                              <p className="text-[11px] text-muted-foreground truncate">{ps.username}</p>
                              <span className={`mt-1 inline-block px-1.5 py-0.5 text-[10px] rounded ${branchPill(ps.branch)}`}>{ps.branch}</span>
                      </div>
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredPS.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <div className="font-medium">No PS Members</div>
                        <div className="text-xs">
                    {selectedBranch === 'all' 
                      ? 'No PS members available.'
                            : `No unassigned PS in ${selectedBranch}.`}
                        </div>
                </div>
              )}
            </CardContent>
          </Card>
              </div>
            </div>

            {/* Right column: Assignments / Overview */}
            <div className="lg:col-span-8 space-y-4">
              {view === 'overview' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getFilteredTeamLeaders.map((tl) => (
                      <Card key={tl.id} className="rounded-xl shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="py-3">
                          <CardTitle className="flex items-center justify-between text-sm">
                            <div className="flex items-center min-w-0">
                              <Users className="h-4 w-4 mr-2" />
                              <span className="truncate">{tl.full_name}</span>
                            </div>
                            <Badge variant="outline" className="text-[11px]">{tl.assigned_ps.length} PS</Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">{tl.username} • {tl.branch}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-xs text-muted-foreground">
                            {tl.assigned_ps.length > 0 ? `Has ${tl.assigned_ps.length} assigned` : 'No assignments yet'}
                          </div>
                          <div className="mt-2">
                            <Button size="sm" onClick={() => setView('assignments')}>View details</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {getFilteredTeamLeaders.length === 0 && (
                    <Card className="rounded-xl shadow-sm">
                      <CardContent className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <div className="text-sm font-medium">
                          {selectedBranch === 'all' ? 'No Team Leaders' : `No Team Leaders in ${selectedBranch}`}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedBranch === 'all'
                            ? 'Create a team leader to start assigning PS members.'
                            : `Create a team leader for ${selectedBranch} to start assigning PS members.`}
                        </p>
                        <Button className="mt-3" onClick={() => setIsAddDialogOpen(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          {selectedBranch === 'all' ? 'Create Leader' : `Create in ${selectedBranch}`}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {view !== 'overview' && (
                <>
                  {view === 'assignments' && getFilteredTeamLeaders.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">
                Team Leaders {selectedBranch !== 'all' && `in ${selectedBranch}`}
              </h3>
                          <p className="text-xs text-muted-foreground">
                {selectedBranch === 'all' 
                              ? 'All team leaders'
                              : `Team leaders from ${selectedBranch} only`}
              </p>
            </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getFilteredTeamLeaders.map((teamLeader) => (
                          <Card key={teamLeader.id} className="rounded-xl shadow-sm">
                <CardHeader className="py-3">
                              <CardTitle className="flex items-center justify-between text-sm">
                                <div className="flex items-center min-w-0">
                      <Users className="h-4 w-4 mr-2" />
                                  <span className="truncate">{teamLeader.full_name}</span>
                    </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                      {teamLeader.assigned_ps.length} PS
                    </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAssignTargetTeamLeaderId(teamLeader.id)
                                      setAssignSelectedPsId(filteredPS[0]?.id || null)
                                      setIsAssignDialogOpen(true)
                                    }}
                                  >
                                    Assign
                                  </Button>
                                </div>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {teamLeader.username} • {teamLeader.branch}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div
                                className="min-h-[120px] p-3 rounded-md border border-dashed border-border/60 hover:border-primary/50 transition-colors bg-background"
                    onDragOver={(e) => {
                      e.preventDefault()
                                  e.currentTarget.classList.add('bg-muted/30')
                    }}
                    onDragLeave={(e) => {
                                  e.currentTarget.classList.remove('bg-muted/30')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                                  e.currentTarget.classList.remove('bg-muted/30')
                      const psUserId = e.dataTransfer.getData('text/plain')
                      handleAssignPS(psUserId, teamLeader.id)
                    }}
                  >
                    {teamLeader.assigned_ps.length === 0 ? (
                                  <div className="text-center text-muted-foreground py-6 text-sm">
                                    Drop PS here to assign to this leader
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {teamLeader.assigned_ps.map((assignment) => (
                          <div
                            key={assignment.id}
                                        className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                                      >
                                        <div className="min-w-0">
                                          <h4 className="font-medium text-sm truncate">{assignment.ps_user.full_name}</h4>
                                          <p className="text-[11px] text-muted-foreground truncate">{assignment.ps_user.username}</p>
                                          <span className={`mt-1 inline-block px-1.5 py-0.5 text-[10px] rounded ${branchPill(assignment.ps_user.branch)}`}>{assignment.ps_user.branch}</span>
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
                    </div>
                  )}

                  {view === 'unassigned' && (
                    <Card className="rounded-xl shadow-sm">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Unassigned PS</CardTitle>
                        <CardDescription className="text-xs">Filtered list</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {filteredPS.map((ps) => (
                            <div key={ps.id} className="p-3 border rounded-md bg-card hover:shadow-sm transition-all">
                              <div className="font-medium text-sm truncate">{ps.full_name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{ps.username}</div>
                              <Badge variant="secondary" className="mt-1 px-1.5 py-0.5 text-[10px]">{ps.branch}</Badge>
                            </div>
                          ))}
                        </div>
                        {filteredPS.length === 0 && (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <div className="font-medium">No PS Members</div>
                            <div className="text-xs">
                              {selectedBranch === 'all'
                                ? 'No PS members available.'
                                : `No unassigned PS in ${selectedBranch}.`}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {view === 'assignments' && getFilteredTeamLeaders.length === 0 && (
                    <Card className="rounded-xl shadow-sm">
              <CardContent className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-sm font-medium">
                  {selectedBranch === 'all' ? 'No Team Leaders' : `No Team Leaders in ${selectedBranch}`}
                </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                  {selectedBranch === 'all' 
                            ? 'Create team leaders to start assigning PS members.'
                            : `Create team leaders for ${selectedBranch} to start assigning PS members.`}
                </p>
                        <Button className="mt-3" onClick={() => setIsAddDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                          {selectedBranch === 'all' ? 'Create First Team Leader' : `Create for ${selectedBranch}`}
                </Button>
              </CardContent>
            </Card>
          )}
                </>
              )}
            </div>
          </div>
        </div>
      </RoleGuard>
    </DashboardLayout>
  )
}


