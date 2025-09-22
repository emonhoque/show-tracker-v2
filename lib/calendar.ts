import { format, addHours } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { Show, CalendarEvent } from './types'

const BOSTON_TZ = 'America/New_York'
const DEFAULT_DURATION_HOURS = 4

/**
 * Convert a date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'")
}

/**
 * Escape text for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

/**
 * Generate a Google Calendar URL for a show
 */
export function generateGoogleCalendarUrl(show: Show, shareableUrl?: string, duration?: number): string {
  try {
    const showDate = new Date(show.date_time)
    const bostonDate = toZonedTime(showDate, BOSTON_TZ)
    const durationHours = duration || DEFAULT_DURATION_HOURS
    const endDate = addHours(bostonDate, durationHours)
    
    // Convert to UTC for Google Calendar
    const utcStart = fromZonedTime(bostonDate, BOSTON_TZ)
    const utcEnd = fromZonedTime(endDate, BOSTON_TZ)
    
    const startStr = format(utcStart, "yyyyMMdd'T'HHmmss'Z'")
    const endStr = format(utcEnd, "yyyyMMdd'T'HHmmss'Z'")
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${show.title} @ ${show.venue}`,
      dates: `${startStr}/${endStr}`,
      location: `${show.venue}, ${show.city}`,
      details: buildEventDescription(show, shareableUrl)
    })
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  } catch (error) {
    console.error('Error generating Google Calendar URL:', error)
    throw new Error('Failed to generate calendar URL')
  }
}

/**
 * Generate ICS file content for a show
 */
export function generateICSContent(show: Show, shareableUrl?: string, duration?: number): string {
  try {
    const showDate = new Date(show.date_time)
    const bostonDate = toZonedTime(showDate, BOSTON_TZ)
    const durationHours = duration || DEFAULT_DURATION_HOURS
    const endDate = addHours(bostonDate, durationHours)
    
    // Convert to UTC for ICS
    const utcStart = fromZonedTime(bostonDate, BOSTON_TZ)
    const utcEnd = fromZonedTime(endDate, BOSTON_TZ)
    const created = new Date(show.created_at)
    const now = new Date()
    
    const uid = `show-${show.id}@showtracker.app`
    const summary = `${show.title} @ ${show.venue}`
    const location = `${show.venue}, ${show.city}`
    const description = buildEventDescription(show, shareableUrl)
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Show Tracker//Show Export//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${formatICSDate(utcStart)}`,
      `DTEND:${formatICSDate(utcEnd)}`,
      `SUMMARY:${escapeICSText(summary)}`,
      `LOCATION:${escapeICSText(location)}`,
      `DESCRIPTION:${escapeICSText(description)}`,
      `CREATED:${formatICSDate(created)}`,
      `DTSTAMP:${formatICSDate(now)}`,
      ...(shareableUrl ? [`URL:${shareableUrl}`] : []),
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')
    
    return icsContent
  } catch (error) {
    console.error('Error generating ICS content:', error)
    throw new Error('Failed to generate calendar file')
  }
}

/**
 * Build event description from show data
 */
function buildEventDescription(show: Show, shareableUrl?: string): string {
  const parts: string[] = []
  
  if (show.notes) {
    parts.push(show.notes)
  }
  
  // Add URLs if available
  const urls: string[] = []
  if (show.ticket_url) urls.push(`Tickets: ${show.ticket_url}`)
  if (show.spotify_url) urls.push(`Spotify: ${show.spotify_url}`)
  if (show.apple_music_url) urls.push(`Apple Music: ${show.apple_music_url}`)
  if (show.google_photos_url) urls.push(`Photos: ${show.google_photos_url}`)
  if (shareableUrl) urls.push(`Show Details: ${shareableUrl}`)
  
  if (urls.length > 0) {
    parts.push('\n' + urls.join('\n'))
  }
  
  return parts.join('\n') || 'Show details from Show Tracker'
}

/**
 * Get calendar event data for a show
 */
export function getCalendarEventData(show: Show, shareableUrl?: string, duration?: number): CalendarEvent {
  try {
    const showDate = new Date(show.date_time)
    const bostonDate = toZonedTime(showDate, BOSTON_TZ)
    const durationHours = duration || DEFAULT_DURATION_HOURS
    const endDate = addHours(bostonDate, durationHours)
    
    return {
      title: `${show.title} @ ${show.venue}`,
      start: bostonDate.toISOString(),
      end: endDate.toISOString(),
      location: `${show.venue}, ${show.city}`,
      description: buildEventDescription(show, shareableUrl),
      url: shareableUrl
    }
  } catch (error) {
    console.error('Error getting calendar event data:', error)
    throw new Error('Failed to process calendar event data')
  }
}

/**
 * Validate show data for calendar export
 */
export function validateCalendarData(show: Show): { isValid: boolean; error?: string } {
  if (!show.title || !show.venue || !show.city) {
    return { isValid: false, error: 'Show information incomplete' }
  }
  
  if (!show.date_time) {
    return { isValid: false, error: 'Show time information incomplete' }
  }
  
  try {
    const showDate = new Date(show.date_time)
    if (isNaN(showDate.getTime())) {
      return { isValid: false, error: 'Invalid show date format' }
    }
  } catch {
    return { isValid: false, error: 'Unable to process show date' }
  }
  
  return { isValid: true }
}

/**
 * Generate filename for ICS file
 */
export function generateICSFilename(show: Show): string {
  const showDate = new Date(show.date_time)
  const bostonDate = toZonedTime(showDate, BOSTON_TZ)
  const dateStr = format(bostonDate, 'yyyy-MM-dd')
  const titleSlug = show.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30)
  
  return `${dateStr}-${titleSlug}.ics`
}
