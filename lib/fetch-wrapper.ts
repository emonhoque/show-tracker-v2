import { deduplicatedFetch } from './request-deduplication'
import { cachedFetch } from './api-cache'

export async function safeFetch(url: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await deduplicatedFetch(url, defaultOptions)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('Fetch failed, retrying without compression headers...')
      
      const retryOptions: RequestInit = {
        ...defaultOptions,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        }
      }
      
      const retryResponse = await deduplicatedFetch(url, retryOptions)
      
      if (!retryResponse.ok) {
        throw new Error(`HTTP error! status: ${retryResponse.status}`)
      }
      
      return retryResponse
    }
    
    throw error
  }
}

/**
 * Cached fetch wrapper for GET requests that can be safely cached
 * @param url - The request URL
 * @param options - Fetch options
 * @param ttl - Cache time to live in milliseconds (default: 5 minutes)
 * @returns Promise that resolves to the response data
 */
export async function cachedSafeFetch<T>(
  url: string, 
  options: RequestInit = {}, 
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  if (options.method && options.method !== 'GET') {
    const response = await safeFetch(url, options)
    return response.json()
  }
  
  return cachedFetch<T>(url, options, ttl)
}
