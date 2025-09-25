import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

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

    if (profile?.avatar_url && profile.avatar_url.includes('blob.vercel-storage.com')) {
      return NextResponse.json({ 
        message: 'Avatar already migrated',
        url: profile.avatar_url
      })
    }

    const googleAvatarUrl = user.user_metadata?.['avatar_url']
    if (!googleAvatarUrl) {
      return NextResponse.json({ 
        error: 'No Google avatar found to migrate' 
      }, { status: 400 })
    }

    const response = await fetch(googleAvatarUrl)
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch Google avatar' 
      }, { status: 400 })
    }

    const imageBuffer = await response.arrayBuffer()
    const imageBlob = new Blob([imageBuffer], { type: response.headers.get('content-type') || 'image/jpeg' })

    const timestamp = Date.now()
    const filename = `avatars/${user.id}-${timestamp}.jpg`

    const blob = await put(filename, imageBlob, {
      access: 'public',
      token: process.env['BLOB_READ_WRITE_TOKEN'],
    })

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
