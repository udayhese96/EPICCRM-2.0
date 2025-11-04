import { useEffect, useState } from 'react'

interface BundleData {
  open_count: number
  won_count: number
  lost_count: number
  assigned_count: number
  pending_followup: {
    overdue: number
    today: number
    upcoming: number
  }
  source_mix: Array<{ source: string; count: number }>
  ps_headlines: Array<{
    ps_id: string | null
    ps_name: string
    won: number
    followups_today: number
  }>
}

interface UseBundleOptions {
  teamLeaderId?: string
  dateRange?: string
  startDate?: string
  endDate?: string
  enabled?: boolean
  refreshInterval?: number
}

export function useTeamLeaderBundle(opts: UseBundleOptions) {
  const [data, setData] = useState<BundleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<number>(0)

  const { teamLeaderId, dateRange = '30', startDate, endDate, enabled = true, refreshInterval = 20_000 } = opts

  const fetchBundle = async (signal?: AbortSignal) => {
    if (!teamLeaderId || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        team_leader_id: teamLeaderId,
        preset: dateRange,
      })

      if (startDate) params.append('start', startDate)
      if (endDate) params.append('end', endDate)

      const response = await fetch(`/api/team-leader/bundle?${params.toString()}`, {
        credentials: 'include',
        signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      setData(payload)
      setLastFetched(Date.now())
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[useTeamLeaderBundle] Error:', err)
        setError(err.message || 'Failed to fetch bundle')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled || !teamLeaderId) return

    const controller = new AbortController()
    fetchBundle(controller.signal)

    // Auto-refresh
    const interval = setInterval(() => {
      fetchBundle(controller.signal)
    }, refreshInterval)

    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [teamLeaderId, dateRange, startDate, endDate, enabled, refreshInterval])

  return { data, loading, error, refetch: () => fetchBundle(), lastFetched }
}

