/**
 * React Query client configuration with optimized settings
 * for reducing API calls and improving performance
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry failed requests up to 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus only for critical data
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
})

/**
 * Query keys for consistent caching
 */
export const queryKeys = {
  // Communities
  communities: ['communities'] as const,
  community: (id: string) => ['communities', id] as const,
  communityMembers: (id: string) => ['communities', id, 'members'] as const,
  
  // Shows
  shows: ['shows'] as const,
  upcomingShows: (communityId?: string, categories?: string[]) => 
    ['shows', 'upcoming', communityId, categories] as const,
  pastShows: (page: number, communityId?: string, categories?: string[]) => 
    ['shows', 'past', page, communityId, categories] as const,
  show: (id: string) => ['shows', id] as const,
  
  // RSVPs
  rsvps: (showId: string) => ['rsvps', showId] as const,
  userRsvps: (showIds: string[]) => ['rsvps', 'user', showIds] as const,
  
  // Categories
  categoryStats: (communityId?: string) => ['categories', 'stats', communityId] as const,
  
  // Releases
  releases: (limit: number, days?: number, weeks?: number, page?: number) => 
    ['releases', limit, days, weeks, page] as const,
  
  // Profile
  profile: ['profile'] as const,
} as const
