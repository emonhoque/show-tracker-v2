'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function AuthRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      const callbackUrl = searchParams.get('callbackUrl') || '/'
      router.replace(callbackUrl)
    }
  }, [user, loading, router, searchParams])

  return null
}
