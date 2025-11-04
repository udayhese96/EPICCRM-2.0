import { NextRequest } from 'next/server'

export interface AuthContext {
  bearer: string
  tenantId?: string
  tlId?: string
}

export function getAuthFromRequest(request: NextRequest): AuthContext {
  const headerAuth = request.headers.get('authorization') || request.headers.get('Authorization')
  const cookieToken = request.cookies.get('access_token')?.value
  const bearer = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')

  // Best-effort extraction (non-authoritative) from headers/query for observability and cache keys
  const url = new URL(request.url)
  const tlId = url.searchParams.get('team_leader_id') || request.headers.get('x-tl-id') || undefined
  const tenantId = url.searchParams.get('tenant_id') || request.headers.get('x-tenant-id') || undefined

  return { bearer, tenantId, tlId }
}


