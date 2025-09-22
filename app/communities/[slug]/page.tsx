'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Community, UserCommunity } from '@/lib/types'
// import { getCommunities, getCommunityMembers } from '@/lib/community'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Users, Settings, Crown, Mail, UserPlus, Share2, Copy, Check } from 'lucide-react'

export default function CommunityPage() {
  const params = useParams()
  const router = useRouter()
  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<{ id: string; name: string; email: string; role: string; user_id: string; profiles: { id: string; name: string; email: string; avatar_url: string } }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadCommunityData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get the current session to include the auth token
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to view communities')
        return
      }
      
      // Get user's communities to find the one with matching slug
      const response = await fetch('/api/communities', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.communities) {
        const foundCommunity = data.communities.find(
          (c: UserCommunity) => c.community_numeric_id === params.slug
        )
        
        if (foundCommunity) {
          setCommunity({
            id: foundCommunity.community_id,
            name: foundCommunity.community_name,
            slug: foundCommunity.community_numeric_id,
            numeric_id: foundCommunity.community_numeric_id,
            created_by: '',
            created_at: '',
            updated_at: '',
            is_default: false
          })
          setIsAdmin(foundCommunity.user_role === 'admin')
          
          // Load community members - we'll implement this later
          // For now, just set empty members
          setMembers([])
        } else {
          setError('Community not found')
        }
      } else {
        setError(data.error || 'Failed to load community')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [params.slug])

  useEffect(() => {
    loadCommunityData()
  }, [params.slug, loadCommunityData])

  const handleCreateInviteLink = async () => {
    if (!community) return

    try {
      setIsCreatingInvite(true)
      
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to create invite links')
        return
      }

      const response = await fetch(`/api/communities/${community.id}/invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setInviteLink(data.invite.inviteUrl)
      } else {
        setError(data.error || 'Failed to create invite link')
      }
      
    } catch (error) {
      setError('Failed to create invite link')
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const copyInviteLink = async () => {
    if (!inviteLink) return
    
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy invite link:', error)
    }
  }

  const handleManageSettings = () => {
    router.push(`/communities/${params.slug}/settings`)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <Users className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-xl font-semibold">Error Loading Community</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">Community Not Found</h2>
          <p className="text-gray-600 mb-6">
            The community you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button onClick={() => router.push('/communities')} variant="outline">
            View All Communities
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <Users className="h-8 w-8" />
              <span>{community.name}</span>
            </h1>
            <p className="text-gray-600 mt-2">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {isAdmin && (
            <div className="flex space-x-2">
              <Button 
                onClick={handleCreateInviteLink} 
                disabled={isCreatingInvite}
                className="flex items-center space-x-2"
              >
                <Share2 className="h-4 w-4" />
                <span>{isCreatingInvite ? 'Creating...' : 'Create Invite Link'}</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleManageSettings}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Community Info */}
        <Card>
          <CardHeader>
            <CardTitle>Community Information</CardTitle>
            <CardDescription>
              Basic details about this community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg">{community.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Slug</label>
                <p className="text-lg font-mono">{community.slug}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Members</label>
                <p className="text-lg">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Members</span>
            </CardTitle>
            <CardDescription>
              People who are part of this community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.profiles?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.profiles?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{member.profiles?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {member.role === 'admin' && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm text-gray-500 capitalize">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Link Section */}
      {inviteLink && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Share2 className="h-5 w-5" />
              <span>Invite Link</span>
            </CardTitle>
            <CardDescription>
              Share this link to invite people to join your community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-gray-50">
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-mono break-all">
                  {inviteLink}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This link can be used up to 100 times and expires in 7 days
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyInviteLink}
                className="flex items-center space-x-1"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
