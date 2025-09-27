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
    const assignmentId = params.id

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
    }

    // Delete the assignment
    const { error } = await supabase
      .from('team_leader_assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      console.error('Error deleting team leader assignment:', error)
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Assignment deleted successfully' })
  } catch (error) {
    console.error('Error in team leader assignment DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const assignmentId = params.id
    const body = await request.json()
    const { team_leader_id } = body

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
    }

    if (!team_leader_id) {
      return NextResponse.json({ error: 'team_leader_id is required' }, { status: 400 })
    }

    // Update the assignment
    const { data: assignment, error } = await supabase
      .from('team_leader_assignments')
      .update({ team_leader_id })
      .eq('id', assignmentId)
      .select(`
        *,
        ps_user:users!ps_user_id (
          id,
          username,
          full_name,
          email,
          branch
        ),
        team_leader:users!team_leader_id (
          id,
          username,
          full_name,
          email,
          branch
        )
      `)
      .single()

    if (error) {
      console.error('Error updating team leader assignment:', error)
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
    }

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Error in team leader assignment PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
