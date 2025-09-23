'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserCommunity, Community } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { CommunitySwitcherSkeleton } from '@/components/CommunitySwitcherSkeleton'
import { LeaveCommunityDialog } from '@/components/LeaveCommunityDialog'
import { ChevronDown, Plus, Users, Settings, LogOut } from 'lucide-react'

interface CommunitySwitcherProps {
  currentCommunity?: Community | null
  onCommunityChange?: (community: Community) => void
}

export function CommunitySwitcher({ currentCommunity, onCommunityChange }: CommunitySwitcherProps) {
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
      setError(null)
      
      // Get the current session to include the auth token
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
        setCommunities(data.communities)
      } else {
        setError(data.error || 'Failed to load groups')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCommunitySelect = async (communityId: string) => {
    try {
      // Store selected community in localStorage
      localStorage.setItem('selectedCommunityId', communityId)
      
      // Get the current session to include the auth token
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No session token available')
        return
      }
      
      // Get full community details from API
      const response = await fetch(`/api/communities?id=${communityId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.community) {
        onCommunityChange?.(data.community)
        // Refresh the page to load community-scoped data
        router.refresh()
      } else {
        console.error('Failed to get community details:', data.error)
      }
    } catch (err) {
      console.error('Failed to switch community:', err)
    }
  }

  const handleCreateCommunity = () => {
    router.push('/groups/create')
  }

  const handleManageCommunities = () => {
    router.push('/groups')
  }

  const handleLeaveCommunity = (community: UserCommunity) => {
    setLeaveDialog({ isOpen: true, community })
  }

  const handleLeaveSuccess = () => {
    // Reload communities after leaving
    loadCommunities()
    // If we left the current community, switch to the first available one
    if (currentCommunity && leaveDialog.community?.community_id === currentCommunity.id) {
      const remainingCommunities = communities.filter(c => c.community_id !== leaveDialog.community?.community_id)
      if (remainingCommunities.length > 0 && remainingCommunities[0]) {
        handleCommunitySelect(remainingCommunities[0].community_id)
      } else {
        // No communities left, redirect to groups page
        router.push('/groups')
      }
    }
  }

  if (loading) {
    return <CommunitySwitcherSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <span className="text-sm">Error loading groups</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadCommunities}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (communities.length === 0) {
    return (
      <Button onClick={handleCreateCommunity} className="flex items-center space-x-2">
        <Plus className="h-4 w-4" />
        <span>Create Group</span>
      </Button>
    )
  }

  const currentCommunityId = currentCommunity?.id || communities[0]?.community_id
  const currentCommunityName = currentCommunity?.name || communities[0]?.community_name

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="truncate max-w-32">{currentCommunityName}</span>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-64">
          {communities.map((community) => (
            <div key={community.community_id} className="relative group">
              <DropdownMenuItem
                onClick={() => handleCommunitySelect(community.community_id)}
                className={`flex items-center justify-between ${
                  community.community_id === currentCommunityId 
                    ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                    : ''
                }`}
              >
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className={`font-medium truncate ${
                    community.community_id === currentCommunityId ? 'text-primary' : ''
                  }`}>
                    {community.community_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {community.member_count} member{community.member_count !== 1 ? 's' : ''}
                  </span>
                </div>
                {community.community_id === currentCommunityId && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleLeaveCommunity(community)
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
              </DropdownMenuItem>
            </div>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleCreateCommunity} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Group</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleManageCommunities} className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Manage Groups</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Leave Community Dialog */}
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
    </>
  )
}

// Hook to get current community from localStorage
export function useCurrentCommunity() {
  const [currentCommunity, setCurrentCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCurrentCommunity = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          setLoading(false)
          return
        }
        
        const response = await fetch('/api/communities', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        const data = await response.json()
        
        if (response.ok && data.success && data.communities && data.communities.length > 0) {
          // Get the first community or the one stored in localStorage
          const storedCommunityId = localStorage.getItem('selectedCommunityId')
          const selectedCommunity = storedCommunityId 
            ? data.communities.find((c: { community_id: string }) => c.community_id === storedCommunityId)
            : data.communities[0]
          
          if (selectedCommunity) {
            // Get full community details
            const communityResponse = await fetch(`/api/communities?id=${selectedCommunity.community_id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            })
            
            const communityData = await communityResponse.json()
            
            if (communityResponse.ok && communityData.success && communityData.community) {
              setCurrentCommunity(communityData.community)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load current community:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCurrentCommunity()
  }, [])

  return { currentCommunity, loading }
}
