import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

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

    // Check for Authorization header first (client-side requests)
    const authHeader = request.headers.get('authorization')
    let supabaseClient
    let user

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Handle client-side requests with Authorization header
      const token = authHeader.replace('Bearer ', '')
      supabaseClient = createClient(
        process.env['NEXT_PUBLIC_SUPABASE_URL']!,
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      user = authUser
    } else {
      // Handle server-side requests with cookies
      supabaseClient = await createServerSupabaseClient()
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
      
      if (authError || !authUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      user = authUser
    }

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

    const statuses: Record<string, string | null> = {}
    showIds.forEach(showId => {
      statuses[showId] = null
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
