'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Layout } from '@/components/Layout'
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react'

export default function InvitePage() {
  const params = useParams()
  const token = params['token'] as string
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [communityName, setCommunityName] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
      } catch (error) {
        console.error('Auth check error:', error)
        setIsAuthenticated(false)
      }
    }
    
    checkAuth()
  }, [])

  const handleAcceptInvite = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get authentication token
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('Please sign in to accept this invitation')
        // Redirect to sign in with return URL
        const returnUrl = encodeURIComponent(window.location.href)
        router.push(`/signin?returnUrl=${returnUrl}`)
        return
      }
      
      // Call the API endpoint
      const response = await fetch('/api/communities/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ token })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.community) {
        setSuccess(true)
        setCommunityName(data.community.name)
        
        // Store the community as selected
        localStorage.setItem('selectedCommunityId', data.community.id)
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError(data.error || 'Failed to join community')
      }
    } catch (error) {
      console.error('Error accepting invite:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">Welcome!</CardTitle>
            <CardDescription>
              You&apos;ve successfully joined <strong>{communityName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              You can now see all shows and events in this community.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Shows
            </Button>
          </CardContent>
        </Card>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Invite Error</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This invite link may be invalid, expired, or you may already be a member.
            </p>
            <div className="space-y-2">
              <Button onClick={() => router.push('/')} className="w-full">
                Go to Home
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </Layout>
    )
  }

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    )
  }

  // Show sign-in prompt for unauthenticated users
  if (isAuthenticated === false) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Users className="h-16 w-16 text-blue-500" />
            </div>
            <CardTitle className="text-2xl">Join Community</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join a community
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              Please sign in with your Google account to accept this invitation.
            </p>
            
            <Button 
              onClick={() => {
                const returnUrl = encodeURIComponent(window.location.href)
                router.push(`/signin?returnUrl=${returnUrl}`)
              }}
              className="w-full"
            >
              Sign In to Accept Invitation
            </Button>
            
            <p className="text-xs text-gray-500 mt-4">
              By accepting this invitation, you agree to join the community and follow its guidelines.
            </p>
          </CardContent>
        </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Users className="h-16 w-16 text-blue-500" />
          </div>
          <CardTitle className="text-2xl">Join Community</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a community
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6">
            Click the button below to accept the invitation and start collaborating with your community.
          </p>
          
          <Button 
            onClick={handleAcceptInvite} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
          
          <p className="text-xs text-gray-500 mt-4">
            By accepting this invitation, you agree to join the community and follow its guidelines.
          </p>
        </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
