'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserCommunity } from '@/lib/types'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CommunityCardSkeleton } from '@/components/CommunityCardSkeleton'
import { LeaveCommunityDialog } from '@/components/LeaveCommunityDialog'
import { Plus, Users, Settings, Crown, LogOut } from 'lucide-react'
import { BackButton } from '@/components/BackButton'

export default function GroupsPage() {
  const [communities, setCommunities] = useState<UserCommunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leaveDialog, setLeaveDialog] = useState<{
    isOpen: boolean
    community: UserCommunity | null
  }>({ isOpen: false, community: null })
  const router = useRouter()

  useEffect(() => {
    loadCommunities()
  }, [])

  const loadCommunities = async () => {
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
      
      const response = await fetch('/api/communities', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.communities) {
        console.log('Loaded groups:', data.communities)
        setCommunities(data.communities)
      } else {
        console.error('Failed to load groups:', data.error)
        setError(data.error || 'Failed to load groups')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = () => {
    router.push('/groups/create')
  }

  const handleGroupClick = (numericId: string) => {
    router.push(`/groups/${numericId}`)
  }

  const handleLeaveGroup = (community: UserCommunity) => {
    console.log('Opening leave dialog for group:', community.community_name)
    setLeaveDialog({ isOpen: true, community })
  }

  const handleLeaveSuccess = () => {
    // Reload groups after leaving
    loadCommunities()
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <BackButton />
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Groups</h1>
            <Button onClick={handleCreateGroup} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Group</span>
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <CommunityCardSkeleton />
            <CommunityCardSkeleton />
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <BackButton />
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Groups</h1>
            <Button onClick={handleCreateGroup} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Group</span>
            </Button>
          </div>
          
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <Users className="h-12 w-12 mx-auto mb-2" />
              <h2 className="text-xl font-semibold">Error Loading Groups</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <Button onClick={loadCommunities} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BackButton />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-gray-600 mt-2">
              Manage your groups and invite others to join
            </p>
          </div>
          <Button onClick={handleCreateGroup} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Group</span>
          </Button>
        </div>

        {communities.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">No Groups Yet</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Groups help you organize shows and events with friends. Create your first group or ask someone to invite you to theirs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCreateGroup} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create Group</span>
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/home'} className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Browse Shows</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Card 
                key={community.community_id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleGroupClick(community.community_numeric_id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>{community.community_name}</span>
                    </CardTitle>
                    {community.user_role === 'admin' && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <CardDescription>
                    {community.member_count} member{community.member_count !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Role: {community.user_role}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/groups/${community.community_numeric_id}/settings`)
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          console.log('Leave button clicked for group:', community.community_name)
                          handleLeaveGroup(community)
                        }}
                        title="Leave Group"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Leave Group Dialog */}
      {leaveDialog.community && (
        <LeaveCommunityDialog
          isOpen={leaveDialog.isOpen}
          onClose={() => setLeaveDialog({ isOpen: false, community: null })}
          communityId={leaveDialog.community.community_id}
          communityName={leaveDialog.community.community_name}
          userRole={leaveDialog.community.user_role as 'admin' | 'member'}
          onSuccess={handleLeaveSuccess}
        />
      )}
    </Layout>
  )
}
