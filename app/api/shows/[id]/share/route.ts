import { NextRequest, NextResponse } from 'next/server'
import { generateShareableUrl } from '@/lib/shareable-urls'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== SHARE API POST CALLED ===')
    const { id: showId } = await params
    console.log('Show ID:', showId)

    if (!showId) {
      console.log('No show ID provided')
      return NextResponse.json(
        { success: false, error: 'Show ID is required' },
        { status: 400 }
      )
    }

    console.log('Calling generateShareableUrl...')
    const result = await generateShareableUrl(showId)
    console.log('Generate result:', result)

    if (!result.success) {
      console.log('Generate failed:', result.error)
      return NextResponse.json(result, { status: 400 })
    }

    console.log('Share URL generated successfully:', result.shareableUrl)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in share URL generation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
