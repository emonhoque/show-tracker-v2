import { NextRequest, NextResponse } from 'next/server'
import { generateGoogleCalendarUrlAction } from '@/lib/actions/calendar'

export async function POST(request: NextRequest) {
  try {
    const { showId, shareableUrl, duration } = await request.json()

    if (!showId) {
      return NextResponse.json(
        { error: 'Show ID is required' },
        { status: 400 }
      )
    }

    const result = await generateGoogleCalendarUrlAction(showId, shareableUrl, duration)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      calendarUrl: result.calendarUrl
    })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
