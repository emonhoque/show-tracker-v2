/**
 * Combined homepage API endpoint
 * Reduces multiple API calls into a single optimized request
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabaseClient = await createServerSupabaseClient()
    const authHeader = request.headers.get('authorization')
    
    let user
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token)
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }
      user = authUser
    } else {
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = authUser
    }

    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('community_id')
    const categories = searchParams.get('categories')

    // Get user's communities first
    const { data: communityMembers, error: communitiesError } = await supabase
      .from('community_members')
      .select('community_id, role')
      .eq('user_id', user.id)

    if (communitiesError) {
      logger.error('Failed to fetch user communities:', { error: communitiesError })
      return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 })
    }

    if (!communityMembers || communityMembers.length === 0) {
      return NextResponse.json({
        success: true,
        communities: [],
        upcomingShows: [],
        pastShows: { shows: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } },
        categoryStats: [],
        userRsvps: {}
      })
    }

    // Get community details for each community
    const communities = await Promise.all(
      communityMembers.map(async (member: { community_id: string; role: string }) => {
        const { data: community, error: communityError } = await supabase
          .from('communities')
          .select('id, name, numeric_id, created_at, music_enabled, description')
          .eq('id', member.community_id)
          .single()

        if (communityError) {
          logger.error('Failed to fetch community', { error: communityError, communityId: member.community_id })
          return null
        }

        const { count: memberCount } = await supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', member.community_id)

        return {
          community_id: member.community_id,
          community_name: community.name,
          community_numeric_id: community.numeric_id,
          user_role: member.role,
          member_count: memberCount || 0,
          community: {
            id: community.id,
            name: community.name,
            description: community.description,
            numeric_id: community.numeric_id,
            created_at: community.created_at,
            music_enabled: community.music_enabled
          }
        }
      })
    )

    const validCommunities = communities.filter(community => community !== null)

    // Determine which community to use for shows
    let targetCommunityId = communityId
    if (!targetCommunityId && validCommunities.length > 0) {
      targetCommunityId = validCommunities[0]?.community_id || null
    }

    // Build shows query
    let upcomingQuery = supabase
      .from('shows')
      .select(`
        id,
        title,
        date_time,
        city,
        venue,
        category,
        ticket_url,
        spotify_url,
        apple_music_url,
        google_photos_url,
        poster_url,
        notes,
        community_id,
        created_at,
        rsvps(status, user_id)
      `)
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true })

    let pastQuery = supabase
      .from('shows')
      .select(`
        id,
        title,
        date_time,
        city,
        venue,
        category,
        ticket_url,
        spotify_url,
        apple_music_url,
        google_photos_url,
        poster_url,
        notes,
        community_id,
        created_at,
        rsvps(status, user_id)
      `)
      .lt('date_time', new Date().toISOString())
      .order('date_time', { ascending: false })
      .limit(20)

    // Apply community filter
    if (targetCommunityId) {
      upcomingQuery = upcomingQuery.eq('community_id', targetCommunityId)
      pastQuery = pastQuery.eq('community_id', targetCommunityId)
    } else {
      // Filter by user's communities
      const communityIds = validCommunities.map(c => c.community_id)
      upcomingQuery = upcomingQuery.in('community_id', communityIds)
      pastQuery = pastQuery.in('community_id', communityIds)
    }

    // Apply category filter
    if (categories && categories !== 'all') {
      const categoryList = categories.split(',').filter(Boolean)
      if (categoryList.length > 0) {
        upcomingQuery = upcomingQuery.in('category', categoryList)
        pastQuery = pastQuery.in('category', categoryList)
      }
    }

    // Fetch both upcoming and past shows in parallel
    const [{ data: upcomingShows, error: upcomingError }, { data: pastShows, error: pastError }] = await Promise.all([
      upcomingQuery,
      pastQuery
    ])

    if (upcomingError) {
      logger.error('Failed to fetch upcoming shows:', { error: upcomingError })
      return NextResponse.json({ error: 'Failed to fetch upcoming shows' }, { status: 500 })
    }

    if (pastError) {
      logger.error('Failed to fetch past shows:', { error: pastError })
      return NextResponse.json({ error: 'Failed to fetch past shows' }, { status: 500 })
    }

    // Get all unique user IDs from RSVPs
    const userIds = new Set<string>()
    const allShows = [...(upcomingShows || []), ...(pastShows || [])]
    
    for (const show of allShows) {
      if (show.rsvps && Array.isArray(show.rsvps)) {
        for (const rsvp of show.rsvps) {
          if (rsvp.user_id) {
            userIds.add(rsvp.user_id)
          }
        }
      }
    }

    // Fetch user names for all RSVPs
    let userNames: Record<string, string> = {}
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', Array.from(userIds))
      
      if (profiles) {
        userNames = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile.name || 'Unknown User'
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Process shows and organize RSVPs efficiently
    const processShows = (shows: any[]) => shows.map((show: any) => {
      const rsvps = {
        going: [] as string[],
        maybe: [] as string[],
        not_going: [] as string[]
      }

      // Group RSVPs by status efficiently
      if (show.rsvps && Array.isArray(show.rsvps)) {
        for (const rsvp of show.rsvps) {
          const name = rsvp.user_id ? (userNames[rsvp.user_id] || 'Unknown User') : 'Unknown User'
          if (rsvp.status === 'going') {
            rsvps.going.push(name)
          } else if (rsvp.status === 'maybe') {
            rsvps.maybe.push(name)
          } else if (rsvp.status === 'not_going') {
            rsvps.not_going.push(name)
          }
        }
      }

      return {
        id: show.id,
        title: show.title,
        date_time: show.date_time,
        city: show.city,
        venue: show.venue,
        category: show.category,
        ticket_url: show.ticket_url,
        spotify_url: show.spotify_url,
        apple_music_url: show.apple_music_url,
        google_photos_url: show.google_photos_url,
        poster_url: show.poster_url,
        notes: show.notes,
        community_id: show.community_id,
        created_at: show.created_at,
        rsvps
      }
    })

    const processedUpcomingShows = processShows(upcomingShows || [])
    const processedPastShows = processShows(pastShows || [])

    // Get all show IDs for user RSVP statuses
    const allShowIds = allShows.map(show => show.id)

    // Fetch user RSVP statuses for all shows
    let userRsvps: Record<string, string | null> = {}
    if (allShowIds.length > 0) {
      const { data: userRsvpData } = await supabase
        .from('rsvps')
        .select('show_id, status')
        .eq('user_id', user.id)
        .in('show_id', allShowIds)

      if (userRsvpData) {
        userRsvps = userRsvpData.reduce((acc, rsvp) => {
          acc[rsvp.show_id] = rsvp.status
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Fetch category statistics
    let categoryStats: Array<{ category: string; count: number }> = []
    if (targetCommunityId) {
      const { data: statsData } = await supabase
        .from('shows')
        .select('category')
        .eq('community_id', targetCommunityId)
        .gte('date_time', new Date().toISOString())

      if (statsData) {
        const categoryCounts = statsData.reduce((acc, show) => {
          const category = show.category || 'general'
          acc[category] = (acc[category] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        categoryStats = Object.entries(categoryCounts).map(([category, count]) => ({
          category,
          count
        }))
      }
    }

    // Calculate pagination for past shows
    const pastShowsPagination = {
      page: 1,
      limit: 20,
      total: processedPastShows.length,
      totalPages: Math.ceil(processedPastShows.length / 20),
      hasNext: false, // We only fetch first 20 for now
      hasPrev: false
    }

    const response = NextResponse.json({
      success: true,
      communities: validCommunities,
      upcomingShows: processedUpcomingShows,
      pastShows: {
        shows: processedPastShows,
        pagination: pastShowsPagination
      },
      categoryStats,
      userRsvps
    })

    // Add caching headers
    response.headers.set('Cache-Control', 'private, max-age=120') // 2 minutes cache
    response.headers.set('Content-Type', 'application/json; charset=utf-8')

    return response

  } catch (error) {
    logger.error('Homepage API error:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
