'use server'

import { supabase } from './db'
import { 
  ShareableUrlResponse, 
  ShowDetailResponse, 
  UrlResolutionResponse, 
  ShareTrackingResponse,
  Show,
  RSVPSummary 
} from './types'

// Feature flag check
function isShareableUrlsEnabled(): boolean {
  return process.env.ENABLE_SHAREABLE_URLS === 'true' || process.env.NODE_ENV === 'development'
}

// Generate a unique public ID
function generatePublicId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Create a URL-friendly slug from a title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

// Generate a shareable URL for a show
export async function generateShareableUrl(showId: string): Promise<ShareableUrlResponse> {
  console.log('=== generateShareableUrl called with showId:', showId)
  
  if (!isShareableUrlsEnabled()) {
    console.log('Shareable URLs feature is disabled')
    return { success: false, error: 'Shareable URLs feature is disabled' }
  }

  try {
    console.log('Fetching show details...')
    // Get the show details first
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select(`
        id,
        title,
        community_id,
        public_id,
        shareable_url
      `)
      .eq('id', showId)
      .single()

    console.log('Show query result:', { show, showError })

    if (showError || !show) {
      console.log('Show not found:', showError)
      return { success: false, error: 'Show not found' }
    }

    // Get community details separately
    let communityNumericId = null
    if (show.community_id) {
      console.log('Fetching community details for:', show.community_id)
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('numeric_id')
        .eq('id', show.community_id)
        .single()
      
      console.log('Community query result:', { community, communityError })
      if (community && !communityError) {
        communityNumericId = community.numeric_id
      }
    }

    // If show already has a shareable URL, return it
    if (show.public_id && show.shareable_url) {
      return {
        success: true,
        shareableUrl: show.shareable_url,
        publicId: show.public_id
      }
    }

    // Generate new shareable URL directly in application code
    const publicId = generatePublicId()
    const slug = createSlug(show.title)
    const shareableUrl = communityNumericId 
      ? `/c/${communityNumericId}/e/${publicId}`
      : `/share/${publicId}`

    // Update the show with the new shareable URL
    const { error: updateError } = await supabase
      .from('shows')
      .update({
        public_id: publicId,
        slug: slug,
        shareable_url: shareableUrl,
        share_count: 0,
        last_shared_at: new Date().toISOString()
      })
      .eq('id', showId)

    if (updateError) {
      return { success: false, error: 'Failed to update show with shareable URL' }
    }

    return {
      success: true,
      shareableUrl: shareableUrl,
      publicId: publicId
    }
  } catch (error) {
    console.error('Error generating shareable URL:', error)
    return { success: false, error: 'Internal server error' }
  }
}

// Get show by public ID and community ID
export async function getShowByPublicId(
  publicId: string, 
  communityId?: string
): Promise<ShowDetailResponse> {
  console.log('=== getShowByPublicId called ===')
  console.log('publicId:', publicId)
  console.log('communityId:', communityId)
  
  if (!isShareableUrlsEnabled()) {
    console.log('Shareable URLs feature is disabled')
    return { success: false, error: 'Shareable URLs feature is disabled' }
  }

  try {
    console.log('Querying shows table for public_id:', publicId)
    // Get show by public ID directly
    const { data: show, error } = await supabase
      .from('shows')
      .select('*')
      .eq('public_id', publicId)
      .single()

    console.log('Show query result:', { show, error })

    if (error || !show) {
      console.log('Show not found in database')
      return { 
        success: false, 
        error: 'Show not found',
        accessRequired: true
      }
    }

    console.log('Found show:', show.id, 'community_id:', show.community_id)

    // If communityId is provided, verify the show belongs to that community
    if (communityId) {
      // Check if communityId is a numeric_id or actual UUID
      let actualCommunityId = communityId
      
      // If it looks like a numeric_id (all digits), look up the actual community_id
      if (/^\d+$/.test(communityId)) {
        console.log('CommunityId looks like numeric_id, looking up actual community_id')
        const { data: community, error: communityError } = await supabase
          .from('communities')
          .select('id')
          .eq('numeric_id', communityId)
          .single()
        
        if (communityError || !community) {
          console.log('Community not found for numeric_id:', communityId)
          return { 
            success: false, 
            error: 'Show not found',
            accessRequired: true
          }
        }
        
        actualCommunityId = community.id
        console.log('Found actual community_id:', actualCommunityId)
      }
      
      if (show.community_id !== actualCommunityId) {
        console.log('Show community mismatch. Expected:', actualCommunityId, 'Found:', show.community_id)
        return { 
          success: false, 
          error: 'Show not found',
          accessRequired: true
        }
      }
    }

    // Get RSVPs for the show
    const { data: rsvps, error: rsvpError } = await supabase
      .from('rsvps')
      .select('name, status')
      .eq('show_id', show.id)

    if (rsvpError) {
      console.error('Error fetching RSVPs:', rsvpError)
    }

    // Group RSVPs by status
    const rsvpSummary: RSVPSummary = {
      going: [],
      maybe: [],
      not_going: []
    }

    if (rsvps) {
      rsvps.forEach(rsvp => {
        rsvpSummary[rsvp.status as keyof RSVPSummary].push(rsvp.name)
      })
    }

    return {
      success: true,
      show,
      rsvps: rsvpSummary
    }
  } catch (error) {
    console.error('Error getting show by public ID:', error)
    return { success: false, error: 'Internal server error' }
  }
}

