'use server'

import { createSupabaseAdmin } from '@/lib/supabase-server'
import { 
  CreateCommunityInput, 
  UpdateCommunityInput,
  InviteToCommunityInput,
  AcceptInviteInput,
  CommunityResponse,
  CommunitiesResponse,
  InviteResponse
} from '@/lib/types'
import { z } from 'zod'
import { randomBytes } from 'crypto'

// Validation schemas
const createCommunitySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional()
})

const updateCommunitySchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(200).optional()
})

const inviteToCommunitySchema = z.object({
  communityId: z.string().uuid(),
  email: z.string().email().optional()
})

const acceptInviteSchema = z.object({
  token: z.string().min(1)
})

// Helper function to generate secure invite token
function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

// Helper function to generate random numeric ID
function generateNumericId(): string {
  // Generate a random 8-digit number
  return Math.floor(10000000 + Math.random() * 90000000).toString()
}

// Helper function to check if user is authenticated
async function getCurrentUser() {
  const supabase = createSupabaseAdmin()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('User not authenticated')
  }
  
  return user
}

// Helper function to check if user is admin of community
async function isCommunityAdmin(userId: string, communityId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin()
  
  const { data, error } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()
  
  if (error || !data) {
    return false
  }
  
  return data.role === 'admin'
}

// Helper function to check if user is member of community
async function isCommunityMember(userId: string, communityId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin()
  
  const { data, error } = await supabase
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()
  
  return !error && !!data
}

