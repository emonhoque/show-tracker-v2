'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoogleAuthGate } from '@/components/GoogleAuthGate'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { ShowCard } from '@/components/ShowCard'
import { ShowCardSkeleton } from '@/components/ShowCardSkeleton'
import { AddShowModal } from '@/components/AddShowModal'
import { EditShowModal } from '@/components/EditShowModal'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
// import { PWAFeatures } from '@/components/PWAFeatures' // Unused import
import { RSVPFilter } from '@/components/RSVPFilter'
import { RSVPFilterSkeleton } from '@/components/RSVPFilterSkeleton'
import { ReleasesFeed } from '@/components/ReleasesFeed'
import { ReleaseCardSkeleton } from '@/components/ReleaseCardSkeleton'
import { Show, RSVPSummary, Community } from '@/lib/types'
import { useInfiniteScroll } from '@/lib/useInfiniteScroll'
import Link from 'next/link'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [userName, setUserName] = useState<string | null>(null)
  const [currentCommunity, setCurrentCommunity] = useState<Community | null>(null)
  const [userCommunities, setUserCommunities] = useState<Array<{
    community_id: string
    community_name: string
    community_numeric_id: string
    user_role: string
    member_count: number
  }>>([])
  const [upcomingShows, setUpcomingShows] = useState<Show[]>([])
  const [pastShows, setPastShows] = useState<Show[]>([])
  const [rsvpsData, setRsvpsData] = useState<Record<string, RSVPSummary>>({})
  const [userRsvpStatuses, setUserRsvpStatuses] = useState<Record<string, string | null>>({})
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<Set<string>>(new Set(['all']))
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<Set<string>>(new Set(['all']))
  const [filteredUpcomingShows, setFilteredUpcomingShows] = useState<Show[]>([])
  const [categoryStats, setCategoryStats] = useState<Array<{ category: string; count: number }>>([])
  const [pastShowsPagination, setPastShowsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingShow, setEditingShow] = useState<Show | null>(null)
  const [deletingShowId, setDeletingShowId] = useState<string | null>(null)
  const [deletingShowTitle, setDeletingShowTitle] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingCommunities, setLoadingCommunities] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [cacheVersion, setCacheVersion] = useState(0)
  // const hasLoadedData = useRef(false) // Unused variable
  const isLoadingData = useRef(false)
  const lastLoadTime = useRef(0)
  const hasLoadedCommunities = useRef(false)
  const activeRequests = useRef(new Set<string>())
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const rsvpDebounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({})

  // Helper function for authenticated requests with deduplication
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    // Check if this request is already in progress
    if (activeRequests.current.has(url)) {
      console.log(`Request already in progress for ${url}, skipping duplicate`)
      return new Response(null, { status: 200, statusText: 'Duplicate request skipped' })
    }

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No session token available')
    }

    // Mark request as active
    activeRequests.current.add(url)
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          ...options.headers,
        },
      })
      return response
    } finally {
      // Remove from active requests when done
      activeRequests.current.delete(url)
    }
  }

  // Update userName when user changes
  useEffect(() => {
    if (user) {
      setUserName(user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'User')
    } else {
      setUserName(null)
    }
  }, [user])


  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check initial status
    setIsOffline(!navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const fetchCategoryStats = useCallback(async (retryCount = 0) => {
    const maxRetries = 3
    const retryDelay = 1000 * Math.pow(2, retryCount) // Exponential backoff
    
    try {
      const url = currentCommunity 
        ? `/api/categories/stats?community_id=${currentCommunity.id}`
        : '/api/categories/stats'
      const response = await authenticatedFetch(url)
      const data = await response.json()
      
      if (data.success) {
        setCategoryStats(data.stats || [])
      }
    } catch (error) {
      console.error(`Error fetching category stats (attempt ${retryCount + 1}):`, error)
      
      if (retryCount < maxRetries) {
        console.log(`Retrying in ${retryDelay}ms...`)
        setTimeout(() => fetchCategoryStats(retryCount + 1), retryDelay)
      } else {
        // Set empty stats on final failure to prevent UI issues
        setCategoryStats([])
      }
    }
  }, [currentCommunity])

  const fetchUserRsvpStatuses = useCallback(async (showIds: string[]) => {
    if (showIds.length === 0) return
    
    try {
      // Fetch all user RSVP statuses in a single request
      const response = await authenticatedFetch(`/api/rsvps/bulk?show_ids=${showIds.join(',')}`)
      if (response.ok) {
        const data = await response.json()
        setUserRsvpStatuses(data.statuses || {})
      }
    } catch (error) {
      console.error('Error fetching user RSVP statuses:', error)
    }
  }, [])

  const fetchShows = useCallback(async (pastPage: number = 1, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    
    try {
      // Fetch upcoming shows (now includes RSVPs) - only on initial load
      if (!isLoadMore) {
        const categoryParam = selectedCategoryFilters.has('all') ? '' : Array.from(selectedCategoryFilters).join(',')
        const upcomingUrl = `/api/shows/upcoming?v=${cacheVersion}${currentCommunity ? `&community_id=${currentCommunity.id}` : ''}${categoryParam ? `&categories=${encodeURIComponent(categoryParam)}` : ''}`
        
        try {
          const upcomingResponse = await authenticatedFetch(upcomingUrl)
          const upcomingData = await upcomingResponse.json()
          if (Array.isArray(upcomingData)) {
            setUpcomingShows(upcomingData)
            
            // Extract RSVPs from shows
            const newRsvpsData: Record<string, RSVPSummary> = {}
            
            upcomingData.forEach((show: Show & { rsvps?: RSVPSummary }) => {
              if (show.rsvps) {
                newRsvpsData[show.id] = show.rsvps
              }
            })
            
            setRsvpsData(prev => ({ ...prev, ...newRsvpsData }))
            
            // Fetch user RSVP statuses for all upcoming shows
            const upcomingShowIds = upcomingData.map((show: Show) => show.id)
            fetchUserRsvpStatuses(upcomingShowIds)
          } else {
            console.error('Invalid upcoming shows data format:', upcomingData)
            setUpcomingShows([])
          }
        } catch (error) {
          console.error('Error fetching upcoming shows:', error)
          setUpcomingShows([])
        }
      }

      // Fetch past shows with pagination
      const pastCategoryParam = selectedCategoryFilters.has('all') ? '' : Array.from(selectedCategoryFilters).join(',')
      const pastUrl = `/api/shows/past?page=${pastPage}&limit=20&v=${cacheVersion}${pastCategoryParam ? `&categories=${encodeURIComponent(pastCategoryParam)}` : ''}`
      
      try {
        const pastResponse = await authenticatedFetch(pastUrl)
        const pastData = await pastResponse.json()
        if (pastData && pastData.shows && Array.isArray(pastData.shows)) {
          if (isLoadMore) {
            // Append new shows to existing ones, filtering out duplicates
            setPastShows(prev => {
              const existingIds = new Set(prev.map((show: Show) => show.id))
              const newShows = pastData.shows.filter((show: Show) => !existingIds.has(show.id))
              return [...prev, ...newShows]
            })
          } else {
            // Replace shows on initial load
            setPastShows(pastData.shows)
          }
          setPastShowsPagination(pastData.pagination)
          
          // Extract RSVPs from shows
          const newRsvpsData: Record<string, RSVPSummary> = {}
          pastData.shows.forEach((show: Show & { rsvps?: RSVPSummary }) => {
            if (show.rsvps) {
              newRsvpsData[show.id] = show.rsvps
            }
          })
          setRsvpsData(prev => ({ ...prev, ...newRsvpsData }))
          
          // Fetch user RSVP statuses for past shows
          const pastShowIds = pastData.shows.map((show: Show) => show.id)
          fetchUserRsvpStatuses(pastShowIds)
        } else {
          console.error('Invalid past shows data format:', pastData)
          console.error('Expected: { shows: Array, pagination: Object }')
          console.error('Received:', typeof pastData, pastData)
          if (!isLoadMore) {
            setPastShows([])
          }
        }
      } catch (error) {
        console.error('Error fetching past shows:', error)
        if (!isLoadMore) {
          setPastShows([])
        }
      }
    } catch (error) {
      console.error('Error fetching shows:', error)
    } finally {
      if (isLoadMore) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }, [cacheVersion, selectedCategoryFilters, currentCommunity, fetchUserRsvpStatuses])

  // Load user communities when authenticated
  useEffect(() => {
    if (user && !hasLoadedCommunities.current) {
      hasLoadedCommunities.current = true
      const loadUserCommunities = async () => {
        setLoadingCommunities(true)
        try {
          const response = await authenticatedFetch('/api/communities')
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          console.log('User communities data:', data)
          if (data.success && data.communities) {
            setUserCommunities(data.communities)
            
            // If no current community is set, try to get the first one or stored one
            if (!currentCommunity && data.communities.length > 0) {
              const storedCommunityId = localStorage.getItem('selectedCommunityId')
              const selectedCommunity = storedCommunityId 
                ? data.communities.find((c: { community_id: string; community?: Community }) => c.community_id === storedCommunityId)
                : data.communities[0]
              
              if (selectedCommunity && selectedCommunity.community) {
                // Use the community data from the bulk call - no additional API call needed!
                setCurrentCommunity(selectedCommunity.community)
              }
            }
          }
        } catch (error) {
          console.error('Failed to load user communities:', error)
        } finally {
          setLoadingCommunities(false)
        }
      }
      loadUserCommunities()
    } else if (!user) {
      setLoadingCommunities(false)
      hasLoadedCommunities.current = false
    }
  }, [user, currentCommunity]) // Include currentCommunity dependency

  // Fetch shows and category stats when authenticated
  useEffect(() => {
    // Clear any existing debounce timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    // Debounce the data loading to prevent rapid successive calls
    debounceTimeout.current = setTimeout(() => {
      const now = Date.now()
      const timeSinceLastLoad = now - lastLoadTime.current
      
      if (user && currentCommunity && !isLoadingData.current && timeSinceLastLoad > 1000) {
        isLoadingData.current = true
        lastLoadTime.current = now
        console.log('Loading data for community:', currentCommunity.id)
        
        const loadData = async () => {
          try {
            await Promise.all([
              fetchShows(),
              fetchCategoryStats()
            ])
          } catch (error) {
            console.error('Error loading data:', error)
          } finally {
            isLoadingData.current = false
          }
        }
        
        loadData()
      }
    }, 300) // 300ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [user, currentCommunity?.id, fetchShows, fetchCategoryStats, currentCommunity]) // Include function dependencies

  // Apply filters to upcoming shows
  useEffect(() => {
    if (selectedStatusFilters.has('all')) {
      setFilteredUpcomingShows(upcomingShows)
      return
    }

    const filtered = upcomingShows.filter(show => {
      const rsvps = rsvpsData[show.id]
      if (!rsvps) return false

      // Check status filters
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
    
    setFilteredUpcomingShows(filtered)
  }, [selectedStatusFilters, upcomingShows, rsvpsData])


  // Filter functions
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


  const handleClearAllFilters = () => {
    setSelectedStatusFilters(new Set(['all']))
    setSelectedCategoryFilters(new Set(['all']))
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

  const handleShowAdded = async () => {
    // Invalidate cache and refresh data
    setCacheVersion(prev => prev + 1)
    // Small delay to ensure database has been updated
    await new Promise(resolve => setTimeout(resolve, 100))
    // Fetch both upcoming and past shows to ensure new show appears
    await fetchShows(pastShowsPagination.page)
  }


  const loadMorePastShows = useCallback(() => {
    if (pastShowsPagination.hasNext && !loadingMore) {
      fetchShows(pastShowsPagination.page + 1, true)
    }
  }, [pastShowsPagination.hasNext, pastShowsPagination.page, loadingMore, fetchShows])

  // Infinite scroll for past shows
  const { sentinelRef } = useInfiniteScroll({
    hasMore: pastShowsPagination.hasNext,
    isLoading: loadingMore,
    onLoadMore: loadMorePastShows
  })

  const handleEditShow = (show: Show) => {
    setEditingShow(show)
    setShowEditModal(true)
  }

  const handleShowUpdated = async () => {
    // Invalidate cache and refresh data
    setCacheVersion(prev => prev + 1)
    // Small delay to ensure database has been updated
    await new Promise(resolve => setTimeout(resolve, 100))
    // Fetch both upcoming and past shows to ensure updated show appears
    await fetchShows(pastShowsPagination.page)
    setShowEditModal(false)
    setEditingShow(null)
  }

  const updateRSVPs = async (showId: string) => {
    // Clear any existing debounce timeout for this show
    if (rsvpDebounceTimeouts.current[showId]) {
      clearTimeout(rsvpDebounceTimeouts.current[showId])
    }

    // Debounce RSVP updates to prevent rapid successive calls
    rsvpDebounceTimeouts.current[showId] = setTimeout(async () => {
      // Check if this RSVP update is already in progress
      const rsvpKey = `rsvp-${showId}`
      if (activeRequests.current.has(rsvpKey)) {
        console.log(`RSVP update already in progress for show ${showId}, skipping duplicate`)
        return
      }

      try {
        // Mark RSVP update as active
        activeRequests.current.add(rsvpKey)
        
        // Update RSVPs data
        const response = await authenticatedFetch(`/api/rsvps/${showId}`)
        const data = await response.json()
        setRsvpsData(prev => ({ ...prev, [showId]: data }))
        
        // Update user RSVP status
        const userResponse = await authenticatedFetch(`/api/rsvps/${showId}/user`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setUserRsvpStatuses(prev => ({ ...prev, [showId]: userData.status }))
        }
      } catch (error) {
        console.error(`Error updating RSVPs for show ${showId}:`, error)
      } finally {
        // Remove from active requests when done
        activeRequests.current.delete(rsvpKey)
      }
    }, 200) // 200ms debounce for RSVP updates
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
      const response = await authenticatedFetch(`/api/shows/${deletingShowId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete show')
        return
      }

      // Invalidate cache and refresh shows
      setCacheVersion(prev => prev + 1)
      await fetchShows(pastShowsPagination.page)
      setShowDeleteDialog(false)
      setDeletingShowId(null)
      setDeletingShowTitle('')
    } catch (error) {
      console.error('Error deleting show:', error)
      alert('Failed to delete show')
    }
  }

  if (authLoading || loadingCommunities) {
    return (
      <Layout
        currentCommunity={currentCommunity}
        onCommunityChange={setCurrentCommunity}
        showAddButton={false}
        showBreadcrumbs={false}
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
              <RSVPFilterSkeleton />
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

  // Show empty state if user has no communities
  if (userCommunities.length === 0 && !loadingCommunities) {
    return (
      <Layout
        currentCommunity={currentCommunity}
        onCommunityChange={setCurrentCommunity}
        showAddButton={false}
        showBreadcrumbs={false}
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
                <Link href="/communities">Browse Communities</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/communities/create">Create Community</Link>
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
      showBreadcrumbs={false}
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
            {loading ? (
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
            
            {loading ? (
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
                  show={show} 
                  isPast={false} 
                  rsvps={rsvpsData[show.id] || { going: [], maybe: [], not_going: [] }}
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
            
            {/* Combined Filter */}
            {loading ? (
              <RSVPFilterSkeleton />
            ) : (
              <RSVPFilter
                selectedStatusFilters={selectedStatusFilters}
                selectedCategoryFilters={selectedCategoryFilters}
                onStatusFilterToggle={handleStatusFilterToggle}
                onCategoryFilterToggle={handleCategoryFilterToggle}
                filteredShowsCount={pastShows.length}
                onClearAllFilters={handleClearAllFilters}
                categoryStats={categoryStats}
                hasCommunities={userCommunities.length > 0}
              />
            )}
            
            {loading ? (
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
                    show={show} 
                    isPast={true} 
                    rsvps={rsvpsData[show.id] || { going: [], maybe: [], not_going: [] }}
                    userRsvpStatus={userRsvpStatuses[show.id] || null}
                    onEdit={handleEditShow}
                    onDelete={handleDeleteShow}
                    onRSVPUpdate={() => updateRSVPs(show.id)}
                  />
                ))}
                
                {/* Infinite scroll loading indicator */}
                {loadingMore && (
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
              <ReleasesFeed userName={userName} weeks={12} />
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

      {/* PWA Features */}
      {/* PWA features disabled in development */}
      {/* <PWAFeatures onRefresh={fetchShows} /> */}
    </Layout>
  )
}
