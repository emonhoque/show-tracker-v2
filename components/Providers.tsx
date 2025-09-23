'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { AuthProvider } from '@/lib/auth-context'
import { ErrorBoundary } from './ErrorBoundary'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
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
}
