import { NextRequest, NextResponse } from 'next/server'
import { generateShareableUrl } from '@/lib/shareable-urls'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    logger.debug('Share API POST called')
    const { id: showId } = await params
    logger.debug('Show ID', { showId })

    if (!showId) {
      logger.warn('No show ID provided')
      return NextResponse.json(
        { success: false, error: 'Show ID is required' },
        { status: 400 }
      )
    }

    logger.debug('Calling generateShareableUrl')
    const result = await generateShareableUrl(showId)
    logger.debug('Generate result', { result })

    if (!result.success) {
      logger.warn('Generate failed', { error: result.error })
      return NextResponse.json(result, { status: 400 })
    }

    logger.info('Share URL generated successfully', { showId, shareableUrl: result.shareableUrl })
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error in share URL generation', { error })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
