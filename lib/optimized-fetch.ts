/**
 * Optimized fetch utilities with caching, deduplication, and rate limit awareness
 */

import { createClient } from './supabase'
import { deduplicatedFetch } from './request-deduplication'
import { cachedFetch } from './api-cache'

interface OptimizedFetchOptions extends RequestInit {
  ttl?: number // Cache time to live in milliseconds
  useCache?: boolean // Whether to use caching (default: true for GET requests)
  skipDeduplication?: boolean // Whether to skip request deduplication
}

/**
 * Optimized authenticated fetch with caching and deduplication
 */
export async function optimizedAuthenticatedFetch<T>(
  url: string, 
  options: OptimizedFetchOptions = {}
): Promise<T> {
  const { ttl = 5 * 60 * 1000, useCache = true, skipDeduplication = false, ...fetchOptions } = options
  
  // Get authentication token
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('No session token available')
  }

  // Prepare headers
  const headers = {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...fetchOptions.headers,
  }

  const requestOptions: RequestInit = {
    ...fetchOptions,
    headers,
  }

  // For GET requests, use caching if enabled
  if (requestOptions.method === 'GET' || !requestOptions.method) {
    if (useCache) {
      return cachedFetch<T>(url, requestOptions, ttl)
    }
  }

  // Use deduplication unless explicitly disabled
  if (!skipDeduplication) {
    const response = await deduplicatedFetch(url, requestOptions)
    return response.json()
  }

  // Direct fetch without deduplication
  const response = await fetch(url, requestOptions)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Optimized fetch for non-authenticated requests
 */
export async function optimizedFetch<T>(
  url: string, 
  options: OptimizedFetchOptions = {}
): Promise<T> {
  const { ttl = 5 * 60 * 1000, useCache = true, skipDeduplication = false, ...fetchOptions } = options

  // For GET requests, use caching if enabled
  if (fetchOptions.method === 'GET' || !fetchOptions.method) {
    if (useCache) {
      return cachedFetch<T>(url, fetchOptions, ttl)
    }
  }

  // Use deduplication unless explicitly disabled
  if (!skipDeduplication) {
    const response = await deduplicatedFetch(url, fetchOptions)
    return response.json()
  }

  // Direct fetch without deduplication
  const response = await fetch(url, fetchOptions)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Batch multiple requests to reduce API calls
 */
export async function batchRequests<T>(
  requests: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(requests.map(request => request()))
}

/**
 * Debounced fetch to prevent rapid successive calls
 */
export function createDebouncedFetch<T>(
  fetchFn: () => Promise<T>,
  delay: number = 300
): () => Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null
  let promise: Promise<T> | null = null

  return () => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(async () => {
        try {
          if (!promise) {
            promise = fetchFn()
          }
          const result = await promise
          promise = null
          resolve(result)
        } catch (error) {
          promise = null
          reject(error)
        }
      }, delay)
    })
  }
}
