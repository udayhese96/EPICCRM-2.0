/**
 * Retry helper for idempotent HTTP requests with exponential backoff and jitter
 */

interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  timeoutMs?: number
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 2,
    baseDelayMs = 150,
    maxDelayMs = 1000,
    timeoutMs = 10_000,
  } = opts

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Only retry on 5xx or network errors
      if (response.ok || response.status < 500) {
        return response
      }

      lastError = new Error(`HTTP ${response.status}`)
    } catch (err: any) {
      lastError = err
      
      // Don't retry on abort (timeout) or if it's the last attempt
      if (err.name === 'AbortError' || attempt === maxRetries) {
        throw err
      }
    }

    // Calculate delay with jitter
    if (attempt < maxRetries) {
      const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
      const jitter = Math.random() * exponentialDelay * 0.3 // ±30% jitter
      const delay = exponentialDelay + jitter
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

