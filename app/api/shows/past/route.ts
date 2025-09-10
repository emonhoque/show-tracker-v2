import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { RSVPSummary } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get shows where date_time < now, sorted descending with pagination
    const { data: shows, error: showsError, count } = await supabase
      .from('shows')
      .select(`
        *,
        rsvps(name, status)
      `, { count: 'exact' })
      .lt('date_time', new Date().toISOString())
      .order('date_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (showsError) {
      console.error('Database error:', showsError)
      return NextResponse.json(
        { error: 'Failed to fetch past shows' },
        { status: 500 }
      )
    }

    // Process shows and organize RSVPs
    const processedShows = (shows || []).map(show => {
      const rsvps: RSVPSummary = {
        going: [],
        maybe: [],
        not_going: []
      }

      // Group RSVPs by status
      if (show.rsvps && Array.isArray(show.rsvps)) {
        show.rsvps.forEach((rsvp: { name: string; status: string }) => {
          if (rsvp.status === 'going') {
            rsvps.going.push(rsvp.name)
          } else if (rsvp.status === 'maybe') {
            rsvps.maybe.push(rsvp.name)
          } else if (rsvp.status === 'not_going') {
            rsvps.not_going.push(rsvp.name)
          }
        })
      }

      // Remove rsvps from the show object and add processed rsvps
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { rsvps: _rsvps, ...showWithoutRsvps } = show
      return {
        ...showWithoutRsvps,
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
    
    // Add caching with revalidation for past shows
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    response.headers.set('ETag', `"past-shows-${Math.floor(Date.now() / 60000)}"`)
    
    return response
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
