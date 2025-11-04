import useSWR, { mutate } from 'swr'
import { useCallback, useEffect } from 'react'

interface UseTabDataOptions {
  teamLeaderId?: string
  dateRange?: string
  startDate?: string
  endDate?: string
  psMember?: string
  search?: string
  pageSize?: number
  cursor?: string
  enabled?: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function useTabData(tab: string, opts: UseTabDataOptions) {
  const { teamLeaderId, dateRange = '30', startDate, endDate, psMember = 'all', search = '', pageSize = 30, cursor, enabled = true } = opts

  // Build URL
  const buildUrl = useCallback((tabName: string, currentCursor?: string) => {
    if (!teamLeaderId) return null
    
    const params = new URLSearchParams({
      team_leader_id: teamLeaderId,
      date_range: dateRange,
      ps_member: psMember,
      page_size: String(pageSize),
      limit: String(pageSize), // Legacy fallback
      offset: '0',
    })
    
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (search) params.append('search', search)
    if (currentCursor) params.append('cursor', currentCursor)
    
    return `/api/team-leader/${tabName}?${params.toString()}`
  }, [teamLeaderId, dateRange, startDate, endDate, psMember, search, pageSize])

  const url = buildUrl(tab, cursor)

  // SWR with keepPreviousData to avoid flashing
  const { data, error, isLoading, isValidating } = useSWR(
    enabled && url ? url : null,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
    }
  )

  // Prefetch next page if cursor available
  useEffect(() => {
    if (data?.next_cursor && enabled && teamLeaderId) {
      const nextUrl = buildUrl(tab, data.next_cursor)
      if (nextUrl) {
        // Prefetch in background
        setTimeout(() => {
          mutate(nextUrl, fetcher(nextUrl), { revalidate: false })
        }, 100)
      }
    }
  }, [data?.next_cursor, enabled, teamLeaderId, tab, buildUrl])

  // Prefetch adjacent tabs
  const prefetchTab = useCallback((tabName: string) => {
    if (!teamLeaderId || !enabled) return
    const prefetchUrl = buildUrl(tabName)
    if (prefetchUrl) {
      mutate(prefetchUrl, fetcher(prefetchUrl), { revalidate: false })
    }
  }, [buildUrl, teamLeaderId, enabled])

  return {
    data: data?.data || data || [],
    nextCursor: data?.next_cursor,
    total: data?.total,
    isLoading: isLoading && !data,
    isValidating,
    error,
    prefetchTab,
  }
}

// Hook for warming connection on hover
export function useWarmConnection(url: string) {
  const warm = useCallback(() => {
    if (url && typeof window !== 'undefined') {
      // Send HEAD request to warm TLS/connection
      fetch(url, { method: 'HEAD', credentials: 'include' }).catch(() => {})
    }
  }, [url])

  return warm
}

