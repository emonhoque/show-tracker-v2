import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { supabase } from '@/lib/db'
import { randomBytes } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params
    // Get the authenticated user from the request
    const supabaseClient = await createServerSupabaseClient()
    const authHeader = request.headers.get('authorization')
    
    let user
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token)
      if (authError || !authUser) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        )
      }
      user = authUser
    } else {
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      user = authUser
    }

    // Verify user is admin of this community
    const { data: membership, error: membershipError } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Generate invite token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    // Create Discord-style invite
    const { data: invite, error: inviteError } = await supabase
      .from('community_invites')
      .insert({
        community_id: communityId,
        created_by: user.id,
        email: null, // No email for Discord-style invites
        token,
        expires_at: expiresAt.toISOString(),
        max_uses: 100, // Discord-style invites can be used multiple times
        current_uses: 0
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Failed to create invite:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      )
    }

    // Generate invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${token}`

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        token: invite.token,
        expiresAt: invite.expires_at,
        inviteUrl,
        maxUses: invite.max_uses,
        currentUses: invite.current_uses
      }
    })

  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params

    // Get the authenticated user from the request
    const supabaseClient = await createServerSupabaseClient()
    const authHeader = request.headers.get('authorization')
    
    let user
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token)
      if (authError || !authUser) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        )
      }
      user = authUser
    } else {
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      user = authUser
    }

    // Verify user is admin of this community
    const { data: membership, error: membershipError } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get active invites
    const { data: invites, error: invitesError } = await supabase
      .from('community_invites')
      .select('*')
      .eq('community_id', communityId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (invitesError) {
      console.error('Failed to fetch invites:', invitesError)
      return NextResponse.json(
        { error: 'Failed to fetch invites' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invites: invites || []
    })

  } catch (error) {
    console.error('Error fetching invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
