import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get all team leader assignments
    const { data: assignments, error } = await supabase
      .from('team_leader_assignments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching team leader assignments:', error)
      // Return empty data to avoid frontend crash
      return NextResponse.json({ assignments: [] }, { status: 200 })
    }

    // Get PS users and team leaders separately
    const psUserIds = assignments?.map(a => a.ps_user_id) || []
    const teamLeaderIds = assignments?.map(a => a.team_leader_id) || []

    // Fetch PS users from unified users table (skip if no ids)
    const { data: psUsers } = psUserIds.length > 0
      ? await supabase
          .from('users')
          .select('id, username, full_name, email, branch')
          .in('id', psUserIds)
          .eq('role', 'ps')
      : { data: [] as any[] }

    // Fetch team leaders from unified users table (skip if no ids)
    const { data: teamLeaders } = teamLeaderIds.length > 0
      ? await supabase
          .from('users')
          .select('id, username, full_name, email, branch')
          .in('id', teamLeaderIds)
          .eq('role', 'team_leader')
      : { data: [] as any[] }

    // Combine the data
    const assignmentsWithUsers = assignments?.map(assignment => ({
      ...assignment,
      ps_user: psUsers?.find(ps => ps.id === assignment.ps_user_id),
      team_leader: teamLeaders?.find(tl => tl.id === assignment.team_leader_id)
    })) || []

    return NextResponse.json({ assignments: assignmentsWithUsers })
  } catch (error) {
    console.error('Error in team leader assignments GET:', error)
    // Return empty data to avoid frontend crash on .map
    return NextResponse.json({ assignments: [] }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { ps_user_id, team_leader_id } = body

    if (!ps_user_id || !team_leader_id) {
      return NextResponse.json({ error: 'ps_user_id and team_leader_id are required' }, { status: 400 })
    }

    // Check if PS user is already assigned
    const { data: existingAssignment } = await supabase
      .from('team_leader_assignments')
      .select('id')
      .eq('ps_user_id', ps_user_id)
      .single()

    if (existingAssignment) {
      return NextResponse.json({ error: 'PS user is already assigned to a team leader' }, { status: 400 })
    }

    // Create new assignment
    const { data: assignment, error } = await supabase
      .from('team_leader_assignments')
      .insert({
        ps_user_id,
        team_leader_id
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating team leader assignment:', error)
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
    }

    // Fetch user details separately from unified users table
    const { data: psUser } = await supabase
      .from('users')
      .select('id, username, full_name, email, branch')
      .eq('id', ps_user_id)
      .eq('role', 'ps')
      .single()

    const { data: teamLeader } = await supabase
      .from('users')
      .select('id, username, full_name, email, branch')
      .eq('id', team_leader_id)
      .eq('role', 'team_leader')
      .single()

    const assignmentWithUsers = {
      ...assignment,
      ps_user: psUser,
      team_leader: teamLeader
    }

    return NextResponse.json({ assignment: assignmentWithUsers })
  } catch (error) {
    console.error('Error in team leader assignments POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
