/**
 * Client-side API response caching utility
 * Helps reduce API calls and prevent rate limiting
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const cache = new Map<string, CacheEntry<unknown>>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key)
    }
  }
}, 2 * 60 * 1000)

/**
 * Generate cache key from URL and options
 */
function generateCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET'
  const body = options?.body ? JSON.stringify(options.body) : ''
  return `${method}:${url}:${body}`
}

/**
 * Get cached data if available and not expired
 */
function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  
  const now = Date.now()
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key)
    return null
  }
  
  return entry.data as T
}

/**
 * Set data in cache
 */
function setCachedData<T>(key: string, data: T, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

/**
 * Cached fetch function with automatic caching
 * @param url - The request URL
 * @param options - Fetch options
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns Promise that resolves to the response data
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  const key = generateCacheKey(url, options)
  
  const cached = getCachedData<T>(key)
  if (cached !== null) {
    return cached
  }
  
  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const data = await response.json()
  
  setCachedData(key, data, ttl)
  
  return data
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Clear cache for a specific URL pattern
 */
export function clearCacheForPattern(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number
  keys: string[]
} {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  }
}
