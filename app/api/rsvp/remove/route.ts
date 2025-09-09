import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { show_id, name } = body

    // Validate required fields
    if (!show_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Check if show is in the past using the same time logic as RSVP
    const { isShowPast } = await import('@/lib/time')
    if (isShowPast(show.date_time)) {
      return NextResponse.json(
        { error: 'Cannot modify RSVP for past shows' },
        { status: 409 }
      )
    }

    // Delete the RSVP record
    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('show_id', show_id)
      .eq('name', name)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to remove RSVP' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
