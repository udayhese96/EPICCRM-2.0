import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FASTAPI_URL = process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com')

export async function POST(request: NextRequest) {
  try {
    const headerAuth = request.headers.get('authorization')
    const cookieToken = request.cookies.get('access_token')?.value
    const auth = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[NextJS API] Processing bulk lead upload...')
    
    // Get the form data
    const formData = await request.formData()
    
    // Forward to FastAPI
    const response = await fetch(`${FASTAPI_URL}/api/admin/leads/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': auth 
      },
      body: formData
    })

    console.log('[NextJS API] FastAPI response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[NextJS API] Upload failed:', errorText)
      try {
        const errorJson = JSON.parse(errorText)
        return NextResponse.json(errorJson, { status: response.status })
      } catch {
        return NextResponse.json(
          { error: 'Upload failed', detail: errorText },
          { status: response.status }
        )
      }
    }

    const result = await response.json()
    console.log('[NextJS API] Upload result:', result)
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in upload route:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    )
  }
}

