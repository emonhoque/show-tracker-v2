import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
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

    const maxSize = 10 * 1024 * 1024  
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 })
    }

    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const filename = `posters/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`

    const blob = await put(filename, file, {
      access: 'public',
      token: process.env['BLOB_READ_WRITE_TOKEN'],
    })

    return NextResponse.json({ 
      url: blob.url,
      filename: filename 
    })

  } catch (error) {
    console.error('Error uploading poster:', error)
    return NextResponse.json({ 
      error: 'Failed to upload poster' 
    }, { status: 500 })
  }
}
