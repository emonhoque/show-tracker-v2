import { NextRequest, NextResponse } from 'next/server'
import { getShowByPublicId, updateShareTracking } from '@/lib/shareable-urls'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params
    const { searchParams } = new URL(request.url)
    const communitySlug = searchParams.get('community')

    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'Public ID is required' },
        { status: 400 }
      )
    }

    const result = await getShowByPublicId(publicId, communitySlug || undefined)

    if (!result.success) {
      return NextResponse.json(result, { status: 404 })
    }

    await updateShareTracking(publicId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in show resolution:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
