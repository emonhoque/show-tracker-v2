/**
 * Request deduplication utility to prevent multiple identical requests
 * This helps reduce the number of API calls and prevents rate limiting
 */

interface PendingRequest {
  promise: Promise<any>
  timestamp: number
}

const pendingRequests = new Map<string, PendingRequest>()

setInterval(() => {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000  
  
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > maxAge) {
      pendingRequests.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Generate a unique key for a request based on URL and method
 */
function generateRequestKey(url: string, method: string = 'GET', body?: any): string {
  const bodyString = body ? JSON.stringify(body) : ''
  return `${method}:${url}:${bodyString}`
}

/**
 * Deduplicate requests by returning the same promise for identical requests
 * @param url - The request URL
 * @param options - Fetch options
 * @returns Promise that resolves to the response
 */
export async function deduplicatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const key = generateRequestKey(url, options.method || 'GET', options.body)
  
  const existing = pendingRequests.get(key)
  if (existing) {
    return existing.promise
  }
  
  const promise = fetch(url, options)
  pendingRequests.set(key, {
    promise,
    timestamp: Date.now()
  })
  
  try {
    const response = await promise
    pendingRequests.delete(key)
    return response
  } catch (error) {
    pendingRequests.delete(key)
    throw error
  }
}

/**
 * Clear all pending requests
 */
export function clearPendingRequests(): void {
  pendingRequests.clear()
}

/**
 * Get the number of currently pending requests
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size
}
