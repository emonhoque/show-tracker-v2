import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { RSVPSummary } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('community_id')
    const categories = searchParams.get('categories')

    // Get current user for community filtering (temporarily disabled for debugging)
    // const supabaseClient = createServerClient(request)
    // const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    // if (authError || !user) {
    //   return NextResponse.json(
    //     { error: 'Authentication required' },
    //     { status: 401 }
    //   )
    // }

    // Build query with community filtering - only select necessary fields
    let query = supabase
      .from('shows')
      .select(`
        id,
        title,
        date_time,
        time_local,
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

    // If community_id is provided, filter by it
    if (communityId) {
      query = query.eq('community_id', communityId)
    }
    // TODO: Re-enable user-based community filtering after fixing authentication
    // else {
    //   // If no community_id provided, get user's communities and filter by them
    //   const { data: userCommunities } = await supabaseClient
    //     .from('community_members')
    //     .select('community_id')
    //     .eq('user_id', user.id)

    //   if (userCommunities && userCommunities.length > 0) {
    //     const communityIds = userCommunities.map((c: { community_id: string }) => c.community_id)
    //     query = query.in('community_id', communityIds)
    //   } else {
    //     // If user has no communities, return empty array
    //     return NextResponse.json([])
    //   }
    // }

    // Add category filtering if specified
    if (categories && categories !== 'all') {
      const categoryList = categories.split(',').filter(Boolean)
      if (categoryList.length > 0) {
        query = query.in('category', categoryList)
      }
    }

    const { data: shows, error: showsError } = await query

    if (showsError) {
      console.error('Database error:', showsError)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming shows' },
        { status: 500 }
      )
    }

    // Get all unique user IDs from RSVPs
    const userIds = new Set<string>()
    if (shows) {
      for (const show of shows) {
        if (show.rsvps && Array.isArray(show.rsvps)) {
          for (const rsvp of show.rsvps) {
            if (rsvp.user_id) {
              userIds.add(rsvp.user_id)
            }
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
    const processedShows = (shows || []).map(show => {
      const rsvps: RSVPSummary = {
        going: [],
        maybe: [],
        not_going: []
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

      // Return optimized show object
      return {
        id: show.id,
        title: show.title,
        date_time: show.date_time,
        time_local: show.time_local,
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

    const response = NextResponse.json(processedShows)
    
    // No caching for upcoming shows to ensure real-time updates
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Content-Type', 'application/json; charset=utf-8')
    
    return response
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
