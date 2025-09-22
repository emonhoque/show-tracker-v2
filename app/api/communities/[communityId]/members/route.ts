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

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

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
      message: 'Member removed successfully'
    })

  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
