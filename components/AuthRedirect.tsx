'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function AuthRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

  useEffect(() => {
    // If user is authenticated, redirect immediately
    if (!loading && user) {
      const callbackUrl = searchParams.get('callbackUrl') || '/'
      // Use replace to prevent back button issues
      router.replace(callbackUrl)
    }
  }, [user, loading, router, searchParams])

  // Don't render anything - this is just for redirect logic
  return null
}
