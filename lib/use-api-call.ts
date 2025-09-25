/**
 * React hook for making API calls with built-in deduplication and caching
 * Helps prevent excessive API calls and rate limiting
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { cachedSafeFetch } from './fetch-wrapper'

interface UseApiCallOptions<T> {
  url: string
  options?: RequestInit
  ttl?: number 
  enabled?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface UseApiCallReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  clearCache: () => void
}

export function useApiCall<T>({
  url,
  options = {},
  ttl = 5 * 60 * 1000,
  enabled = true,
  onSuccess,
  onError
}: UseApiCallOptions<T>): UseApiCallReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const response = await cachedSafeFetch<T>(url, {
        ...options,
        signal: abortControllerRef.current.signal
      }, ttl)
      
      setData(response)
      onSuccess?.(response as T)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [url, options, ttl, enabled, onSuccess, onError])

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
 * Hook for making API calls with automatic retry on failure
 */
export function useApiCallWithRetry<T>({
  url,
  options = {},
  ttl = 5 * 60 * 1000,
  enabled = true,
  maxRetries = 3,
  retryDelay = 1000,
  onSuccess,
  onError
}: UseApiCallOptions<T> & {
  maxRetries?: number
  retryDelay?: number
}): UseApiCallReturn<T> {
  const [retryCount, setRetryCount] = useState(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleError = useCallback((error: Error) => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1)
      retryTimeoutRef.current = setTimeout(() => {
        window.location.reload()
      }, retryDelay * Math.pow(2, retryCount))  
    } else {
      onError?.(error)
    }
  }, [retryCount, maxRetries, retryDelay, onError])

  const result = useApiCall({
    url,
    options,
    ttl,
    enabled,
      onSuccess: (data) => {
        setRetryCount(0)
        onSuccess?.(data as T)
      },
    onError: handleError
  })

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return result as UseApiCallReturn<T>
}
