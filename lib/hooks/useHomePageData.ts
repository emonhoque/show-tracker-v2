/**
 * Custom hook for home page data with React Query
 * Replaces multiple individual API calls with a single optimized query
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

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

const fetchHomePageData = async (communityId?: string, categories?: string[]) => {
  const [upcomingShows, pastShows, categoryStats] = await Promise.all([
    fetchUpcomingShows(communityId, categories),
    fetchPastShows(1, communityId), // No category filtering for past shows
    fetchCategoryStats(communityId)
  ])

  const allShowIds = [
    ...upcomingShows.map(show => show.id),
    ...pastShows.data.map(show => show.id)
  ]

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
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
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
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}
