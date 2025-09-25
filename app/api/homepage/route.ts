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

    let targetCommunityId = communityId
    if (!targetCommunityId && validCommunities.length > 0) {
      targetCommunityId = validCommunities[0]?.community_id || null
    }

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

    if (targetCommunityId) {
      upcomingQuery = upcomingQuery.eq('community_id', targetCommunityId)
      pastQuery = pastQuery.eq('community_id', targetCommunityId)
    } else {
      const communityIds = validCommunities.map(c => c.community_id)
      upcomingQuery = upcomingQuery.in('community_id', communityIds)
      pastQuery = pastQuery.in('community_id', communityIds)
    }

    if (categories && categories !== 'all') {
      const categoryList = categories.split(',').filter(Boolean)
      if (categoryList.length > 0) {
        upcomingQuery = upcomingQuery.in('category', categoryList)
        pastQuery = pastQuery.in('category', categoryList)
      }
    }

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

    const processShows = (shows: unknown[]) => shows.map((show: unknown) => {
      const rsvps = {
        going: [] as string[],
        maybe: [] as string[],
        not_going: [] as string[]
      }

      const showObj = show as { 
        id: string;
        title: string;
        date_time: string;
        city: string;
        venue: string;
        category: string;
        ticket_url?: string;
        spotify_url?: string;
        apple_music_url?: string;
        google_photos_url?: string;
        poster_url?: string;
        notes?: string;
        community_id: string;
        created_at: string;
        rsvps?: Array<{ user_id?: string; status: string }> 
      }
      
      if (showObj.rsvps && Array.isArray(showObj.rsvps)) {
        for (const rsvp of showObj.rsvps) {
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
        id: showObj.id,
        title: showObj.title,
        date_time: showObj.date_time,
        city: showObj.city,
        venue: showObj.venue,
        category: showObj.category,
        ticket_url: showObj.ticket_url,
        spotify_url: showObj.spotify_url,
        apple_music_url: showObj.apple_music_url,
        google_photos_url: showObj.google_photos_url,
        poster_url: showObj.poster_url,
        notes: showObj.notes,
        community_id: showObj.community_id,
        created_at: showObj.created_at,
        rsvps
      }
    })

    const processedUpcomingShows = processShows(upcomingShows || [])
    const processedPastShows = processShows(pastShows || [])

    const allShowIds = allShows.map(show => show.id)

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

    const pastShowsPagination = {
      page: 1,
      limit: 20,
      total: processedPastShows.length,
      totalPages: Math.ceil(processedPastShows.length / 20),
      hasNext: false,
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

    response.headers.set('Cache-Control', 'private, max-age=120')
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
