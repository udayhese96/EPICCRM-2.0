import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    console.log('[NextJS API] Auth header:', authHeader ? 'Present' : 'Missing')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[NextJS API] No valid auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('[NextJS API] Token length:', token.length)
    
    const body = await request.json()
    console.log('[NextJS API] Request body:', body)
    
    // Forward to FastAPI backend
    console.log('[NextJS API] Forwarding to FastAPI...')
    const response = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/api/cre-team-leader/remove-cre-branch-assignment`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    console.log('[NextJS API] FastAPI response status:', response.status)
    if (!response.ok) {
      const error = await response.text()
      console.log('[NextJS API] FastAPI error:', error)
      return NextResponse.json({ error: 'Failed to remove CRE branch assignment' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error removing CRE branch assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
