import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createSupabaseAdmin } from '@/lib/supabase-server'
import { z } from 'zod'

const acceptInviteSchema = z.object({
  token: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    console.log('Accept invite API called')
    const body = await request.json()
    console.log('Request body:', body)
    
    const validatedInput = acceptInviteSchema.parse(body)
    console.log('Validated input:', validatedInput)
    
    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    console.log('Auth result:', { user: user?.id, error: authError?.message })
    
    if (authError || !user) {
      console.log('Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const supabase = createSupabaseAdmin()
    
    const { data: invite, error: inviteError } = await supabase
      .from('community_invites')
      .select('*')
      .eq('token', validatedInput.token)
      .single()
    
    console.log('Invite lookup result:', { invite: invite?.id, error: inviteError?.message })
    
    if (inviteError || !invite) {
      console.log('Invite not found or error:', inviteError)
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 404 }
      )
    }
    
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 410 }
      )
    }
    
    if (invite.current_uses >= invite.max_uses) {
      return NextResponse.json(
        { error: 'Invite has reached maximum uses' },
        { status: 410 }
      )
    }
    
    const { data: existingMembership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', invite.community_id)
      .eq('user_id', user.id)
      .single()
    
    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this community' },
        { status: 409 }
      )
    }
    
    const { error: memberError } = await supabase
      .from('community_members')
      .insert({
        community_id: invite.community_id,
        user_id: user.id,
        role: 'member',
        invited_by: invite.created_by
      })
    
    if (memberError) {
      console.error('Failed to add member:', memberError)
      return NextResponse.json(
        { error: 'Failed to join community' },
        { status: 500 }
      )
    }
    
    await supabase
      .from('community_invites')
      .update({ current_uses: invite.current_uses + 1 })
      .eq('id', invite.id)
    
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('id', invite.community_id)
      .single()
    
    if (communityError) {
      console.error('Failed to fetch community:', communityError)
      return NextResponse.json(
        { error: 'Failed to fetch community details' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      community
    })
    
  } catch (error) {
    console.error('Error accepting invite:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
