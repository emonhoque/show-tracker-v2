/**
 * Request deduplication utility to prevent multiple identical requests
 * This helps reduce the number of API calls and prevents rate limiting
 */

interface PendingRequest {
  promise: Promise<any>
  timestamp: number
}

// Store for pending requests
const pendingRequests = new Map<string, PendingRequest>()

// Clean up old requests every 5 minutes
setInterval(() => {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minutes
  
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
  
  // Check if there's already a pending request for this key
  const existing = pendingRequests.get(key)
  if (existing) {
    // Return the existing promise
    return existing.promise
  }
  
  // Create new request
  const promise = fetch(url, options)
  pendingRequests.set(key, {
    promise,
    timestamp: Date.now()
  })
  
  try {
    const response = await promise
    // Remove from pending requests once completed
    pendingRequests.delete(key)
    return response
  } catch (error) {
    // Remove from pending requests on error
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
