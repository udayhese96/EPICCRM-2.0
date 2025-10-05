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
  Loader2,
  Plus,
  X
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
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-block p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              Walk-in CRE Assignment
            </h1>
            <p className="text-gray-600 mt-3 text-lg">
              Assign CREs to branches for walk-in follow-up responsibilities
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Available CREs */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-xl rounded-3xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-gray-800">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mr-3">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    Available CREs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {creUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-block p-4 bg-gray-100 rounded-2xl mb-3">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No active CREs found</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {creUsers.map((cre) => (
                        <div 
                          key={cre.id} 
                          className="group flex items-center space-x-3 p-4 border-0 bg-gradient-to-br from-gray-50 to-white rounded-2xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                        >
                          <div className={`w-3 h-3 rounded-full shadow-lg ${cre.is_active ? 'bg-gradient-to-br from-green-400 to-green-500' : 'bg-gradient-to-br from-red-400 to-red-500'}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-800 truncate">{cre.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{cre.username}</p>
                            {cre.branch && (
                              <Badge className="text-xs mt-2 rounded-full bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border-0">
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
              <Card className="border-0 shadow-xl rounded-3xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-gray-800">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mr-3">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    Branch Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {BRANCHES.map((branch) => {
                      const assignedCREs = assignments.filter(a => a.branch === branch)
                      console.log(`[DEBUG] Branch ${branch} assigned CREs:`, assignedCREs)

                      return (
                        <div key={branch} className="border-0 bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-shadow duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl">
                                <Building2 className="h-5 w-5 text-white" />
                              </div>
                              <h3 className="font-bold text-lg text-gray-900">{branch}</h3>
                            </div>
                            <Badge className="rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 px-4 py-1 shadow-md">
                              {assignedCREs.length} CRE{assignedCREs.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>

                          <div className="space-y-4">
                            {/* Add New CRE */}
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center">
                                <Plus className="h-4 w-4 mr-2 text-orange-500" />
                                Add CRE to {branch}
                              </label>
                              <div className="flex space-x-2">
                                <select
                                  className="flex-1 px-4 py-3 border-0 bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm text-gray-700 font-medium transition-all duration-200 hover:shadow-md"
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
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                                  <UserCheck className="h-4 w-4 mr-2 text-green-500" />
                                  Currently Assigned CREs:
                                </h4>
                                {assignedCREs.map((assignedCRE) => {
                                  const cre = creUsers.find(c => c.id === assignedCRE.cre_id)
                                  console.log('[DEBUG] Assigned CRE:', assignedCRE)
                                  console.log('[DEBUG] Found CRE in creUsers:', cre)
                                  console.log('[DEBUG] All creUsers:', creUsers)
                                  return (
                                    <div key={assignedCRE.cre_id} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-0 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3 flex-1">
                                          <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                                            <UserCheck className="h-4 w-4 text-white" />
                                          </div>
                                          <div>
                                            <p className="font-semibold text-green-900">
                                              {assignedCRE.cre_name || 'Unknown CRE'}
                                            </p>
                                            <p className="text-sm text-green-700">
                                              Assigned: {new Date(assignedCRE.assigned_at).toLocaleDateString()}
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleRemoveCREFromBranch(branch, assignedCRE.cre_id)}
                                          disabled={saving}
                                          className="border-0 bg-white text-red-600 hover:bg-red-50 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 px-4"
                                        >
                                          <X className="h-4 w-4 mr-1" />
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {assignedCREs.length === 0 && (
                              <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-50 border-0 rounded-2xl text-center">
                                <div className="inline-block p-3 bg-white rounded-2xl mb-3">
                                  <User className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-gray-500 text-sm font-medium">No CREs assigned to this branch</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Refresh Button */}
                  <div className="mt-8 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        loadCREUsers()
                        loadAssignments()
                      }}
                      disabled={loading}
                      className="border-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base font-semibold"
                    >
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #fb923c, #f97316);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #f97316, #ea580c);
        }
      `}</style>
    </DashboardLayout>
  )
}
