'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { AuthProvider } from '@/lib/auth-context'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from './ui/toast-provider'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider
          defaultTheme="light"
          storageKey="show-tracker-theme" 
        >
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}
