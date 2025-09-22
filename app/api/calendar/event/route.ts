import { NextRequest, NextResponse } from 'next/server'
import { getCalendarEventDataAction } from '@/lib/actions/calendar'

export async function POST(request: NextRequest) {
  try {
    const { showId, shareableUrl } = await request.json()

    if (!showId) {
      return NextResponse.json(
        { error: 'Show ID is required' },
        { status: 400 }
      )
    }

    const result = await getCalendarEventDataAction(showId, shareableUrl)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Parse the event data from the calendarUrl field
    const eventData = JSON.parse(result.calendarUrl || '{}')
    
    return NextResponse.json({
      success: true,
      eventData
    })
  } catch (error) {
    console.error('Calendar event API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
