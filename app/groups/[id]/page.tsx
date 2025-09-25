'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Community, UserCommunity, Show, RSVPSummary } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Layout } from '@/components/Layout'
import { ShowCard } from '@/components/ShowCard'
import { Users, Settings, Crown, UserPlus, Share2, Copy, Check, Calendar } from 'lucide-react'
import { BackButton } from '@/components/BackButton'

export default function GroupPage() {
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
  
  // Events state
  const [upcomingShows, setUpcomingShows] = useState<Show[]>([])
  const [pastShows, setPastShows] = useState<Show[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState<string | null>(null)

  const loadCommunityMembers = useCallback(async (communityId: string, accessToken: string) => {
    try {
      const response = await fetch(`/api/communities/${communityId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.members) {
        setMembers(data.members)
      } else {
        console.error('Failed to load group members:', data.error)
        // Set empty array on error to avoid breaking the UI
        setMembers([])
      }
    } catch (error) {
      console.error('Error loading group members:', error)
      setMembers([])
    }
  }, [])

  const loadCommunityEvents = useCallback(async (communityId: string, accessToken: string) => {
    try {
      setEventsLoading(true)
      setEventsError(null)
      
      // Fetch upcoming shows
      const upcomingResponse = await fetch(`/api/shows/upcoming?community_id=${communityId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
      
      // Fetch past shows
      const pastResponse = await fetch(`/api/shows/past?community_id=${communityId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
      
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json()
        setUpcomingShows(upcomingData || [])
      } else {
        console.error('Failed to load upcoming shows')
        setUpcomingShows([])
      }
      
      if (pastResponse.ok) {
        const pastData = await pastResponse.json()
        setPastShows(pastData || [])
      } else {
        console.error('Failed to load past shows')
        setPastShows([])
      }
    } catch (error) {
      console.error('Error loading community events:', error)
      setEventsError('Failed to load events')
      setUpcomingShows([])
      setPastShows([])
    } finally {
      setEventsLoading(false)
    }
  }, [])

  const loadCommunityData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get the current session to include the auth token
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to view groups')
        return
      }
      
      // Get user's communities to find the one with matching numeric_id
      const response = await fetch('/api/communities', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.communities) {
        const foundCommunity = data.communities.find(
          (c: UserCommunity) => c.community_numeric_id === params['id']
        )
        
        if (foundCommunity) {
          setCommunity({
            id: foundCommunity.community_id,
            name: foundCommunity.community_name,
            numeric_id: foundCommunity.community_numeric_id,
            created_by: '',
            created_at: '',
            updated_at: '',
            is_default: false
          })
          setIsAdmin(foundCommunity.user_role === 'admin')
          
          // Load community members and events
          await loadCommunityMembers(foundCommunity.community_id, session.access_token)
          await loadCommunityEvents(foundCommunity.community_id, session.access_token)
        } else {
          setError('Group not found')
        }
      } else {
        setError(data.error || 'Failed to load group')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [params['id'], loadCommunityMembers, loadCommunityEvents])

  useEffect(() => {
    loadCommunityData()
  }, [params['id'], loadCommunityData])

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
      
    } catch {
      setError('Failed to create invite link')
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const copyInviteLink = async () => {
    if (!inviteLink) {
      console.error('No invite link available')
      return
    }
    
    const { copyWithFeedback } = await import('@/lib/copy-to-clipboard')
    
    await copyWithFeedback(
      inviteLink,
      () => {
        // Success callback
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      (error) => {
        // Error callback
        console.error('Copy failed:', error)
        // Still show visual feedback to indicate attempt was made
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    )
  }

  const handleManageSettings = () => {
    router.push(`/groups/${params['id']}/settings`)
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-32 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <Users className="h-12 w-12 mx-auto mb-2" />
              <h2 className="text-xl font-semibold">Error Loading Group</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!community) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Group Not Found</h2>
            <p className="text-gray-600 mb-6">
              The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button onClick={() => router.push('/groups')} variant="outline">
              View All Groups
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:p-4">
        <div className="mb-8">
          <BackButton />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
                <span className="break-words">{community.name}</span>
              </div>
            </h1>
            <p className="text-gray-600 mt-2">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {isAdmin && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                onClick={handleCreateInviteLink} 
                disabled={isCreatingInvite}
                className="flex items-center justify-center gap-2 text-sm sm:text-base"
                size="sm"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">{isCreatingInvite ? 'Creating...' : 'Create Invite Link'}</span>
                <span className="sm:hidden">{isCreatingInvite ? 'Creating...' : 'Invite'}</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleManageSettings}
                className="flex items-center justify-center gap-2 text-sm sm:text-base"
                size="sm"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Group Info */}
        <Card>
          <CardHeader>
            <CardTitle>Group Information</CardTitle>
            <CardDescription>
              Basic details about this group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg">{community.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">ID</label>
                <p className="text-lg font-mono">{community.numeric_id}</p>
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
              People who are part of this group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium">
                        {member.profiles?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{member.profiles?.name || 'Unknown'}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{member.profiles?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                    {member.role === 'admin' && (
                      <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                    )}
                    <span className="text-xs sm:text-sm text-gray-500 capitalize">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Calendar className="h-6 w-6" />
            <span>Events</span>
          </h2>
        </div>

        {eventsLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded mb-4" />
              <div className="h-32 bg-gray-200 rounded mb-4" />
              <div className="h-32 bg-gray-200 rounded mb-4" />
            </div>
          </div>
        ) : eventsError ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-red-600 mb-2">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">Error Loading Events</h3>
                <p className="text-gray-600">{eventsError}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Events */}
            {upcomingShows.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-green-600">Upcoming Events</h3>
                <div className="space-y-4">
                  {upcomingShows.map((show) => (
                    <ShowCard
                      key={show.id}
                      show={show}
                      isPast={false}
                      rsvps={{ going: [], maybe: [], not_going: [] }}
                      userRsvpStatus={null}
                      communitySlug={String(params['id'])}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Events */}
            {pastShows.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-600">Past Events</h3>
                <div className="space-y-4">
                  {pastShows.slice(0, 5).map((show) => (
                    <ShowCard
                      key={show.id}
                      show={show}
                      isPast={true}
                      rsvps={{ going: [], maybe: [], not_going: [] }}
                      userRsvpStatus={null}
                      communitySlug={String(params['id'])}
                    />
                  ))}
                </div>
                {pastShows.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Showing 5 of {pastShows.length} past events
                  </p>
                )}
              </div>
            )}

            {/* No Events */}
            {upcomingShows.length === 0 && pastShows.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                  <p className="text-gray-600">
                    This group doesn't have any events yet. Check back later or create the first event!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
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
              Share this link to invite people to join your group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
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
    </Layout>
  )
}
