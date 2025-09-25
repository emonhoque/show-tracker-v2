import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createSupabaseAdmin } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { isShowPast } from '@/lib/time'
import { validateRsvpStatus } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { show_id, status } = body

    if (!show_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
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

    const statusValidation = validateRsvpStatus(status)
    if (!statusValidation.isValid) {
      return NextResponse.json({ error: statusValidation.error }, { status: 400 })
    }

    const { data: show, error: showError } = await supabaseClient
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

    if (isShowPast(show.date_time) && status !== 'going') {
      return NextResponse.json(
        { error: 'Cannot RSVP to past shows' },
        { status: 409 }
      )
    }

    const rsvpData = {
      show_id,
      status: statusValidation.sanitizedValue!,
      updated_at: new Date().toISOString(),
      community_id: show.community_id,
      user_id: user.id
    }

    const { data, error } = await supabaseClient
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
