/**
 * Centralized API query functions with React Query integration
 * This reduces API calls by providing intelligent caching and deduplication
 */

// import { queryKeys } from '@/lib/query-client' // Not used in this file
import { createClient } from '@/lib/supabase'

// Types
interface Show {
  id: string
  title: string
  date_time: string
  city: string
  venue: string
  category: string
  ticket_url?: string
  spotify_url?: string
  apple_music_url?: string
  google_photos_url?: string
  poster_url?: string
  notes?: string
  community_id: string
  created_at: string
  rsvps?: {
    going: string[]
    maybe: string[]
    not_going: string[]
  }
}

interface Community {
  id: string
  name: string
  description?: string
  numeric_id: string
  created_at: string
  music_enabled: boolean
}

interface UserCommunity {
  community_id: string
  community_name: string
  community_numeric_id: string
  user_role: string
  member_count: number
  community: Community
}

interface RSVPSummary {
  going: string[]
  maybe: string[]
  not_going: string[]
}

interface CategoryStats {
  category: string
  count: number
}

interface Release {
  id: string
  name: string
  release_date: string
  artists: Array<{ id: string; name: string }> | null
  album_type: string
  image_url?: string
  spotify_url?: string
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Helper function for authenticated requests
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('No session token available')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * API Query Functions
 */

// Communities
export const fetchUserCommunities = async (): Promise<UserCommunity[]> => {
  const data = await authenticatedFetch('/api/communities')
  return data.communities || []
}

export const fetchCommunity = async (id: string): Promise<Community> => {
  const data = await authenticatedFetch(`/api/communities?id=${id}`)
  return data.community
}

export const fetchCommunityMembers = async (communityId: string) => {
  const data = await authenticatedFetch(`/api/communities/${communityId}/members`)
  return data.members || []
}

// Shows
export const fetchUpcomingShows = async (
  communityId?: string, 
  categories?: string[]
): Promise<Show[]> => {
  const params = new URLSearchParams()
  if (communityId) params.append('community_id', communityId)
  if (categories && categories.length > 0 && !categories.includes('all')) {
    params.append('categories', categories.join(','))
  }
  
  const url = `/api/shows/upcoming${params.toString() ? `?${params.toString()}` : ''}`
  return authenticatedFetch(url)
}

export const fetchPastShows = async (
  page: number = 1,
  communityId?: string,
  categories?: string[]
): Promise<PaginatedResponse<Show>> => {
  const params = new URLSearchParams()
  params.append('page', page.toString())
  params.append('limit', '20')
  if (communityId) params.append('community_id', communityId)
  if (categories && categories.length > 0 && !categories.includes('all')) {
    params.append('categories', categories.join(','))
  }
  
  const url = `/api/shows/past?${params.toString()}`
  const data = await authenticatedFetch(url)
  return {
    data: data.shows || [],
    pagination: data.pagination || {
      page,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }
  }
}

export const fetchShow = async (id: string): Promise<Show> => {
  return authenticatedFetch(`/api/shows/${id}`)
}

// RSVPs
export const fetchRSVPs = async (showId: string): Promise<RSVPSummary> => {
  return authenticatedFetch(`/api/rsvps/${showId}`)
}

export const fetchUserRSVPs = async (showIds: string[]): Promise<Record<string, string | null>> => {
  if (showIds.length === 0) return {}
  const data = await authenticatedFetch(`/api/rsvps/bulk?show_ids=${showIds.join(',')}`)
  return data.statuses || {}
}

// Categories
export const fetchCategoryStats = async (communityId?: string): Promise<CategoryStats[]> => {
  const url = communityId 
    ? `/api/categories/stats?community_id=${communityId}`
    : '/api/categories/stats'
  const data = await authenticatedFetch(url)
  return data.stats || []
}

// Releases
export const fetchReleases = async (
  limit: number = 50,
  days?: number,
  weeks?: number,
  page: number = 1
): Promise<PaginatedResponse<Release>> => {
  const params = new URLSearchParams()
  params.append('limit', limit.toString())
  params.append('page', page.toString())
  
  if (weeks && weeks > 0) {
    params.append('weeks', weeks.toString())
  } else {
    params.append('days', (days || 30).toString())
  }
  
  const url = `/api/releases?${params.toString()}`
  const data = await authenticatedFetch(url)
  return {
    data: data.releases || [],
    pagination: data.pagination || {
      page,
      limit,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }
  }
}

// Profile
export const fetchProfile = async () => {
  return authenticatedFetch('/api/profile')
}

/**
 * Optimized query functions that combine multiple API calls
 */

// Combined community data with members
export const fetchCommunityWithMembers = async (communityId: string) => {
  const [community, members] = await Promise.all([
    fetchCommunity(communityId),
    fetchCommunityMembers(communityId)
  ])

  return {
    community,
    members
  }
}
