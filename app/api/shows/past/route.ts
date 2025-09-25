import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { RSVPSummary } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const categories = searchParams.get('categories')

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
      `, { count: 'exact' })
      .lt('date_time', new Date().toISOString())
      .order('date_time', { ascending: false })

    if (categories && categories !== 'all') {
      const categoryList = categories.split(',').filter(Boolean)
      if (categoryList.length > 0) {
        query = query.in('category', categoryList)
      }
    }

    const { data: shows, error: showsError, count } = await query.range(offset, offset + limit - 1)

    if (showsError) {
      console.error('Database error:', showsError)
      return NextResponse.json(
        { error: 'Failed to fetch past shows' },
        { status: 500 }
      )
    }

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

    const processedShows = (shows || []).map(show => {
      const rsvps: RSVPSummary = {
        going: [],
        maybe: [],
        not_going: []
      }

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

    const totalPages = Math.ceil((count || 0) / limit)

    const response = NextResponse.json({
      shows: processedShows,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
    
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    response.headers.set('ETag', `"past-shows-${Math.floor(Date.now() / 60000)}"`)
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
