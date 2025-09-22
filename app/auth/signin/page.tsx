'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AuthSignInPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // Redirect to user-facing signin page with all query parameters
    const callbackUrl = searchParams.get('callbackUrl') || '/'
    const error = searchParams.get('error')
    
    const params = new URLSearchParams()
    if (callbackUrl) params.set('callbackUrl', callbackUrl)
    if (error) params.set('error', error)
    
    const queryString = params.toString()
    const redirectUrl = `/signin${queryString ? `?${queryString}` : ''}`
    
    window.location.replace(redirectUrl)
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecting to sign in...</p>
      </div>
    </div>
  )
}
