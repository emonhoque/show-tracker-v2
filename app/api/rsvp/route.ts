import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { createServerSupabaseClient, createSupabaseAdmin } from '@/lib/supabase-server'
import { isShowPast } from '@/lib/time'
import { validateRsvpStatus } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { show_id, status } = body

    // Validate required fields
    if (!show_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get current user for authentication and community validation
    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // No need to validate name since we're using user_id

    // Validate status
    const statusValidation = validateRsvpStatus(status)
    if (!statusValidation.isValid) {
      return NextResponse.json({ error: statusValidation.error }, { status: 400 })
    }

    // Check if the show exists and get community info
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('date_time, community_id')
      .eq('id', show_id)
      .single()

    if (showError || !show) {
      return NextResponse.json(
        { error: 'Show not found' },
        { status: 404 }
      )
    }

    // If show has a community, verify user is a member
    if (show.community_id) {
      const supabaseAdmin = createSupabaseAdmin()
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('community_members')
        .select('role')
        .eq('community_id', show.community_id)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: 'You are not a member of this community' },
          { status: 403 }
        )
      }
    }

    // For past shows, only allow "going" status (for "I was there!" functionality)
    if (isShowPast(show.date_time) && status !== 'going') {
      return NextResponse.json(
        { error: 'Cannot RSVP to past shows' },
        { status: 409 }
      )
    }

    // Upsert RSVP using user_id
    const rsvpData = {
      show_id,
      status: statusValidation.sanitizedValue!,
      updated_at: new Date().toISOString(),
      community_id: show.community_id,
      user_id: user.id
    }

    // Use upsert with the correct primary key (show_id, user_id)
    const { data, error } = await supabase
      .from('rsvps')
      .upsert(
        rsvpData,
        { onConflict: 'show_id,user_id' }
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
