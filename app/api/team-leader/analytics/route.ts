import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // 1. Get the authenticated user (Team Leader)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ [TL Analytics API] Authentication error:', userError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get Team Leader's details from users table
    const { data: teamLeaderProfile, error: profileError } = await supabase
      .from('users')
      .select('id, username, full_name, branch, role')
      .eq('id', user.id)
      .single()

    if (profileError || !teamLeaderProfile || teamLeaderProfile.role !== 'team_leader') {
      console.error('❌ [TL Analytics API] Team Leader profile not found or role mismatch:', profileError?.message)
      return NextResponse.json({ error: 'Team Leader profile not found or unauthorized role' }, { status: 403 })
    }

    const teamLeaderId = teamLeaderProfile.id
    const teamLeaderBranch = teamLeaderProfile.branch
    console.log(`✅ [TL Analytics API] Authenticated Team Leader: ${teamLeaderProfile.full_name} (${teamLeaderId}) in branch: ${teamLeaderBranch}`)

    // 3. Get all PS users assigned to this Team Leader in their branch
    const { data: assignedPS, error: psError } = await supabase
      .from('users')
      .select('id, username, full_name, branch')
      .eq('team_leader_id', teamLeaderId)
      .eq('branch', teamLeaderBranch)
      .eq('role', 'ps')
      .eq('is_active', true)

    if (psError) {
      console.error('❌ [TL Analytics API] Error fetching assigned PS users:', psError.message)
      return NextResponse.json({ error: 'Failed to fetch assigned PS users' }, { status: 500 })
    }

    const psIds = assignedPS ? assignedPS.map(ps => ps.id) : []
    if (psIds.length === 0) {
      console.warn(`⚠️ [TL Analytics API] No PS users assigned to Team Leader ${teamLeaderProfile.full_name} in branch ${teamLeaderBranch}. Returning empty data.`)
      return NextResponse.json([]) // Return empty array if no PS are assigned
    }
    console.log(`👥 [TL Analytics API] Assigned PS IDs: ${psIds.join(', ')}`)

    // 4. Get authorization token for FastAPI
    const headerAuth = request.headers.get('Authorization')
    const cookieToken = request.cookies.get('access_token')?.value
    const token = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')
    
    if (!token) {
      console.error('❌ [TL Analytics API] No authentication token found')
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    // 5. Fetch PS follow-up data filtered by assigned PS users and branch
    console.log(`🔄 Using FastAPI URL: ${FASTAPI_BASE_URL}`)
    const response = await fetch(`${FASTAPI_BASE_URL}/api/ps-followup`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ [TL Analytics API] FastAPI error:', errorData)
      return NextResponse.json({ error: errorData.detail || 'Failed to fetch PS follow-up data' }, { status: response.status })
    }

    const allData = await response.json()
    console.log(`📊 [TL Analytics API] Fetched ${allData.length} total PS follow-up records`)

    // 6. Filter data to only include leads from assigned PS users in the Team Leader's branch
    const filteredData = allData.filter((item: any) => 
      psIds.includes(item.ps_id) && 
      item.ps_branch === teamLeaderBranch
    )

    console.log(`✅ [TL Analytics API] Filtered to ${filteredData.length} records for Team Leader's assigned PS users`)
    return NextResponse.json(filteredData)

  } catch (error) {
    console.error('❌ [TL Analytics API] Internal server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
