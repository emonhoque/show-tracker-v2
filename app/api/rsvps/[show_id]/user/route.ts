import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ show_id: string }> }
) {
  try {
    const { show_id } = await params

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

    const { data, error } = await supabaseClient
      .from('rsvps')
      .select('status')
      .eq('show_id', show_id)
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch RSVP status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: data?.status || null })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
