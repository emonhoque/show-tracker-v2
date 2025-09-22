'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { acceptInvite } from '@/lib/community'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react'

export default function InvitePage() {
  const params = useParams()
  const token = params.token as string
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [communityName, setCommunityName] = useState<string | null>(null)
  const router = useRouter()

  const handleAcceptInvite = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await acceptInvite({ token })
      
      if (response.success && response.community) {
        setSuccess(true)
        setCommunityName(response.community.name)
        
        // Store the community as selected
        localStorage.setItem('selectedCommunityId', response.community.id)
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError(response.error || 'Failed to join community')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
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
    )
  }

  if (error) {
    return (
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
    )
  }

  return (
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
  )
}
