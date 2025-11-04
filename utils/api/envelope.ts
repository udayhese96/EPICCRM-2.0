import { NextResponse } from 'next/server'
import crypto from 'crypto'

interface Envelope<T> {
  data: T
  page?: number
  page_size?: number
  total?: number
}

interface CacheOpts {
  sMaxAge?: number
  staleWhileRevalidate?: number
  etagKey?: string // optional precomputed key; if omitted we hash payload
}

interface RespondOpts {
  cache?: string | CacheOpts | null
  headers?: Record<string, string>
  requestETag?: string | null
}

export function respond<T>(payload: Envelope<T> | T, opts?: RespondOpts) {
  const headers: Record<string, string> = {}

  if (opts?.cache) {
    if (typeof opts.cache === 'string') {
      headers['Cache-Control'] = opts.cache
    } else {
      const parts: string[] = []
      if (opts.cache.sMaxAge != null) parts.push(`s-maxage=${opts.cache.sMaxAge}`)
      if (opts.cache.staleWhileRevalidate != null) parts.push(`stale-while-revalidate=${opts.cache.staleWhileRevalidate}`)
      if (parts.length) headers['Cache-Control'] = parts.join(', ')

      // ETag support
      const keySource = opts.cache.etagKey ?? stableStringify(payload)
      const etag = crypto.createHash('sha1').update(keySource).digest('hex')
      headers['ETag'] = etag
      if (opts.requestETag && opts.requestETag === etag) {
        // Return 304 Not Modified
        return new NextResponse(null, { status: 304, headers })
      }
    }
  }

  if (opts?.headers) Object.assign(headers, opts.headers)
  return NextResponse.json(payload as any, { headers })
}

export function respondError(message: string, status = 500, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

function stableStringify(obj: unknown): string {
  if (obj == null) return 'null'
  if (typeof obj !== 'object') return JSON.stringify(obj)
  try {
    // Deep stable stringify with sorted keys
    const sortedStringify = (o: any): any => {
      if (Array.isArray(o)) {
        return o.map(sortedStringify)
      }
      if (o && typeof o === 'object') {
        return Object.keys(o).sort().reduce((acc: any, key) => {
          acc[key] = sortedStringify(o[key])
          return acc
        }, {})
      }
      return o
    }
    return JSON.stringify(sortedStringify(obj))
  } catch {
    return JSON.stringify(obj)
  }
}


