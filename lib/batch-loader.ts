/**
 * Batch loading utility to reduce API calls by combining multiple requests
 */

interface BatchRequest {
  id: string
  url: string
  options?: RequestInit
  resolve: (value: any) => void
  reject: (error: Error) => void
}

class BatchLoader {
  private pendingRequests = new Map<string, BatchRequest>()
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly batchDelay = 50 // 50ms delay to collect requests
  private readonly maxBatchSize = 10

  async addRequest<T>(
    id: string, 
    url: string, 
    options?: RequestInit
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // If there's already a pending request for this ID, return the existing promise
      if (this.pendingRequests.has(id)) {
        const existing = this.pendingRequests.get(id)!
        return existing.resolve(resolve as any)
      }

      const request: BatchRequest = {
        id,
        url,
        options,
        resolve: resolve as any,
        reject
      }

      this.pendingRequests.set(id, request)

      // Schedule batch processing
      this.scheduleBatch()
    })
  }

  private scheduleBatch() {
    if (this.batchTimeout) {
      return
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch()
    }, this.batchDelay)
  }

  private async processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    const requests = Array.from(this.pendingRequests.values())
    this.pendingRequests.clear()

    if (requests.length === 0) {
      return
    }

    // Process requests in batches
    const batches = this.chunkArray(requests, this.maxBatchSize)
    
    for (const batch of batches) {
      await this.processBatchChunk(batch)
    }
  }

  private async processBatchChunk(requests: BatchRequest[]) {
    const promises = requests.map(async (request) => {
      try {
        const response = await fetch(request.url, request.options)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        request.resolve(data)
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error('Unknown error'))
      }
    })

    await Promise.allSettled(promises)
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  // Clear all pending requests
  clear() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    // Reject all pending requests
    for (const request of this.pendingRequests.values()) {
      request.reject(new Error('Batch loader cleared'))
    }
    
    this.pendingRequests.clear()
  }

  // Get current pending request count
  getPendingCount(): number {
    return this.pendingRequests.size
  }
}

// Global batch loader instance
export const batchLoader = new BatchLoader()

/**
 * Add a request to the batch loader
 */
export async function batchRequest<T>(
  id: string,
  url: string,
  options?: RequestInit
): Promise<T> {
  return batchLoader.addRequest<T>(id, url, options)
}

/**
 * Clear all pending batch requests
 */
export function clearBatchRequests() {
  batchLoader.clear()
}
