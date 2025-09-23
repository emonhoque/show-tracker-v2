'use client'

import { ErrorBoundary } from './ErrorBoundary'
import { ReactNode } from 'react'

interface APIErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onRetry?: () => void
}

export function APIErrorBoundary({ children, fallback, onRetry }: APIErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('API Error Boundary caught an error:', error, errorInfo)
    
    // You could send this to an error reporting service
    // Example: Sentry.captureException(error, { tags: { component: 'API' } })
  }

  const defaultFallback = (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 mb-4 bg-orange-100 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Network Error</h3>
      <p className="text-muted-foreground mb-4">
        Unable to load data. Please check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Retry
      </button>
    </div>
  )

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={fallback || defaultFallback}
      resetKeys={['retry']}
    >
      {children}
    </ErrorBoundary>
  )
}
