/**
 * React hook for optimized API calls with caching, deduplication, and batching
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { optimizedAuthenticatedFetch } from '../optimized-fetch'
import { batchRequest } from '../batch-loader'

interface UseOptimizedApiOptions<T> {
  url: string
  options?: RequestInit
  ttl?: number
  enabled?: boolean
  useBatch?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface UseOptimizedApiReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  clearCache: () => void
}

export function useOptimizedApi<T>({
  url,
  options = {},
  ttl = 5 * 60 * 1000,  
  enabled = true,
  useBatch = false,
  onSuccess,
  onError
}: UseOptimizedApiOptions<T>): UseOptimizedApiReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const requestId = `${url}-${Date.now()}`
    requestIdRef.current = requestId

    setLoading(true)
    setError(null)

    try {
      let response: T

      if (useBatch) {
        response = await batchRequest<T>(requestId, url, {
          ...options,
          signal: abortControllerRef.current.signal
        })
      } else {
        response = await optimizedAuthenticatedFetch<T>(url, {
          ...options,
          signal: abortControllerRef.current.signal,
          ttl
        })
      }

      if (requestIdRef.current === requestId) {
        setData(response)
        onSuccess?.(response)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      
      const error = err instanceof Error ? err : new Error('Unknown error')
      
      if (requestIdRef.current === requestId) {
        setError(error)
        onError?.(error)
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [url, options, ttl, enabled, useBatch, onSuccess, onError])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const clearCache = useCallback(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (enabled) {
      fetchData()
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData, enabled])

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  }
}

/**
 * Hook for making multiple API calls efficiently
 */
export function useOptimizedApiBatch<T>(
  requests: Array<{
    id: string
    url: string
    options?: RequestInit
  }>,
  enabled: boolean = true
) {
  const [data, setData] = useState<Record<string, T | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, Error | null>>({})

  const fetchAll = useCallback(async () => {
    if (!enabled || requests.length === 0) return

    const initialLoading: Record<string, boolean> = {}
    const initialError: Record<string, Error | null> = {}
    
    requests.forEach(req => {
      initialLoading[req.id] = true
      initialError[req.id] = null
    })

    setLoading(initialLoading)
    setError(initialError)

    const promises = requests.map(async (req) => {
      try {
        const response = await batchRequest<T>(req.id, req.url, req.options)
        
        setData(prev => ({ ...prev, [req.id]: response }))
        setLoading(prev => ({ ...prev, [req.id]: false }))
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(prev => ({ ...prev, [req.id]: error }))
        setLoading(prev => ({ ...prev, [req.id]: false }))
      }
    })

    await Promise.allSettled(promises)
  }, [requests, enabled])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    data,
    loading,
    error,
    refetch: fetchAll
  }
}
