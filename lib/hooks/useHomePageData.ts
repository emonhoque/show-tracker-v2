/**
 * Custom hook for home page data with React Query
 * Replaces multiple individual API calls with a single optimized query
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

// Import the API functions
import { 
  fetchUserCommunities,
  fetchUpcomingShows,
  fetchPastShows,
  fetchCategoryStats,
  fetchUserRSVPs,
  fetchReleases
} from '@/lib/api/queries'

interface UseHomePageDataOptions {
  communityId?: string
  categories?: string[]
  enabled?: boolean
}

// Combined home page data function
const fetchHomePageData = async (communityId?: string, categories?: string[]) => {
  const [upcomingShows, pastShows, categoryStats] = await Promise.all([
    fetchUpcomingShows(communityId, categories),
    fetchPastShows(1, communityId, categories),
    fetchCategoryStats(communityId)
  ])

  // Extract all show IDs for bulk RSVP fetch
  const allShowIds = [
    ...upcomingShows.map(show => show.id),
    ...pastShows.data.map(show => show.id)
  ]

  // Fetch user RSVPs for all shows in one request
  const userRsvps = allShowIds.length > 0 ? await fetchUserRSVPs(allShowIds) : {}

  return {
    upcomingShows,
    pastShows,
    categoryStats,
    userRsvps
  }
}

export function useHomePageData({ 
  communityId, 
  categories, 
  enabled = true 
}: UseHomePageDataOptions = {}) {
  return useQuery({
    queryKey: queryKeys.shows,
    queryFn: () => fetchHomePageData(communityId, categories),
    enabled,
    // Cache for 2 minutes since shows data changes frequently
    staleTime: 2 * 60 * 1000,
    // Keep in cache for 5 minutes
    gcTime: 5 * 60 * 1000,
    // Refetch every 5 minutes in background
    refetchInterval: 5 * 60 * 1000,
    // Retry on failure
    retry: 2,
  })
}

/**
 * Hook for communities data with caching
 */
export function useUserCommunities() {
  return useQuery({
    queryKey: queryKeys.communities,
    queryFn: () => fetchUserCommunities(),
    // Cache communities for 10 minutes since they don't change often
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // Only refetch on mount if data is stale
    refetchOnMount: 'always',
  })
}

/**
 * Hook for releases data with pagination support
 */
export function useReleases(
  limit: number = 50,
  days?: number,
  weeks?: number,
  page: number = 1,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.releases(limit, days, weeks, page),
    queryFn: () => fetchReleases(limit, days, weeks, page),
    enabled,
    // Cache releases for 15 minutes since they don't change often
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}
