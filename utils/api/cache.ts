type CacheEntry<T> = { value: T; expiresAt: number }

export class SimpleLRUCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>()
  private order: string[] = []
  constructor(private maxEntries = 200) {}

  get(key: string): T | undefined {
    const now = Date.now()
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (entry.expiresAt < now) {
      this.delete(key)
      return undefined
    }
    this.touch(key)
    return entry.value
  }

  set(key: string, value: T, ttlMs: number) {
    const expiresAt = Date.now() + Math.max(ttlMs, 0)
    this.store.set(key, { value, expiresAt })
    this.touch(key)
    this.trim()
  }

  delete(key: string) {
    this.store.delete(key)
    const idx = this.order.indexOf(key)
    if (idx >= 0) this.order.splice(idx, 1)
  }

  private touch(key: string) {
    const idx = this.order.indexOf(key)
    if (idx >= 0) this.order.splice(idx, 1)
    this.order.push(key)
  }

  private trim() {
    while (this.order.length > this.maxEntries) {
      const oldest = this.order.shift()
      if (oldest) this.store.delete(oldest)
    }
  }
}

// Global singleton for summaries
export const summaryCache = new SimpleLRUCache<any>(300)

/**
 * Check if cache should be bypassed based on request headers
 */
export function shouldBypassCache(request: { headers: { get(name: string): string | null } }): boolean {
  const cacheControl = request.headers.get('cache-control')
  if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
    return true
  }
  return false
}


