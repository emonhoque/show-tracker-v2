import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { supabase } from '@/lib/db'

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

    // Verify user has access to this community
    const { data: membership, error: membershipError } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this community' },
        { status: 403 }
      )
    }

    // Get community members with profile information
    const { data: members, error: membersError } = await supabase
      .from('community_members')
      .select(`
        user_id,
        role,
        joined_at,
        invited_by,
        profiles!community_members_user_id_fkey(
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('community_id', communityId)
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('Failed to fetch community members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch community members' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      members: members || []
    })

  } catch (error) {
    console.error('Error fetching community members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const isLeaving = searchParams.get('leave') === 'true'

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

    if (isLeaving) {
      // User is leaving the community themselves
      if (!userId || userId !== user.id) {
        return NextResponse.json(
          { error: 'You can only leave communities yourself' },
          { status: 400 }
        )
      }

      // Verify user is a member of this community
      const { data: membership, error: membershipError } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: 'You are not a member of this community' },
          { status: 404 }
        )
      }

      // Check if user is the only admin
      if (membership.role === 'admin') {
        const { count: adminCount, error: adminCountError } = await supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('role', 'admin')

        if (adminCountError) {
          console.error('Failed to check admin count:', adminCountError)
          return NextResponse.json(
            { error: 'Failed to verify admin status' },
            { status: 500 }
          )
        }

        if (adminCount === 1) {
          return NextResponse.json(
            { error: 'Cannot leave community as the only admin. Transfer ownership or promote another member to admin first.' },
            { status: 400 }
          )
        }
      }

      // Remove user's RSVPs from community events first
      console.log(`Removing RSVPs for user ${user.id} from community ${communityId}`)
      const { error: rsvpError, count: rsvpCount } = await supabase
        .from('rsvps')
        .delete({ count: 'exact' })
        .eq('community_id', communityId)
        .eq('user_id', user.id)

      if (rsvpError) {
        console.error('Failed to remove RSVPs when leaving community:', rsvpError)
        return NextResponse.json(
          { error: 'Failed to remove RSVPs when leaving community' },
          { status: 500 }
        )
      }

      console.log(`Removed ${rsvpCount || 0} RSVPs for user ${user.id} from community ${communityId}`)

      // Remove user from community
      const { error: removeError } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id)

      if (removeError) {
        console.error('Failed to leave community:', removeError)
        return NextResponse.json(
          { error: 'Failed to leave community' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Successfully left the community${rsvpCount ? ` and removed ${rsvpCount} RSVP${rsvpCount !== 1 ? 's' : ''}` : ''}`
      })
    } else {
      // Admin is removing another member
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        )
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

      // Check if trying to remove another admin
      const { data: targetMember, error: targetError } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .single()

      if (targetError || !targetMember) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        )
      }

      if (targetMember.role === 'admin') {
        return NextResponse.json(
          { error: 'Cannot remove admin members' },
          { status: 400 }
        )
      }

      // Remove member's RSVPs from community events first
      console.log(`Removing RSVPs for user ${userId} from community ${communityId} (admin removal)`)
      const { error: rsvpError, count: rsvpCount } = await supabase
        .from('rsvps')
        .delete({ count: 'exact' })
        .eq('community_id', communityId)
        .eq('user_id', userId)

      if (rsvpError) {
        console.error('Failed to remove RSVPs when removing member:', rsvpError)
        return NextResponse.json(
          { error: 'Failed to remove RSVPs when removing member' },
          { status: 500 }
        )
      }

      console.log(`Removed ${rsvpCount || 0} RSVPs for user ${userId} from community ${communityId} (admin removal)`)

      // Remove member
      const { error: removeError } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId)

      if (removeError) {
        console.error('Failed to remove member:', removeError)
        return NextResponse.json(
          { error: 'Failed to remove member' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Member removed successfully${rsvpCount ? ` and removed ${rsvpCount} RSVP${rsvpCount !== 1 ? 's' : ''}` : ''}`
      })
    }

  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
