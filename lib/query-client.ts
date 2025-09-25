/**
 * React Query client configuration with optimized settings
 * for reducing API calls and improving performance
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

/**
 * Query keys for consistent caching
 */
export const queryKeys = {
  communities: ['communities'] as const,
  community: (id: string) => ['communities', id] as const,
  communityMembers: (id: string) => ['communities', id, 'members'] as const,
  
  shows: ['shows'] as const,
  upcomingShows: (communityId?: string, categories?: string[]) => 
    ['shows', 'upcoming', communityId, categories] as const,
  pastShows: (page: number, communityId?: string, categories?: string[]) => 
    ['shows', 'past', page, communityId, categories] as const,
  show: (id: string) => ['shows', id] as const,
  
  rsvps: (showId: string) => ['rsvps', showId] as const,
  userRsvps: (showIds: string[]) => ['rsvps', 'user', showIds] as const,
  
  categoryStats: (communityId?: string) => ['categories', 'stats', communityId] as const,
  
  releases: (limit: number, days?: number, weeks?: number, page?: number) => 
    ['releases', limit, days, weeks, page] as const,
  
  profile: ['profile'] as const,
} as const
