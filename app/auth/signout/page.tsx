'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut } from 'lucide-react'

export default function SignOutPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user, loading, signOut } = useAuth()

  const handleSignOut = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      await signOut()
      router.replace('/signin')
    } catch (error) {
      console.error('Sign out error:', error)
      setError('Failed to sign out. Please try again.')
      setIsLoading(false)
    }
  }, [signOut, router])

  useEffect(() => {
    if (!loading && user) {
      handleSignOut()
    } else if (!loading && !user) {
      router.replace('/signin')
    }
  }, [user, loading, router, handleSignOut])

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign Out</CardTitle>
          <CardDescription className="text-center">
            Are you sure you want to sign out?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              onClick={handleSignOut}
              disabled={isLoading}
              className="flex-1"
              variant="destructive"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </>
              )}
            </Button>
            
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
