export interface RangeInput {
  preset?: string | number | null
  start?: string | null
  end?: string | null
  tz?: string | null
  clampDays?: number | null
}

export interface RangeOutput {
  startISO?: string
  endISO?: string
}

function toTZDate(date: Date, tz?: string | null): Date {
  // For now, rely on UTC ISO; future: use tz to compute boundaries if needed
  return date
}

export function deriveRange(input: RangeInput): RangeOutput {
  const { preset, start, end, tz, clampDays } = input

  // Custom explicit start/end
  if (start && end) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return { startISO: startDate.toISOString(), endISO: endDate.toISOString() }
  }

  const presetStr = (preset ?? 'all').toString()
  if (presetStr === 'all') {
    return {}
  }

  const now = new Date()
  const endDate = toTZDate(new Date(now), tz)
  endDate.setHours(23, 59, 59, 999)

  if (presetStr === 'today') {
    const startDate = toTZDate(new Date(now), tz)
    startDate.setHours(0, 0, 0, 0)
    return { startISO: startDate.toISOString(), endISO: endDate.toISOString() }
  }

  // numeric days fallback
  const days = Number.isNaN(Number(presetStr)) ? 30 : parseInt(presetStr)
  const maxDays = clampDays && clampDays > 0 ? clampDays : undefined
  const effectiveDays = maxDays ? Math.min(days, maxDays) : days

  const startDate = toTZDate(new Date(), tz)
  startDate.setDate(startDate.getDate() - effectiveDays)
  startDate.setHours(0, 0, 0, 0)

  return { startISO: startDate.toISOString(), endISO: endDate.toISOString() }
}