// Create a new community
export async function createCommunity(input: CreateCommunityInput): Promise<CommunityResponse> {
  try {
    console.log('createCommunity called with input:', input)
    
    let user
    try {
      user = await getCurrentUser()
      console.log('getCurrentUser result:', user?.id)
    } catch (userError) {
      console.error('getCurrentUser failed:', userError)
      return {
        success: false,
        error: 'Authentication failed: ' + (userError instanceof Error ? userError.message : 'Unknown error')
      }
    }
    
    let validatedInput
    try {
      validatedInput = createCommunitySchema.parse(input)
      console.log('validation passed:', validatedInput)
    } catch (validationError) {
      console.error('validation failed:', validationError)
      return {
        success: false,
        error: 'Validation failed: ' + (validationError instanceof Error ? validationError.message : 'Unknown error')
      }
    }
    
    const supabase = createSupabaseAdmin()
    
    // Generate a unique numeric ID
    let numericId: string = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10
    
    while (!isUnique && attempts < maxAttempts) {
      numericId = generateNumericId()
      
      // Check if ID is already taken
      const { data: existingCommunity } = await supabase
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
      return {
        success: false,
        error: 'Failed to generate unique community ID. Please try again.'
      }
    }
    
    // Create community
    const { data: community, error } = await supabase
      .from('communities')
      .insert({
        name: validatedInput.name,
        description: validatedInput.description,
        numeric_id: numericId,
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) {
      return {
        success: false,
        error: 'Failed to create community'
      }
    }
    
    // Add creator as admin
    const { error: memberError } = await supabase
      .from('community_members')
      .insert({
        community_id: community.id,
        user_id: user.id,
        role: 'admin'
      })
    
    if (memberError) {
      return {
        success: false,
        error: 'Failed to add creator as admin'
      }
    }
    
    return {
      success: true,
      community
    }
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      return {
        success: false,
        error: _error.issues[0]?.message || 'Validation error'
      }
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Get user's communities
export async function getCommunities(): Promise<CommunitiesResponse> {
  try {
    const user = await getCurrentUser()
    const supabase = createSupabaseAdmin()
    
    const { data: communities, error } = await supabase
      .rpc('get_user_communities', { user_uuid: user.id })
    
    if (error) {
      return {
        success: false,
        error: 'Failed to fetch communities'
      }
    }
    
    return {
      success: true,
      communities: communities || []
    }
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Get current community (from localStorage or default)
export async function getCurrentCommunity(): Promise<CommunityResponse> {
  try {
    const user = await getCurrentUser()
    const supabase = createSupabaseAdmin()
    
    // Get user's communities
    const { data: communities, error } = await supabase
      .rpc('get_user_communities', { user_uuid: user.id })
    
    if (error || !communities || communities.length === 0) {
      return {
        success: false,
        error: 'No communities found'
      }
    }
    
    // Return the first community (or could be stored in localStorage)
    const community = communities[0]
    
    // Get full community details
    const { data: fullCommunity, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('id', community.community_id)
      .single()
    
    if (communityError) {
      return {
        success: false,
        error: 'Failed to fetch community details'
      }
    }
    
    return {
      success: true,
      community: fullCommunity
    }
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Update community
export async function updateCommunity(communityId: string, input: UpdateCommunityInput): Promise<CommunityResponse> {
  try {
    const user = await getCurrentUser()
    const validatedInput = updateCommunitySchema.parse(input)
    
    // Check if user is admin
    const isAdmin = await isCommunityAdmin(user.id, communityId)
    if (!isAdmin) {
      return {
        success: false,
        error: 'You do not have permission to update this community'
      }
    }
    
    const supabase = createSupabaseAdmin()
    
    const { data: community, error } = await supabase
      .from('communities')
      .update(validatedInput)
      .eq('id', communityId)
      .select()
      .single()
    
    if (error) {
      return {
        success: false,
        error: 'Failed to update community'
      }
    }
    
    return {
      success: true,
      community
    }
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      return {
        success: false,
        error: _error.issues[0]?.message || 'Validation error'
      }
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Create invite to community
export async function inviteToCommunity(input: InviteToCommunityInput): Promise<InviteResponse> {
  try {
    const user = await getCurrentUser()
    const validatedInput = inviteToCommunitySchema.parse(input)
    
    // Check if user is admin
    const isAdmin = await isCommunityAdmin(user.id, validatedInput.communityId)
    if (!isAdmin) {
      return {
        success: false,
        error: 'You do not have permission to invite users to this community'
      }
    }
    
    const supabase = createSupabaseAdmin()
    
    // Generate invite token
    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now
    
    // Create invite
    const { error } = await supabase
      .from('community_invites')
      .insert({
        community_id: validatedInput.communityId,
        created_by: user.id,
        email: validatedInput.email,
        token,
        expires_at: expiresAt.toISOString(),
        max_uses: 1
      })
      .select()
      .single()
    
    if (error) {
      return {
        success: false,
        error: 'Failed to create invite'
      }
    }
    
    // Generate invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${token}`
    
    return {
      success: true,
      inviteUrl,
      expiresAt: expiresAt.toISOString()
    }
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      return {
        success: false,
        error: _error.issues[0]?.message || 'Validation error'
      }
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Accept invite
export async function acceptInvite(input: AcceptInviteInput): Promise<CommunityResponse> {
  try {
    const user = await getCurrentUser()
    const validatedInput = acceptInviteSchema.parse(input)
    
    const supabase = createSupabaseAdmin()
    
    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from('community_invites')
      .select('*')
      .eq('token', validatedInput.token)
      .single()
    
    if (inviteError || !invite) {
      return {
        success: false,
        error: 'Invalid or expired invite'
      }
    }
    
    // Check if invite is expired
    if (new Date(invite.expires_at) < new Date()) {
      return {
        success: false,
        error: 'Invite has expired'
      }
    }
    
    // Check if invite has reached max uses
    if (invite.current_uses >= invite.max_uses) {
      return {
        success: false,
        error: 'Invite has reached maximum uses'
      }
    }
    
    // Check if user is already a member
    const isMember = await isCommunityMember(user.id, invite.community_id)
    if (isMember) {
      return {
        success: false,
        error: 'You are already a member of this community'
      }
    }
    
    // Add user to community
    const { error: memberError } = await supabase
      .from('community_members')
      .insert({
        community_id: invite.community_id,
        user_id: user.id,
        role: 'member',
        invited_by: invite.created_by
      })
    
    if (memberError) {
      return {
        success: false,
        error: 'Failed to join community'
      }
    }
    
    // Update invite usage count
    await supabase
      .from('community_invites')
      .update({ current_uses: invite.current_uses + 1 })
      .eq('id', invite.id)
    
    // Get community details
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('id', invite.community_id)
      .single()
    
    if (communityError) {
      return {
        success: false,
        error: 'Failed to fetch community details'
      }
    }
    
    return {
      success: true,
      community
    }
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      return {
        success: false,
        error: _error.issues[0]?.message || 'Validation error'
      }
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Remove member from community
export async function removeMember(communityId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    
    // Check if user is admin or removing themselves
    const isAdmin = await isCommunityAdmin(user.id, communityId)
    const isSelf = user.id === userId
    
    if (!isAdmin && !isSelf) {
      return {
        success: false,
        error: 'You do not have permission to remove this member'
      }
    }
    
    const supabase = createSupabaseAdmin()
    
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId)
    
    if (error) {
      return {
        success: false,
        error: 'Failed to remove member'
      }
    }
    
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Leave community
export async function leaveCommunity(communityId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    
    const supabase = createSupabaseAdmin()
    
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', user.id)
    
    if (error) {
      return {
        success: false,
        error: 'Failed to leave community'
      }
    }
    
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Get community members
export async function getCommunityMembers(communityId: string): Promise<{ success: boolean; members?: { id: string; name: string; email: string; role: string; user_id: string; profiles: { id: string; name: string; email: string; avatar_url: string } }[]; error?: string }> {
  try {
    const user = await getCurrentUser()
    
    // Check if user is member of community
    const isMember = await isCommunityMember(user.id, communityId)
    if (!isMember) {
      return {
        success: false,
        error: 'You are not a member of this community'
      }
    }
    
    const supabase = createSupabaseAdmin()
    
    const { data: members, error } = await supabase
      .from('community_members')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('community_id', communityId)
      .order('joined_at', { ascending: true })
    
    if (error) {
      return {
        success: false,
        error: 'Failed to fetch community members'
      }
    }
    
    return {
      success: true,
      members: members || []
    }
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}
