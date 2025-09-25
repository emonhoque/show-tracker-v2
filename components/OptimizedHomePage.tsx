'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoogleAuthGate } from '@/components/GoogleAuthGate'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/toast-provider'
import { ShowCard } from '@/components/ShowCard'
import { ShowCardSkeleton } from '@/components/ShowCardSkeleton'
import { AddShowModal } from '@/components/AddShowModal'
import { EditShowModal } from '@/components/EditShowModal'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { RSVPFilter } from '@/components/RSVPFilter'
import { RSVPFilterSkeleton } from '@/components/RSVPFilterSkeleton'
import { ReleasesFeed } from '@/components/ReleasesFeed'
import { ReleaseCardSkeleton } from '@/components/ReleaseCardSkeleton'
import { Show, Community } from '@/lib/types'
import { useInfiniteScroll } from '@/lib/useInfiniteScroll'
import { useHomePageData, useUserCommunities } from '@/lib/hooks/useHomePageData'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

export default function OptimizedHomePage() {
  const { user, loading: authLoading } = useAuth()
  const { error: showError } = useToast()
  const queryClient = useQueryClient()
  
  const [userName, setUserName] = useState<string | null>(null)
  const [currentCommunity, setCurrentCommunity] = useState<Community | null>(null)
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<Set<string>>(new Set(['all']))
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<Set<string>>(new Set(['all']))
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingShow, setEditingShow] = useState<Show | null>(null)
  const [deletingShowId, setDeletingShowId] = useState<string | null>(null)
  const [deletingShowTitle, setDeletingShowTitle] = useState<string>('')
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (user) {
      setUserName(user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'User')
    } else {
      setUserName(null)
    }
  }, [user])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOffline(!navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const { 
    data: userCommunities = [], 
    isLoading: loadingCommunities 
  } = useUserCommunities()

  const { 
    data: homePageData,
    isLoading: loadingHomeData,
    refetch: refetchHomeData
  } = useHomePageData({
    communityId: currentCommunity?.id,
    categories: Array.from(selectedCategoryFilters),
    enabled: !!user && !!currentCommunity
  })

  const upcomingShows = homePageData?.upcomingShows || []
  const pastShows = homePageData?.pastShows?.data || []
  const pastShowsPagination = homePageData?.pastShows?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  }
  const categoryStats = homePageData?.categoryStats || []
  const userRsvpStatuses = homePageData?.userRsvps || {}

  useEffect(() => {
    if (userCommunities.length > 0 && !currentCommunity) {
      const storedCommunityId = localStorage.getItem('selectedCommunityId')
      const selectedCommunity = storedCommunityId 
        ? userCommunities.find(c => c.community_id === storedCommunityId)
        : userCommunities[0]
      
      if (selectedCommunity?.community) {
        const fullCommunity: Community = {
          ...selectedCommunity.community,
          created_by: '',
          updated_at: selectedCommunity.community.created_at,
          is_default: false
        }
        setCurrentCommunity(fullCommunity)
      }
    }
  }, [userCommunities, currentCommunity])

  const filteredUpcomingShows = upcomingShows.filter(show => {
    if (selectedStatusFilters.has('all')) return true
    
    const rsvps = show.rsvps
    if (!rsvps) return false

    return Array.from(selectedStatusFilters).some(status => {
      if (status === 'going') {
        return rsvps.going && rsvps.going.length > 0
      } else if (status === 'maybe') {
        return rsvps.maybe && rsvps.maybe.length > 0
      } else if (status === 'not_going') {
        return rsvps.not_going && rsvps.not_going.length > 0
      }
      return false
    })
  })

  const handleStatusFilterToggle = (filter: string) => {
    setSelectedStatusFilters(prev => {
      const newFilters = new Set(prev)
      
      if (filter === 'all') {
        return new Set(['all'])
      } else {
        newFilters.delete('all')
        
        if (newFilters.has(filter)) {
          newFilters.delete(filter)
          if (newFilters.size === 0) {
            return new Set(['all'])
          }
        } else {
          newFilters.add(filter)
        }
      }
      
      return newFilters
    })
  }

  const handleCategoryFilterToggle = (category: string) => {
    setSelectedCategoryFilters(prev => {
      const newFilters = new Set(prev)
      
      if (category === 'all') {
        return new Set(['all'])
      } else {
        newFilters.delete('all')
        
        if (newFilters.has(category)) {
          newFilters.delete(category)
          if (newFilters.size === 0) {
            return new Set(['all'])
          }
        } else {
          newFilters.add(category)
        }
      }
      
      return newFilters
    })
  }

  const handleClearAllFilters = () => {
    setSelectedStatusFilters(new Set(['all']))
    setSelectedCategoryFilters(new Set(['all']))
  }

  const handleShowAdded = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.shows })
    await refetchHomeData()
  }, [queryClient, refetchHomeData])

  const handleShowUpdated = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.shows })
    await refetchHomeData()
    setShowEditModal(false)
    setEditingShow(null)
  }, [queryClient, refetchHomeData])

  const handleEditShow = (show: Show) => {
    setEditingShow(show)
    setShowEditModal(true)
  }

  const handleDeleteShow = (showId: string) => {
    const show = [...upcomingShows, ...pastShows].find(s => s.id === showId)
    if (show) {
      setDeletingShowId(showId)
      setDeletingShowTitle(show.title)
      setShowDeleteDialog(true)
    }
  }

  const confirmDeleteShow = async () => {
    if (!deletingShowId) return

    try {
      const supabase = await import('@/lib/supabase')
      const { createClient } = supabase
      const supabaseClient = createClient()
      const { data: { session } } = await supabaseClient.auth.getSession()
      
      if (!session?.access_token) {
        showError('Authentication required')
        return
      }

      const response = await fetch(`/api/shows/${deletingShowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        showError(errorData.error || 'Failed to delete show')
        return
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.shows })
      await refetchHomeData()
      setShowDeleteDialog(false)
      setDeletingShowId(null)
      setDeletingShowTitle('')
    } catch (error) {
      console.error('Error deleting show:', error)
      showError('Failed to delete show')
    }
  }

  const updateRSVPs = useCallback(async (showId: string) => {
    await queryClient.invalidateQueries({ 
      queryKey: queryKeys.rsvps(showId) 
    })
    await refetchHomeData()
  }, [queryClient, refetchHomeData])

  const loadMorePastShows = useCallback(async () => {
    if (pastShowsPagination.hasNext && !loadingHomeData) {
      await refetchHomeData()
    }
  }, [pastShowsPagination.hasNext, loadingHomeData, refetchHomeData])

  const { sentinelRef } = useInfiniteScroll({
    hasMore: pastShowsPagination.hasNext,
    isLoading: loadingHomeData,
    onLoadMore: loadMorePastShows
  })

  if (authLoading || loadingCommunities) {
    return (
      <Layout
        currentCommunity={currentCommunity}
        onCommunityChange={setCurrentCommunity}
        showAddButton={false}
      >
        <div className="max-w-4xl mx-auto p-4">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className={`grid w-full mb-6 ${currentCommunity?.music_enabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              {currentCommunity?.music_enabled && (
                <TabsTrigger value="releases">Music</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="upcoming" className="space-y-6">
              <RSVPFilterSkeleton />
              <ShowCardSkeleton />
              <ShowCardSkeleton />
            </TabsContent>
            
            <TabsContent value="past" className="space-y-4">
              <ShowCardSkeleton />
              <ShowCardSkeleton />
            </TabsContent>
            
            {currentCommunity?.music_enabled && (
              <TabsContent value="releases" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <span className="h-6 w-6">🎵</span>
                      Recent Releases
                    </h2>
                  </div>
                  <div className="grid gap-4">
                    <ReleaseCardSkeleton />
                    <ReleaseCardSkeleton />
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return <GoogleAuthGate />
  }

  if (userCommunities.length === 0 && !loadingCommunities) {
    return (
      <Layout
        currentCommunity={currentCommunity}
        onCommunityChange={setCurrentCommunity}
        showAddButton={false}
      >
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-4">No Communities Found</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              You&apos;re not currently a member of any communities. Join a community to start tracking shows and events.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/groups">Browse Groups</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/groups/create">Create Group</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      currentCommunity={currentCommunity}
      onCommunityChange={setCurrentCommunity}
      showAddButton={true}
      onAddClick={() => setShowAddModal(true)}
    >
      {isOffline && (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800 px-4 py-2">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
            You&apos;re offline. Some features may not be available.
          </p>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className={`grid w-full mb-6 ${currentCommunity?.music_enabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            {currentCommunity?.music_enabled && (
              <TabsTrigger value="releases">Music</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-6">
            <h2 className="sr-only">Upcoming Shows</h2>
            
            {/* Combined Filter */}
            {loadingHomeData ? (
              <RSVPFilterSkeleton />
            ) : (
              <RSVPFilter
                selectedStatusFilters={selectedStatusFilters}
                selectedCategoryFilters={selectedCategoryFilters}
                onStatusFilterToggle={handleStatusFilterToggle}
                onCategoryFilterToggle={handleCategoryFilterToggle}
                filteredShowsCount={filteredUpcomingShows.length}
                onClearAllFilters={handleClearAllFilters}
                categoryStats={categoryStats}
                hasCommunities={userCommunities.length > 0}
              />
            )}
            
            {loadingHomeData ? (
              <>
                <ShowCardSkeleton />
                <ShowCardSkeleton />
              </>
            ) : filteredUpcomingShows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {upcomingShows.length === 0 
                  ? 'No upcoming shows' 
                  : 'No shows match the selected filters'
                }
              </p>
            ) : (
              filteredUpcomingShows.map((show) => (
                <ShowCard 
                  key={show.id} 
                  show={{
                    ...show,
                    time_local: new Date(show.date_time).toLocaleString()
                  }} 
                  isPast={false} 
                  rsvps={show.rsvps || { going: [], maybe: [], not_going: [] }}
                  userRsvpStatus={userRsvpStatuses[show.id] || null}
                  onEdit={handleEditShow}
                  onDelete={handleDeleteShow}
                  onRSVPUpdate={() => updateRSVPs(show.id)}
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="past" className="space-y-4">
            <h2 className="sr-only">Past Shows</h2>
            
            {loadingHomeData ? (
              <>
                <ShowCardSkeleton />
                <ShowCardSkeleton />
              </>
            ) : pastShows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No past shows</p>
            ) : (
              <>
                {pastShows.map((show) => (
                  <ShowCard 
                    key={show.id} 
                    show={{
                      ...show,
                      time_local: new Date(show.date_time).toLocaleString()
                    }} 
                    isPast={true} 
                    rsvps={show.rsvps || { going: [], maybe: [], not_going: [] }}
                    userRsvpStatus={userRsvpStatuses[show.id] || null}
                    onEdit={handleEditShow}
                    onDelete={handleDeleteShow}
                    onRSVPUpdate={() => updateRSVPs(show.id)}
                  />
                ))}
                
                {/* Infinite scroll loading indicator */}
                {loadingHomeData && (
                  <div className="flex justify-center py-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
                      <span>Loading more shows...</span>
                    </div>
                  </div>
                )}
                
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-4" />
              </>
            )}
          </TabsContent>
          
          {currentCommunity?.music_enabled && (
            <TabsContent value="releases" className="space-y-6">
              <ReleasesFeed userName={userName} days={90} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Add Show Modal */}
      <AddShowModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onShowAdded={handleShowAdded}
        communityId={currentCommunity?.id}
      />

      {/* Edit Show Modal */}
      <EditShowModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        show={editingShow}
        onShowUpdated={handleShowUpdated}
        isPast={editingShow ? new Date(editingShow.date_time) < new Date() : false}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        showTitle={deletingShowTitle}
        onConfirm={confirmDeleteShow}
      />
    </Layout>
  )
}
