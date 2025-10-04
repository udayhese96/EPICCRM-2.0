'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  User,
  UserCheck,
  Building2,
  Save,
  RefreshCw,
  Loader2
} from 'lucide-react'

interface CREUser {
  id: string
  username: string
  email: string
  full_name: string
  branch?: string
  is_active: boolean
}

interface CREBranchAssignment {
  cre_id: string
  cre_name: string
  branch: string
  assigned_at: string
}

const BRANCHES = [
  'Mount Road',
  'Vysarapadi',
  'Cuddalore'
]

export default function AssignWalkinCREPage() {
  const [user, setUser] = useState<any>(null)
  const [creUsers, setCreUsers] = useState<CREUser[]>([])
  const [assignments, setAssignments] = useState<CREBranchAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCREs, setSelectedCREs] = useState<{[branch: string]: string[]}>({})

  // Function to get token from localStorage (same pattern as rest of app)
  const getToken = () => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('supabase_user') || localStorage.getItem('user')
      const parsed = session ? JSON.parse(session) : null
      const token = parsed?.access_token || ''
      console.log('[Frontend] Session found:', !!session)
      console.log('[Frontend] Token retrieved:', token ? 'Present' : 'Missing')
      console.log('[Frontend] Token length:', token.length)
      return token
    }
    return ''
  }

  // Load user data and CRE users
  useEffect(() => {
    const supabaseUser = localStorage.getItem("supabase_user")
    if (supabaseUser) {
      try {
        const userData = JSON.parse(supabaseUser)
        setUser(userData)
        loadAllData()
      } catch (error) {
        console.error("Error parsing user data:", error)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadCREUsers(),
        loadAssignments()
      ])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCREUsers = async () => {
    try {
      const response = await fetch('/api/cre-users', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      console.log('[Frontend] CRE users response status:', response.status)
      if (response.ok) {
        const users = await response.json()
        console.log('[Frontend] CRE users data:', users)
        console.log('[Frontend] CRE users data length:', users.length)
        users.forEach((user, index) => {
          console.log(`[Frontend] CRE User ${index}:`, user)
        })
        const activeUsers = users.filter((u: CREUser) => u.is_active)
        console.log('[Frontend] Active CRE users:', activeUsers.length)
        setCreUsers(activeUsers)
      } else {
        const errorText = await response.text()
        console.error('[Frontend] CRE users error:', response.status, errorText)
        toast.error(`Failed to load CRE users: ${response.status}`)
      }
    } catch (error) {
      console.error('Error loading CRE users:', error)
      toast.error('Failed to load CRE users')
    }
  }

  const loadAssignments = async () => {
    try {
      const token = getToken()
      console.log('[Frontend] Token retrieved:', token ? 'Present' : 'Missing')
      console.log('[Frontend] Token length:', token ? token.length : 0)
      const response = await fetch('/api/cre-team-leader/cre-branch-assignments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      console.log('[Frontend] CRE assignments response status:', response.status)
      if (response.ok) {
        const assignmentsData = await response.json()
        console.log('[Frontend] CRE assignments data:', assignmentsData)
        console.log('[Frontend] CRE assignments data length:', assignmentsData.length)
        assignmentsData.forEach((assignment, index) => {
          console.log(`[Frontend] Assignment ${index}:`, assignment)
        })
        setAssignments(assignmentsData)

        // Group CREs by branch (multiple CREs per branch)
        const selected: {[branch: string]: string[]} = {}
        assignmentsData.forEach((assignment: CREBranchAssignment) => {
          if (assignment.branch !== 'Unassigned') {
            if (!selected[assignment.branch]) {
              selected[assignment.branch] = []
            }
            selected[assignment.branch].push(assignment.cre_id)
          }
        })
        setSelectedCREs(selected)
      } else {
        const errorText = await response.text()
        console.error('[Frontend] CRE assignments error:', response.status, errorText)
        toast.error(`Failed to load assignments: ${response.status}`)
      }
    } catch (error) {
      console.error('Error loading assignments:', error)
      toast.error('Failed to load assignments')
    }
  }

  const handleAddCREToBranch = async (branch: string, creId: string) => {
    setSaving(true)
    try {
      const cre = creUsers.find(c => c.id === creId)
      if (!cre) {
        toast.error('Selected CRE not found')
        return
      }

      const response = await fetch('/api/cre-team-leader/assign-cre-branch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          cre_id: creId,
          branch: branch,
          assigned_by_tl_id: user?.id
        })
      })

      if (response.ok) {
        toast.success(`CRE ${cre.full_name} assigned to ${branch} branch`)
        await loadAssignments() // Refresh assignments
      } else {
        const error = await response.json()
        if (response.status === 409) {
          toast.warning(`CRE ${cre.full_name} is already assigned to ${branch} branch`)
        } else {
          toast.error(error.detail || 'Failed to assign CRE')
        }
      }
    } catch (error) {
      console.error('Error saving assignment:', error)
      toast.error('Failed to save assignment')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveCREFromBranch = async (branch: string, creId: string) => {
    setSaving(true)
    try {
      const cre = creUsers.find(c => c.id === creId)
      const creName = cre ? cre.full_name : 'CRE'

      const response = await fetch('/api/cre-team-leader/remove-cre-branch-assignment', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          cre_id: creId,
          branch: branch
        })
      })

      if (response.ok) {
        toast.success(`${creName} removed from ${branch} branch`)
        await loadAssignments() // Refresh assignments
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to remove CRE')
      }
    } catch (error) {
      console.error('Error removing assignment:', error)
      toast.error('Failed to remove assignment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Walk-in CRE Assignment
            </h1>
            <p className="text-gray-600 mt-2">
              Assign CREs to branches for walk-in follow-up responsibilities
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Available CREs */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Available CREs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {creUsers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No active CREs found</p>
                  ) : (
                    <div className="space-y-3">
                      {creUsers.map((cre) => (
                        <div key={cre.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                          <div className={`w-3 h-3 rounded-full ${cre.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{cre.full_name}</p>
                            <p className="text-xs text-gray-500">{cre.username}</p>
                            {cre.branch && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {cre.branch}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Branch Assignments */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Branch Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {BRANCHES.map((branch) => {
                      const assignedCREs = assignments.filter(a => a.branch === branch)
                      console.log(`[DEBUG] Branch ${branch} assigned CREs:`, assignedCREs)

                      return (
                        <div key={branch} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-gray-900">{branch}</h3>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {assignedCREs.length} CRE{assignedCREs.length !== 1 ? 's' : ''} assigned
                            </Badge>
                          </div>

                          <div className="space-y-4">
                            {/* Add New CRE */}
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Add CRE to {branch}
                              </label>
                              <div className="flex space-x-2">
                                <select
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAddCREToBranch(branch, e.target.value)
                                      e.target.value = '' // Reset selection
                                    }
                                  }}
                                >
                                  <option value="">Select CRE to add...</option>
                                  {creUsers
                                    .filter(cre => !assignedCREs.some(assigned => assigned.cre_id === cre.id))
                                    .map((cre) => (
                                      <option key={cre.id} value={cre.id}>
                                        {cre.full_name} ({cre.username})
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>

                            {/* Current Assignments */}
                            {assignedCREs.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700">Currently Assigned CREs:</h4>
                                {assignedCREs.map((assignedCRE) => {
                                  const cre = creUsers.find(c => c.id === assignedCRE.cre_id)
                                  console.log('[DEBUG] Assigned CRE:', assignedCRE)
                                  console.log('[DEBUG] Found CRE in creUsers:', cre)
                                  console.log('[DEBUG] All creUsers:', creUsers)
                                  return (
                                    <div key={assignedCRE.cre_id} className="p-3 bg-green-50 border border-green-200 rounded-md">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-green-900">
                                            {assignedCRE.cre_name || 'Unknown CRE'}
                                          </p>
                                          <p className="text-sm text-green-700">
                                            Assigned on: {new Date(assignedCRE.assigned_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleRemoveCREFromBranch(branch, assignedCRE.cre_id)}
                                          disabled={saving}
                                          className="text-red-600 border-red-300 hover:bg-red-50"
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {assignedCREs.length === 0 && (
                              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-center">
                                <p className="text-gray-500 text-sm">No CREs assigned to this branch</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Refresh Button */}
                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        loadCREUsers()
                        loadAssignments()
                      }}
                      disabled={loading}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
