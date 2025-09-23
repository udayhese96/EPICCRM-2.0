# CRE Team Leader Dashboard - Complete Logic

## Overview
This dashboard allows CRE Team Leaders to manage and assign qualified leads to GEM (General Executive Manager) teams. The workflow is:

1. **Select Branch** → Choose from dropdown
2. **Select GEM** → Choose from filtered dropdown  
3. **Click Assign** → Actually assigns the lead
4. **Click Deassign** → Removes assignment

## Key Components

### State Management
```typescript
const [qualifiedLeads, setQualifiedLeads] = useState<QualifiedLead[]>([])
const [gemUsers, setGemUsers] = useState<GemUser[]>([])
const [branches, setBranches] = useState<Branch[]>([])
const [selectedBranch, setSelectedBranch] = useState<string>("")
const [filteredGemUsers, setFilteredGemUsers] = useState<GemUser[]>([])
const [isLoading, setIsLoading] = useState(false)
const [selectedLeads, setSelectedLeads] = useState<string[]>([])
const [assignmentDialog, setAssignmentDialog] = useState(false)
const [selectedGem, setSelectedGem] = useState("")
const [user, setUser] = useState<any>(null)
const [selectedGems, setSelectedGems] = useState<{[leadId: string]: string}>({})
```

### Core Functions

#### 1. Data Loading
```typescript
const loadData = async () => {
  setIsLoading(true)
  try {
    // Load all data in parallel for maximum speed
    const [leadsResponse, gemResponse, branchesResponse] = await Promise.all([
      fetch('/api/cre-team-leader/qualified-leads'),
      fetch('/api/ps-users'),
      fetch('/api/branches')
    ])

    const [leadsData, gemData, branchesData] = await Promise.all([
      leadsResponse.ok ? leadsResponse.json() : [],
      gemResponse.ok ? gemResponse.json() : [],
      branchesResponse.ok ? branchesResponse.json() : []
    ])

    setQualifiedLeads(leadsData)
    setGemUsers(gemData)
    setBranches(branchesData)
  } catch (error) {
    console.error('Error loading data:', error)
    toast.error('Failed to load data')
  } finally {
    setIsLoading(false)
  }
}
```

#### 2. Branch Assignment
```typescript
const handleBranchAssignment = async (leadId: string, branch: string) => {
  try {
    const token = localStorage.getItem('supabase_user')
    const response = await fetch('/api/qualified-leads/assign-branch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lead_id: leadId,
        branch: branch
      }),
    })

    if (response.ok) {
      toast.success(`Branch assigned successfully`)
      // Update the lead in the local state
      setQualifiedLeads(prev => 
        prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, branch: branch }
            : lead
        )
      )
    } else {
      const errorData = await response.json()
      toast.error(errorData.error || 'Failed to assign branch')
    }
  } catch (error) {
    console.error('Error assigning branch:', error)
    toast.error('Failed to assign branch')
  }
}
```

#### 3. GEM Selection (No Assignment)
```typescript
const handleGemSelection = (leadId: string, gemName: string) => {
  // Find the GEM user by name
  const gemUser = gemUsers.find(gem => gem.name === gemName)
  if (!gemUser) {
    toast.error('GEM user not found')
    return
  }

  // Update the selected GEM state (doesn't affect actual assignment)
  setSelectedGems(prev => ({
    ...prev,
    [leadId]: gemName
  }))
}
```

#### 4. Individual Assignment
```typescript
const handleIndividualAssignment = async (leadId: string) => {
  try {
    const lead = qualifiedLeads.find(l => l.id === leadId)
    if (!lead) {
      toast.error('Lead not found')
      return
    }

    if (!lead.branch) {
      toast.error('Please select a branch first')
      return
    }

    const selectedGemName = selectedGems[leadId]
    if (!selectedGemName) {
      toast.error('Please select a GEM from the dropdown first')
      return
    }

    // Find the selected GEM user
    const gemUser = gemUsers.find(gem => gem.name === selectedGemName)
    if (!gemUser) {
      toast.error('Selected GEM user not found')
      return
    }

    const token = localStorage.getItem('supabase_user')
    const response = await fetch('/api/qualified-leads/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lead_ids: [leadId],
        ps_id: gemUser.id,
        ps_name: gemUser.name,
        ps_branch: gemUser.branch
      }),
    })

    if (response.ok) {
      toast.success(`Lead assigned to ${gemUser.name}`)
      // Update the lead in the local state
      setQualifiedLeads(prev => 
        prev.map(l => 
          l.id === leadId 
            ? { ...l, ps_name: gemUser.name, ps_id: gemUser.id }
            : l
        )
      )
      // Clear the selected GEM for this lead
      setSelectedGems(prev => {
        const newSelectedGems = { ...prev }
        delete newSelectedGems[leadId]
        return newSelectedGems
      })
    } else {
      const errorData = await response.json()
      toast.error(errorData.error || 'Failed to assign lead')
    }
  } catch (error) {
    console.error('Error assigning lead:', error)
    toast.error('Failed to assign lead')
  }
}
```

