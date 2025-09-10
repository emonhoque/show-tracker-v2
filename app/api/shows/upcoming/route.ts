import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { RSVPSummary } from '@/lib/types'

export async function GET() {
  try {
    // Get shows where date_time >= now (using current timestamp)
    const now = new Date()
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select(`
        *,
        rsvps!inner(name, status)
      `)
      .gte('date_time', now.toISOString())
      .order('date_time', { ascending: true })

    if (showsError) {
      console.error('Database error:', showsError)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming shows' },
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
      if (show.rsvps) {
        show.rsvps.forEach((rsvp: any) => {
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
      const { rsvps: _, ...showWithoutRsvps } = show
      return {
        ...showWithoutRsvps,
        rsvps
      }
    })

    const response = NextResponse.json(processedShows)
    
    // Add caching headers for 1 minute
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
