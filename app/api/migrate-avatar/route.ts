import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Get current user for authentication
    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ 
        error: 'Failed to fetch profile' 
      }, { status: 500 })
    }

    // Check if we already have a blob-stored avatar
    if (profile?.avatar_url && profile.avatar_url.includes('blob.vercel-storage.com')) {
      return NextResponse.json({ 
        message: 'Avatar already migrated',
        url: profile.avatar_url
      })
    }

    // Get Google avatar URL from user metadata
    const googleAvatarUrl = user.user_metadata?.['avatar_url']
    if (!googleAvatarUrl) {
      return NextResponse.json({ 
        error: 'No Google avatar found to migrate' 
      }, { status: 400 })
    }

    // Fetch the Google avatar image
    const response = await fetch(googleAvatarUrl)
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch Google avatar' 
      }, { status: 400 })
    }

    const imageBuffer = await response.arrayBuffer()
    const imageBlob = new Blob([imageBuffer], { type: response.headers.get('content-type') || 'image/jpeg' })

    // Generate unique filename for user avatar
    const timestamp = Date.now()
    const filename = `avatars/${user.id}-${timestamp}.jpg`

    // Upload to Vercel Blob
    const blob = await put(filename, imageBlob, {
      access: 'public',
      token: process.env['BLOB_READ_WRITE_TOKEN'],
    })

    // Update user profile with new avatar URL
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        avatar_url: blob.url,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile with migrated avatar:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update profile with migrated avatar' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      url: blob.url,
      filename: filename,
      message: 'Avatar successfully migrated to blob storage'
    })

  } catch (error) {
    console.error('Error migrating avatar:', error)
    return NextResponse.json({ 
      error: 'Failed to migrate avatar' 
    }, { status: 500 })
  }
}
