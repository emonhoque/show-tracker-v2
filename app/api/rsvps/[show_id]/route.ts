import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { RSVPSummary } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ show_id: string }> }
) {
  try {
    const { show_id } = await params

    // Fetch all RSVPs for this show with profile names
    const { data, error } = await supabase
      .from('rsvps')
      .select(`
        status,
        user_id,
        profiles!inner(name)
      `)
      .eq('show_id', show_id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch RSVPs' },
        { status: 500 }
      )
    }

    // Organize RSVPs by status
    const summary: RSVPSummary = {
      going: [],
      maybe: [],
      not_going: []
    }

    if (data) {
      data.forEach((rsvp) => {
        const name = (rsvp.profiles as { name: string })?.name || 'Unknown User'
        if (rsvp.status === 'going') {
          summary.going.push(name)
        } else if (rsvp.status === 'maybe') {
          summary.maybe.push(name)
        } else if (rsvp.status === 'not_going') {
          summary.not_going.push(name)
        }
      })
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
