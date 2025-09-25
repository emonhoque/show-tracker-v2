import { format } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const BOSTON_TZ = 'America/New_York'

/**
 * Convert a UTC timestamp to Boston time and format it
 */
export function formatBostonTime(utcDate: string | Date): string {
  try {
    const date = new Date(utcDate)
    const bostonDate = toZonedTime(date, BOSTON_TZ)
    const currentYear = new Date().getFullYear()
    const showYear = bostonDate.getFullYear()
    
    const formatString = showYear !== currentYear 
      ? 'EEE MMM d, yyyy, h:mm a'
      : 'EEE MMM d, h:mm a'
    
    return format(bostonDate, formatString)
  } catch (error) {
    console.error('Error formatting Boston time:', error)
    return 'Invalid date'
  }
}

/**
 * Format time as entered by user with "(local time)" suffix
 */
export function formatUserTime(utcDate: string | Date, userTimeInput: string): string {
  try {
    const date = new Date(utcDate)
    const bostonDate = toZonedTime(date, BOSTON_TZ)
    const currentYear = new Date().getFullYear()
    const showYear = bostonDate.getFullYear()
    
    const dayOfWeek = showYear !== currentYear 
      ? format(bostonDate, 'EEE MMM d, yyyy')
      : format(bostonDate, 'EEE MMM d')
    
    if (!userTimeInput || typeof userTimeInput !== 'string') {
      return dayOfWeek
    }
    
    const [hours, minutes] = userTimeInput.split(':')
    const hour = parseInt(hours || '0', 10)
    const minute = parseInt(minutes || '0', 10)
    
    if (isNaN(hour) || isNaN(minute)) {
      return dayOfWeek
    }
    
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayMinute = minute.toString().padStart(2, '0')
    
    return `${dayOfWeek}, ${displayHour}:${displayMinute} ${ampm} (Local)`
  } catch (error) {
    console.error('Error formatting user time:', error)
    return 'Invalid date'
  }
}

/**
 * Get the current time in Boston as a UTC timestamp
 */
export function getBostonNow(): Date {
  return new Date()
}

/**
 * Convert Boston local date and time strings to UTC timestamp
 */
export function bostonToUTC(dateLocal: string, timeLocal: string): Date {
  const dateTimeString = `${dateLocal}T${timeLocal}`
  const bostonDate = new Date(dateTimeString)
  return fromZonedTime(bostonDate, BOSTON_TZ)
}

/**
 * Check if a show is in the past based on Boston time
 */
export function isShowPast(showDateTime: string | Date): boolean {
  const showDate = new Date(showDateTime)
  const nowInBoston = toZonedTime(new Date(), BOSTON_TZ)
  const showInBoston = toZonedTime(showDate, BOSTON_TZ)
  return showInBoston < nowInBoston
}