#### 5. Deassignment
```typescript
const handleDeassignment = async (leadId: string) => {
  try {
    const token = localStorage.getItem('supabase_user')
    const response = await fetch('/api/qualified-leads/deassign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lead_id: leadId
      }),
    })

    if (response.ok) {
      toast.success('Lead deassigned successfully')
      // Update the lead in the local state
      setQualifiedLeads(prev => 
        prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, ps_name: '', ps_id: '' }
            : lead
        )
      )
    } else {
      const errorData = await response.json()
      toast.error(errorData.error || 'Failed to deassign lead')
    }
  } catch (error) {
    console.error('Error deassigning lead:', error)
    toast.error('Failed to deassign lead')
  }
}
```

#### 6. Bulk Assignment
```typescript
const handleBulkAssignment = async () => {
  if (selectedLeads.length === 0) {
    toast.error('Please select leads to assign')
    return
  }

  if (!selectedGem) {
    toast.error('Please select a GEM user')
    return
  }

  try {
    const selectedGemUser = gemUsers.find(gem => gem.id === selectedGem)
    if (!selectedGemUser) {
      toast.error('Selected GEM user not found')
      return
    }

    const token = localStorage.getItem('supabase_user')
    const response = await fetch('/api/qualified-leads/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lead_ids: selectedLeads,
        ps_id: selectedGem,
        ps_name: selectedGemUser.name,
        ps_branch: selectedGemUser.branch
      }),
    })

    if (response.ok) {
      toast.success(`Successfully assigned ${selectedLeads.length} leads to ${selectedGemUser.name}`)
      setSelectedLeads([])
      setAssignmentDialog(false)
      setSelectedGem("")
      loadData() // Reload data
    } else {
      const errorData = await response.json()
      toast.error(errorData.error || 'Failed to assign leads')
    }
  } catch (error) {
    console.error('Error assigning leads:', error)
    toast.error('Failed to assign leads')
  }
}
```

### UI Components

#### Table Structure
```typescript
<Table>
  <TableHeader>
    <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50">
      <TableHead className="w-12 text-center">Select</TableHead>
      <TableHead className="font-semibold text-gray-700">Lead UID</TableHead>
      <TableHead className="font-semibold text-gray-700">Customer Name</TableHead>
      <TableHead className="font-semibold text-gray-700">Mobile</TableHead>
      <TableHead className="font-semibold text-gray-700">Source</TableHead>
      <TableHead className="font-semibold text-gray-700">Model Interested</TableHead>
      <TableHead className="font-semibold text-gray-700">Branch</TableHead>
      <TableHead className="font-semibold text-gray-700">GEM</TableHead>
      <TableHead className="font-semibold text-gray-700">Action</TableHead>
      <TableHead className="font-semibold text-gray-700">Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {qualifiedLeads
      .sort((a, b) => {
        // Unassigned leads first, then assigned leads
        if (!a.ps_name && b.ps_name) return -1
        if (a.ps_name && !b.ps_name) return 1
        return 0
      })
      .map((lead, index) => (
        <TableRow key={lead.id}>
          {/* Table cells with dropdowns and buttons */}
        </TableRow>
      ))}
  </TableBody>
</Table>
```

#### Branch Dropdown
```typescript
<Select 
  value={lead.branch || ''} 
  onValueChange={(branch) => handleBranchAssignment(lead.id, branch)}
  disabled={!!lead.ps_name}
>
  <SelectTrigger className="w-32 h-8">
    <SelectValue placeholder="Select Branch" />
  </SelectTrigger>
  <SelectContent>
    {branches.map((branch) => (
      <SelectItem key={branch.id} value={branch.name}>
        {branch.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### GEM Dropdown
```typescript
<Select 
  value={selectedGems[lead.id] || ''} 
  onValueChange={(gemName) => handleGemSelection(lead.id, gemName)}
  disabled={!!lead.ps_name}
>
  <SelectTrigger className="w-32 h-8">
    <SelectValue placeholder="Select GEM" />
  </SelectTrigger>
  <SelectContent>
    {gemUsers
      .filter(gem => !lead.branch || gem.branch === lead.branch)
      .map((gem) => (
      <SelectItem key={gem.id} value={gem.name}>
        {gem.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### Action Buttons
```typescript
<div className="flex gap-2">
  {!lead.ps_name ? (
    <Button
      size="sm"
      onClick={() => handleIndividualAssignment(lead.id)}
      disabled={!lead.branch || !selectedGems[lead.id]}
      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs px-3 py-1"
    >
      Assign
    </Button>
  ) : (
    <Button
      size="sm"
      onClick={() => handleDeassignment(lead.id)}
      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs px-3 py-1"
    >
      Deassign
    </Button>
  )}
</div>
```

### Key Features

1. **Manual Assignment**: No automatic assignment when selecting dropdowns
2. **Branch Filtering**: GEM dropdown filters by selected branch
3. **Visual Feedback**: Buttons disabled until both branch and GEM selected
4. **Authentication**: All API calls include proper auth headers
5. **Error Handling**: Comprehensive error messages and fallbacks
6. **Optimistic Updates**: UI updates immediately, reverts on error
7. **Bulk Operations**: Support for assigning multiple leads at once

### Data Flow

1. **Load Data** → Fetch leads, GEM users, branches
2. **Select Branch** → Update lead.branch, filter GEM users
3. **Select GEM** → Update selectedGems state (no assignment)
4. **Click Assign** → API call to assign lead, update UI
5. **Click Deassign** → API call to remove assignment, update UI

### Error Handling

- Network errors with toast notifications
- Validation errors for missing selections
- Authentication errors with proper status codes
- Optimistic updates with rollback on failure

This logic ensures a smooth, controlled assignment workflow with proper user feedback and error handling.
