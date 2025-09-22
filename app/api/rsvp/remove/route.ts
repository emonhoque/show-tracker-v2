import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { show_id } = body

    // Validate required fields
    if (!show_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get current user for authentication
    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    // Allow RSVP removal for both past and future shows
    // (Users should be able to clear their "I went!" status for past shows)

    // Delete the RSVP record using user_id
    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('show_id', show_id)
      .eq('user_id', user.id)

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
