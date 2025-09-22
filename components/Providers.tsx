'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { AuthProvider } from '@/lib/auth-context'
import { ErrorBoundary } from './ErrorBoundary'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  try {
    return (
      <ErrorBoundary>
        <ThemeProvider
          defaultTheme="light"
          storageKey="show-tracker-theme" 
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('Error in Providers component:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
          <p className="text-muted-foreground">Please refresh the page to try again.</p>
        </div>
      </div>
    )
  }
}
