import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { isShowPast } from '@/lib/time'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { show_id, status, name } = body

    // Validate required fields
    if (!show_id || !status || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate status
    if (status !== 'going' && status !== 'maybe' && status !== 'not_going') {
      return NextResponse.json(
        { error: 'Invalid status. Must be "going", "maybe", or "not_going"' },
        { status: 400 }
      )
    }

    // Check if the show is in the past
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('date_time')
      .eq('id', show_id)
      .single()

    if (showError || !show) {
      return NextResponse.json(
        { error: 'Show not found' },
        { status: 404 }
      )
    }

    if (isShowPast(show.date_time)) {
      return NextResponse.json(
        { error: 'Cannot RSVP to past shows' },
        { status: 409 }
      )
    }

    // Upsert RSVP
    const { data, error } = await supabase
      .from('rsvps')
      .upsert(
        { show_id, name, status, updated_at: new Date().toISOString() },
        { onConflict: 'show_id,name' }
      )
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save RSVP' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
