'use client'

import { ProtectedRoute } from './ProtectedRoute'

interface AuthenticatedPageProps {
  children: React.ReactNode
}

export function AuthenticatedPage({ children }: AuthenticatedPageProps) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  )
}
