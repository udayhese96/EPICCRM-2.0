import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details to check role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to view assignments
    if (userData.role !== 'admin' && userData.role !== 'branch_head') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch PS assignments with related user data
    const { data: assignments, error: assignmentsError } = await supabase
      .from('ps_assignments')
      .select(`
        id,
        ps_user_id,
        sales_team_leader_id,
        created_at,
        updated_at,
        ps_user:users!ps_assignments_ps_user_id_fkey(
          id,
          username,
          email,
          full_name,
          phone,
          branch,
          is_active
        ),
        sales_team_leader:users!ps_assignments_sales_team_leader_id_fkey(
          id,
          username,
          email,
          full_name,
          phone,
          branch,
          is_active
        )
      `)
      .order('created_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error fetching PS assignments:', assignmentsError)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    return NextResponse.json(assignments || [])
  } catch (error) {
    console.error('Error in GET /api/ps-assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details to check role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to create assignments
    if (userData.role !== 'admin' && userData.role !== 'branch_head') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { ps_user_id, sales_team_leader_id } = body

    if (!ps_user_id || !sales_team_leader_id) {
      return NextResponse.json({ error: 'ps_user_id and sales_team_leader_id are required' }, { status: 400 })
    }

    // Verify that the PS user exists and has role 'ps'
    const { data: psUser, error: psUserError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', ps_user_id)
      .eq('role', 'ps')
      .single()

    if (psUserError || !psUser) {
      return NextResponse.json({ error: 'PS user not found or invalid role' }, { status: 400 })
    }

    // Verify that the sales team leader exists and has role 'sales_team_leader'
    const { data: salesTeamLeader, error: salesTeamLeaderError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', sales_team_leader_id)
      .eq('role', 'sales_team_leader')
      .single()

    if (salesTeamLeaderError || !salesTeamLeader) {
      return NextResponse.json({ error: 'Sales team leader not found or invalid role' }, { status: 400 })
    }

    // Check if assignment already exists
    const { data: existingAssignment, error: existingError } = await supabase
      .from('ps_assignments')
      .select('id')
      .eq('ps_user_id', ps_user_id)
      .single()

    if (existingAssignment) {
      return NextResponse.json({ error: 'PS user is already assigned to a sales team leader' }, { status: 400 })
    }

    // Create the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('ps_assignments')
      .insert({
        ps_user_id,
        sales_team_leader_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (assignmentError) {
      console.error('Error creating PS assignment:', assignmentError)
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
    }

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ps-assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
