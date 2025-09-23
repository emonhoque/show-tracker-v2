import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const showIdsParam = searchParams.get('show_ids')

    if (!showIdsParam) {
      return NextResponse.json(
        { error: 'show_ids parameter is required' },
        { status: 400 }
      )
    }

    const showIds = showIdsParam.split(',').filter(Boolean)
    if (showIds.length === 0) {
      return NextResponse.json({ statuses: {} })
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

    // Fetch all user's RSVPs for the specified shows in a single query
    const { data: rsvps, error } = await supabaseClient
      .from('rsvps')
      .select('show_id, status')
      .eq('user_id', user.id)
      .in('show_id', showIds)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch RSVP statuses' },
        { status: 500 }
      )
    }

    // Convert array to object for easy lookup
    const statuses: Record<string, string | null> = {}
    showIds.forEach(showId => {
      statuses[showId] = null // Default to null
    })
    
    if (rsvps) {
      rsvps.forEach(rsvp => {
        statuses[rsvp.show_id] = rsvp.status
      })
    }

    return NextResponse.json({ statuses })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
