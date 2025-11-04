type Bucket = { tokens: number; lastRefill: number }

const buckets = new Map<string, Bucket>()

function keyOf(kind: 'list' | 'summary', tlId?: string | null, tenantId?: string | null) {
  return `${tenantId || 'default'}:${kind}:${tlId || 'na'}`
}

export function rateLimit(
  kind: 'list' | 'summary', 
  tlId: string | null | undefined, 
  limitPerWindow: number, 
  windowMs: number,
  tenantId?: string | null
): {
  allowed: boolean
  retryAfter?: number
} {
  const key = keyOf(kind, tlId, tenantId)
  const now = Date.now()
  const capacity = limitPerWindow
  const refillRatePerMs = capacity / windowMs

  const bucket = buckets.get(key) || { tokens: capacity, lastRefill: now }

  // Refill
  const elapsed = now - bucket.lastRefill
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRatePerMs)
  bucket.lastRefill = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    buckets.set(key, bucket)
    return { allowed: true }
  }

  buckets.set(key, bucket)
  const needed = 1 - bucket.tokens
  const retryAfter = Math.ceil((needed / refillRatePerMs) / 1000)
  return { allowed: false, retryAfter }
}


