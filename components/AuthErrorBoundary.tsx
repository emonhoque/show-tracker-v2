'use client'

import { ErrorBoundary } from './ErrorBoundary'
import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface AuthErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthErrorBoundary({ children, fallback }: AuthErrorBoundaryProps) {
  const router = useRouter()

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Auth Error Boundary caught an error:', error, errorInfo)
    
    if (error.message.includes('auth') || error.message.includes('session')) {
      router.push('/auth/signin')
    }
  }

  const defaultFallback = (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Authentication Error</h3>
      <p className="text-muted-foreground mb-4">
        There was an issue with your authentication. Please sign in again.
      </p>
      <button
        onClick={() => router.push('/auth/signin')}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Sign In
      </button>
    </div>
  )

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={fallback || defaultFallback}
    >
      {children}
    </ErrorBoundary>
  )
}
