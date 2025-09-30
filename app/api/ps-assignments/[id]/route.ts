import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user has permission to delete assignments
    if (userData.role !== 'admin' && userData.role !== 'branch_head') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const assignmentId = params.id

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
    }

    // Check if assignment exists
    const { data: assignment, error: assignmentError } = await supabase
      .from('ps_assignments')
      .select('id')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Delete the assignment
    const { error: deleteError } = await supabase
      .from('ps_assignments')
      .delete()
      .eq('id', assignmentId)

    if (deleteError) {
      console.error('Error deleting PS assignment:', deleteError)
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Assignment deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/ps-assignments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user has permission to update assignments
    if (userData.role !== 'admin' && userData.role !== 'branch_head') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const assignmentId = params.id
    const body = await request.json()
    const { sales_team_leader_id } = body

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
    }

    if (!sales_team_leader_id) {
      return NextResponse.json({ error: 'sales_team_leader_id is required' }, { status: 400 })
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

    // Check if assignment exists
    const { data: assignment, error: assignmentError } = await supabase
      .from('ps_assignments')
      .select('id')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Update the assignment
    const { data: updatedAssignment, error: updateError } = await supabase
      .from('ps_assignments')
      .update({
        sales_team_leader_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating PS assignment:', updateError)
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
    }

    return NextResponse.json(updatedAssignment)
  } catch (error) {
    console.error('Error in PUT /api/ps-assignments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
