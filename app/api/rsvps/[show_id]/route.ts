import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { RSVPSummary } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ show_id: string }> }
) {
  try {
    const { show_id } = await params

    // Fetch all RSVPs for this show
    const { data, error } = await supabase
      .from('rsvps')
      .select('name, status')
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
        if (rsvp.status === 'going') {
          summary.going.push(rsvp.name)
        } else if (rsvp.status === 'maybe') {
          summary.maybe.push(rsvp.name)
        } else if (rsvp.status === 'not_going') {
          summary.not_going.push(rsvp.name)
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
