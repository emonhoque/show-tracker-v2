import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { validateUserName } from '@/lib/validation'

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

    // Validate and sanitize user name
    const nameValidation = validateUserName(name)
    if (!nameValidation.isValid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 })
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

    // Allow RSVP removal for both past and future shows
    // (Users should be able to clear their "I went!" status for past shows)

    // Delete the RSVP record with sanitized name
    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('show_id', show_id)
      .eq('name', nameValidation.sanitizedValue)

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