// Resolve show URL (for URL validation)
export async function resolveShowUrl(
  communityId: string, 
  publicId: string
): Promise<UrlResolutionResponse> {
  if (!isShareableUrlsEnabled()) {
    return { success: false, error: 'Shareable URLs feature is disabled' }
  }

  try {
    const { data: show, error } = await supabase
      .from('shows')
      .select('*')
      .eq('public_id', publicId)
      .single()

    if (error || !show) {
      return { 
        success: false, 
        error: 'Show not found',
        accessRequired: true
      }
    }

    // If communityId is provided, verify the show belongs to that community
    if (communityId && show.community_id !== communityId) {
      return { 
        success: false, 
        error: 'Show not found',
        accessRequired: true
      }
    }

    return {
      success: true,
      show,
      accessRequired: false
    }
  } catch (error) {
    console.error('Error resolving show URL:', error)
    return { success: false, error: 'Internal server error' }
  }
}

// Update share tracking
export async function updateShareTracking(publicId: string): Promise<ShareTrackingResponse> {
  if (!isShareableUrlsEnabled()) {
    return { success: false, error: 'Shareable URLs feature is disabled' }
  }

  try {
    // Use the database function to increment share count
    const { error } = await supabase
      .rpc('increment_share_count', { p_public_id: publicId })

    if (error) {
      return { success: false, error: 'Failed to update share tracking' }
    }

    // Get updated share count
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('share_count')
      .eq('public_id', publicId)
      .single()

    if (showError) {
      return { success: false, error: 'Failed to retrieve share count' }
    }

    return {
      success: true,
      shareCount: show.share_count || 0
    }
  } catch (error) {
    console.error('Error updating share tracking:', error)
    return { success: false, error: 'Internal server error' }
  }
}

// Validate URL access (check if user can access the show)
export async function validateUrlAccess(
  userId: string,
  communityId: string,
  publicId: string
): Promise<{ success: boolean; hasAccess: boolean; error?: string }> {
  if (!isShareableUrlsEnabled()) {
    return { success: false, hasAccess: false, error: 'Shareable URLs feature is disabled' }
  }

  try {
    // Check if user is member of the community
    const { data: membership, error: membershipError } = await supabase
      .from('community_members')
      .select(`
        community_id,
        communities!inner(numeric_id)
      `)
      .eq('user_id', userId)
      .eq('communities.numeric_id', communityId)
      .single()

    if (membershipError || !membership) {
      return { success: true, hasAccess: false }
    }

    // Check if show exists and belongs to the community
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, community_id')
      .eq('public_id', publicId)
      .eq('community_id', membership.community_id)
      .single()

    if (showError || !show) {
      return { success: true, hasAccess: false }
    }

    return { success: true, hasAccess: true }
  } catch (error) {
    console.error('Error validating URL access:', error)
    return { success: false, hasAccess: false, error: 'Internal server error' }
  }
}

// Get shareable URL info without full access (for previews)
export async function getShareableUrlInfo(publicId: string): Promise<{
  success: boolean
  title?: string
  date?: string
  venue?: string
  communityName?: string
  error?: string
}> {
  if (!isShareableUrlsEnabled()) {
    return { success: false, error: 'Shareable URLs feature is disabled' }
  }

  try {
    const { data: show, error } = await supabase
      .from('shows')
      .select(`
        title,
        date_time,
        venue,
        community_id
      `)
      .eq('public_id', publicId)
      .single()

    if (error || !show) {
      return { success: false, error: 'Show not found' }
    }

    // Get community name separately
    let communityName = null
    if (show.community_id) {
      const { data: community } = await supabase
        .from('communities')
        .select('name')
        .eq('id', show.community_id)
        .single()
      
      if (community) {
        communityName = community.name
      }
    }

    return {
      success: true,
      title: show.title,
      date: show.date_time,
      venue: show.venue,
      communityName
    }
  } catch (error) {
    console.error('Error getting shareable URL info:', error)
    return { success: false, error: 'Internal server error' }
  }
}
