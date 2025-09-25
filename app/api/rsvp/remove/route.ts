import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { show_id } = body

    if (!show_id) {
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

    const { data: show, error: showError } = await supabaseClient
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

    const { error } = await supabaseClient
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
