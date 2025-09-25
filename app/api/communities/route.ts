import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('id')
    const isCurrent = searchParams.get('current') === 'true'

    if (isCurrent) {
      logger.debug('Fetching current community for user', { userId: user.id })
      
      const { data: communityMembers, error } = await supabaseClient
        .from('community_members')
        .select('community_id, role')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1)
      
      if (error) {
        logger.error('Failed to fetch current community', { error, userId: user.id })
        return NextResponse.json(
          { error: 'Failed to fetch current community' },
          { status: 500 }
        )
      }
      
      if (!communityMembers || communityMembers.length === 0) {
        return NextResponse.json(
          { error: 'No communities found' },
          { status: 404 }
        )
      }
      
      const member = communityMembers[0]
      if (!member) {
        return NextResponse.json(
          { error: 'No community membership found' },
          { status: 404 }
        )
      }
      
      const { data: community, error: communityError } = await supabaseClient
        .from('communities')
        .select('id, name, description, numeric_id, created_at, music_enabled')
        .eq('id', member.community_id)
        .single()
      
      if (communityError) {
        logger.error('Failed to fetch community details', { error: communityError, communityId: member.community_id })
        return NextResponse.json(
          { error: 'Failed to fetch community details' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        community
      })
    } else if (communityId) {
      logger.debug('Fetching specific community', { communityId, userId: user.id })
      
      const { data: userCommunities, error: communitiesError } = await supabaseClient
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
      
      if (communitiesError) {
        logger.error('Failed to fetch user communities:', { error: communitiesError })
        return NextResponse.json(
          { error: 'Failed to verify community access' },
          { status: 500 }
        )
      }
      
      const hasAccess = userCommunities?.some((c: { community_id: string }) => c.community_id === communityId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this community' },
          { status: 403 }
        )
      }
      
      const { data: community, error: communityError } = await supabaseClient
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single()
      
      if (communityError) {
        logger.error('Failed to fetch community details:', { error: communityError })
        return NextResponse.json(
          { error: 'Failed to fetch community details' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        community
      })
    } else {
      const { data: communityMembers, error } = await supabaseClient
        .from('community_members')
        .select('community_id, role')
        .eq('user_id', user.id)
      
      if (error) {
        logger.error('Failed to fetch community members', { error, userId: user.id })
        return NextResponse.json(
          { error: 'Failed to fetch communities', details: error.message },
          { status: 500 }
        )
      }
      
      if (!communityMembers || communityMembers.length === 0) {
        return NextResponse.json({
          success: true,
          communities: []
        })
      }
      
      const transformedCommunities = await Promise.all(
        communityMembers.map(async (member: { community_id: string; role: string }) => {
          const { data: community, error: communityError } = await supabaseClient
            .from('communities')
            .select('id, name, numeric_id, created_at, music_enabled, description')
            .eq('id', member.community_id)
            .single()
          
          if (communityError) {
            logger.error('Failed to fetch community', { error: communityError, communityId: member.community_id })
            return null
          }
          
          const { count: memberCount } = await supabaseClient
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', member.community_id)
          
          return {
            community_id: member.community_id,
            community_name: community.name,
            community_numeric_id: community.numeric_id,
            user_role: member.role,
            member_count: memberCount || 0,
            community: {
              id: community.id,
              name: community.name,
              description: community.description,
              numeric_id: community.numeric_id,
              created_at: community.created_at,
              music_enabled: community.music_enabled
            }
          }
        })
      )
      
      const validCommunities = transformedCommunities.filter(community => community !== null)

      const response = NextResponse.json({
        success: true,
        communities: validCommunities
      })
      
      response.headers.set('Cache-Control', 'private, max-age=300') 
      
      return response
    }

  } catch (error) {
    logger.error('Error fetching communities', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    logger.debug('API received body', { body })
    const { name, description, music_enabled } = body

    if (!name || !name.trim()) {
      logger.warn('Validation failed: name is required')
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

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

    logger.debug('Authenticated user', { userId: user.id })

    const supabaseAdmin = createSupabaseAdmin()
    
    let numericId: string = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10
    
    while (!isUnique && attempts < maxAttempts) {
      numericId = Math.floor(10000000 + Math.random() * 90000000).toString()
      
      const { data: existingCommunity } = await supabaseAdmin
        .from('communities')
        .select('id')
        .eq('numeric_id', numericId)
        .single()
      
      if (!existingCommunity) {
        isUnique = true
      }
      attempts++
    }
    
    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique community ID. Please try again.' },
        { status: 500 }
      )
    }
    
    const { data: community, error: communityError } = await supabaseAdmin
      .from('communities')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        numeric_id: numericId,
        created_by: user.id,
        music_enabled: music_enabled ?? false
      })
      .select()
      .single()
    
    if (communityError) {
      logger.error('Failed to create community', { error: communityError, userId: user.id })
      return NextResponse.json(
        { error: 'Failed to create community' },
        { status: 500 }
      )
    }
    
    const { error: memberError } = await supabaseAdmin
      .from('community_members')
      .insert({
        community_id: community.id,
        user_id: user.id,
        role: 'admin'
      })
    
    if (memberError) {
      logger.error('Failed to add creator as admin', { error: memberError, userId: user.id, communityId: community.id })
      return NextResponse.json(
        { error: 'Failed to add creator as admin' },
        { status: 500 }
      )
    }
    
    logger.info('Community created successfully', { communityId: community.id, userId: user.id })
    return NextResponse.json({
      success: true,
      community
    })

  } catch (error) {
    logger.error('Error creating community', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
