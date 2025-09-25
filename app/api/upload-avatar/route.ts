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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
      }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 })
    }

    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const filename = `avatars/${user.id}-${timestamp}.${fileExtension}`

    const blob = await put(filename, file, {
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
      console.error('Error updating profile with new avatar:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update profile with new avatar' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      url: blob.url,
      filename: filename 
    })

  } catch (error) {
    console.error('Error uploading avatar:', error)
    return NextResponse.json({ 
      error: 'Failed to upload avatar' 
    }, { status: 500 })
  }
}
