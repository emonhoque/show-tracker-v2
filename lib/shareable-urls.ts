'use server'

import { supabase } from './db'
import { 
  ShareableUrlResponse, 
  ShowDetailResponse, 
  UrlResolutionResponse, 
  ShareTrackingResponse,
  RSVPSummary 
} from './types'

function isShareableUrlsEnabled(): boolean {
  return process.env['ENABLE_SHAREABLE_URLS'] === 'true' || process.env.NODE_ENV === 'development'
}

function generatePublicId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function generateShareableUrl(showId: string): Promise<ShareableUrlResponse> {
  console.log('=== generateShareableUrl called with showId:', showId)
  
  if (!isShareableUrlsEnabled()) {
    console.log('Shareable URLs feature is disabled')
    return { success: false, error: 'Shareable URLs feature is disabled' }
  }

  try {
    console.log('Fetching show details...')
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

    if (show.public_id && show.shareable_url) {
      return {
        success: true,
        shareableUrl: show.shareable_url,
        publicId: show.public_id
      }
    }

    const publicId = generatePublicId()
    const slug = createSlug(show.title)
    const shareableUrl = communityNumericId 
      ? `/groups/${communityNumericId}/event/${publicId}`
      : `/share/${publicId}`

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

export async function getShowByPublicId(
  publicId: string, 
  communityId?: string
): Promise<ShowDetailResponse> {
  
  if (!isShareableUrlsEnabled()) {
    console.log('Shareable URLs feature is disabled')
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

    if (communityId) {
      let actualCommunityId = communityId
      
      if (/^\d+$/.test(communityId)) {
        const { data: community, error: communityError } = await supabase
          .from('communities')
          .select('id')
          .eq('numeric_id', communityId)
          .single()
        
        if (communityError || !community) {
          return { 
            success: false, 
            error: 'Show not found',
            accessRequired: true
          }
        }
        
        actualCommunityId = community.id
      }
      
      if (show.community_id !== actualCommunityId) {
        return { 
          success: false, 
          error: 'Show not found',
          accessRequired: true
        }
      }
    }

    const { data: rsvps, error: rsvpError } = await supabase
      .from('rsvps')
      .select(`
        status,
        user_id,
        profiles!inner(name)
      `)
      .eq('show_id', show.id)

    if (rsvpError) {
      console.error('Error fetching RSVPs:', rsvpError)
    }

    const rsvpSummary: RSVPSummary = {
      going: [],
      maybe: [],
      not_going: []
    }

    if (rsvps) {
      rsvps.forEach((rsvp) => {
        const name = (rsvp.profiles as { name: string }[])?.[0]?.name || 'Unknown User'
        if (rsvp.status === 'going') {
          rsvpSummary.going.push(name)
        } else if (rsvp.status === 'maybe') {
          rsvpSummary.maybe.push(name)
        } else if (rsvp.status === 'not_going') {
          rsvpSummary.not_going.push(name)
        }
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

export async function updateShareTracking(publicId: string): Promise<ShareTrackingResponse> {
  if (!isShareableUrlsEnabled()) {
    return { success: false, error: 'Shareable URLs feature is disabled' }
  }

  try {
    const { error } = await supabase
      .rpc('increment_share_count', { p_public_id: publicId })

    if (error) {
      return { success: false, error: 'Failed to update share tracking' }
    }

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

export async function validateUrlAccess(
  userId: string,
  communityId: string,
  publicId: string
): Promise<{ success: boolean; hasAccess: boolean; error?: string }> {
  if (!isShareableUrlsEnabled()) {
    return { success: false, hasAccess: false, error: 'Shareable URLs feature is disabled' }
  }

  try {
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
