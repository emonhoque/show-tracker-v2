'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserCommunity } from '@/lib/types'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CommunityCardSkeleton } from '@/components/CommunityCardSkeleton'
import { Plus, Users, Settings, Crown } from 'lucide-react'

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<UserCommunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        setError('You must be logged in to view communities')
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
        setCommunities(data.communities)
      } else {
        setError(data.error || 'Failed to load communities')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCommunity = () => {
    router.push('/communities/create')
  }

  const handleCommunityClick = (numericId: string) => {
    router.push(`/communities/${numericId}`)
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Communities</h1>
            <Button onClick={handleCreateCommunity} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Community</span>
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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Communities</h1>
            <Button onClick={handleCreateCommunity} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Community</span>
            </Button>
          </div>
          
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <Users className="h-12 w-12 mx-auto mb-2" />
              <h2 className="text-xl font-semibold">Error Loading Communities</h2>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Communities</h1>
            <p className="text-gray-600 mt-2">
              Manage your communities and invite others to join
            </p>
          </div>
          <Button onClick={handleCreateCommunity} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Community</span>
          </Button>
        </div>

        {communities.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">No Communities Yet</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Communities help you organize shows and events with friends. Create your first community or ask someone to invite you to theirs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCreateCommunity} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create Community</span>
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
                onClick={() => handleCommunityClick(community.community_numeric_id)}
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/communities/${community.community_numeric_id}/settings`)
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
