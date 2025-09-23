import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createSupabaseAdmin } from '@/lib/supabase-server'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user from the request
    const supabaseClient = await createServerSupabaseClient()
    const authHeader = request.headers.get('authorization')
    
    let user
    if (authHeader) {
      // If we have an auth header, use it
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
      // Try to get user from cookies/session
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
      // Get user's first community (current/default)
      console.log('Fetching current community for user:', user.id)
      
      // Get user's communities using direct query (using admin client to bypass RLS)
      const { data: communities, error } = await supabase
        .from('community_members')
        .select(`
          community_id,
          role,
          communities!inner(
            id,
            name,
            description,
            numeric_id,
            created_at,
            music_enabled
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1)
      
      if (error) {
        console.error('Failed to fetch current community:', error)
        return NextResponse.json(
          { error: 'Failed to fetch current community' },
          { status: 500 }
        )
      }
      
      if (!communities || communities.length === 0) {
        return NextResponse.json(
          { error: 'No communities found' },
          { status: 404 }
        )
      }
      
      // Return the first community
      const member = communities[0] as {
        community_id: string
        role: string
        communities: {
          id: string
          name: string
          description: string | null
          numeric_id: string
          created_at: string
          music_enabled: boolean
        }[]
      }
      const community = {
        id: member.communities[0].id,
        name: member.communities[0].name,
        description: member.communities[0].description,
        numeric_id: member.communities[0].numeric_id,
        created_at: member.communities[0].created_at
      }
      
      return NextResponse.json({
        success: true,
        community
      })
    } else if (communityId) {
      // Get specific community
      console.log('Fetching specific community:', communityId, 'for user:', user.id)
      
      // Get user's communities first to verify access (using admin client to bypass RLS)
      const { data: userCommunities, error: communitiesError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
      
      if (communitiesError) {
        console.error('Failed to fetch user communities:', communitiesError)
        return NextResponse.json(
          { error: 'Failed to verify community access' },
          { status: 500 }
        )
      }
      
      // Check if user has access to this community
      const hasAccess = userCommunities?.some((c: { community_id: string }) => c.community_id === communityId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this community' },
          { status: 403 }
        )
      }
      
      // Get full community details
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single()
      
      if (communityError) {
        console.error('Failed to fetch community details:', communityError)
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
      // Get all user's communities
      console.log('Fetching communities for user:', user.id)

      // Get user's communities using direct query (using admin client to bypass RLS)
      const { data: communities, error } = await supabase
        .from('community_members')
        .select(`
          community_id,
          role,
          communities!inner(
            id,
            name,
            numeric_id,
            created_at,
            music_enabled
          )
        `)
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Failed to fetch communities:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return NextResponse.json(
          { error: 'Failed to fetch communities', details: error.message },
          { status: 500 }
        )
      }
      
      // Transform the data to match the expected format and calculate member counts
      const transformedCommunities = await Promise.all(
        (communities || []).map(async (member: {
          community_id: string
          role: string
          communities: {
            id: string
            name: string
            numeric_id: string
            created_at: string
            music_enabled: boolean
          }[]
        }) => {
          // Get actual member count for this community
          const { count: memberCount } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', member.community_id)
          
          return {
            community_id: member.community_id,
            community_name: member.communities[0].name,
            community_numeric_id: member.communities[0].numeric_id,
            user_role: member.role,
            member_count: memberCount || 0
          }
        })
      )

      return NextResponse.json({
        success: true,
        communities: transformedCommunities
      })
    }

  } catch (error) {
    console.error('Error fetching communities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('API received body:', body)
    const { name, description, music_enabled } = body

    if (!name || !name.trim()) {
      console.log('Validation failed: name is required')
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Get the authenticated user from the request
    const supabaseClient = await createServerSupabaseClient()
    const authHeader = request.headers.get('authorization')
    
    let user
    if (authHeader) {
      // If we have an auth header, use it
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
      // Try to get user from cookies/session
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      user = authUser
    }

    console.log('Authenticated user:', user.id)

    // Create community directly in the API route
    const supabaseAdmin = createSupabaseAdmin()
    
    // Generate a unique numeric ID
    let numericId: string = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10
    
    while (!isUnique && attempts < maxAttempts) {
      numericId = Math.floor(10000000 + Math.random() * 90000000).toString()
      
      // Check if ID is already taken
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
    
    // Create community
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
      console.error('Failed to create community:', communityError)
      return NextResponse.json(
        { error: 'Failed to create community' },
        { status: 500 }
      )
    }
    
    // Add creator as admin
    const { error: memberError } = await supabaseAdmin
      .from('community_members')
      .insert({
        community_id: community.id,
        user_id: user.id,
        role: 'admin'
      })
    
    if (memberError) {
      console.error('Failed to add creator as admin:', memberError)
      return NextResponse.json(
        { error: 'Failed to add creator as admin' },
        { status: 500 }
      )
    }
    
    console.log('Community created successfully:', community.id)
    return NextResponse.json({
      success: true,
      community
    })

  } catch (error) {
    console.error('Error creating community:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
