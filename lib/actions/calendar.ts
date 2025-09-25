'use server'

import { supabase } from '@/lib/db'
import { Show, CalendarExportResult } from '@/lib/types'
import { 
  generateGoogleCalendarUrl, 
  generateICSContent, 
  getCalendarEventData,
  validateCalendarData,
  generateICSFilename
} from '@/lib/calendar'

/**
 * Get show data by ID with validation
 */
async function getShowById(showId: string): Promise<Show | null> {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .eq('id', showId)
      .single()

    if (error) {
      console.error('Error fetching show:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getShowById:', error)
    return null
  }
}

/**
 * Generate Google Calendar URL for a show
 */
export async function generateGoogleCalendarUrlAction(showId: string, shareableUrl?: string, duration?: number): Promise<CalendarExportResult> {
  try {
    if (process.env['ENABLE_CALENDAR_EXPORT'] !== 'true') {
      return {
        success: false,
        error: 'Calendar export is not enabled'
      }
    }

    const show = await getShowById(showId)
    if (!show) {
      return {
        success: false,
        error: 'Show not found'
      }
    }

    const validation = validateCalendarData(show)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }

    const calendarUrl = generateGoogleCalendarUrl(show, shareableUrl, duration)
    
    return {
      success: true,
      calendarUrl
    }
  } catch (error) {
    console.error('Error generating Google Calendar URL:', error)
    return {
      success: false,
      error: 'Failed to generate calendar URL'
    }
  }
}

/**
 * Generate ICS file content for a show
 */
export async function generateICSFileAction(showId: string, shareableUrl?: string, duration?: number): Promise<CalendarExportResult> {
  try {
    if (process.env['ENABLE_CALENDAR_EXPORT'] !== 'true') {
      return {
        success: false,
        error: 'Calendar export is not enabled'
      }
    }

    const show = await getShowById(showId)
    if (!show) {
      return {
        success: false,
        error: 'Show not found'
      }
    }

    const validation = validateCalendarData(show)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }

    const icsContent = generateICSContent(show, shareableUrl, duration)
    const filename = generateICSFilename(show)
    
    return {
      success: true,
      icsContent,
      filename
    }
  } catch (error) {
    console.error('Error generating ICS file:', error)
    return {
      success: false,
      error: 'Failed to generate calendar file'
    }
  }
}

/**
 * Get calendar event data for a show
 */
export async function getCalendarEventDataAction(showId: string, shareableUrl?: string): Promise<CalendarExportResult> {
  try {
    const show = await getShowById(showId)
    if (!show) {
      return {
        success: false,
        error: 'Show not found'
      }
    }

    const validation = validateCalendarData(show)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }

    const eventData = getCalendarEventData(show, shareableUrl)
    
    return {
      success: true,
      calendarUrl: JSON.stringify(eventData)
    }
  } catch (error) {
    console.error('Error getting calendar event data:', error)
    return {
      success: false,
      error: 'Failed to get calendar event data'
    }
  }
}

/**
 * Validate calendar data for a show
 */
export async function validateCalendarDataAction(showId: string): Promise<CalendarExportResult> {
  try {
    const show = await getShowById(showId)
    if (!show) {
      return {
        success: false,
        error: 'Show not found'
      }
    }

    const validation = validateCalendarData(show)
    
    return {
      success: validation.isValid,
      error: validation.error
    }
  } catch (error) {
    console.error('Error validating calendar data:', error)
    return {
      success: false,
      error: 'Failed to validate calendar data'
    }
  }
}
