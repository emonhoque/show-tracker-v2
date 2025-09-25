
export interface ValidationResult {
  isValid: boolean
  error?: string
  sanitizedValue?: string
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

export function validateTitle(title: string): ValidationResult {
  const sanitized = sanitizeText(title)
  
  if (!sanitized) {
    return { isValid: false, error: 'Title is required' }
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Title must be 100 characters or less' }
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Title must be at least 2 characters' }
  }
  
  return { isValid: true, sanitizedValue: sanitized }
}

export function validateVenue(venue: string): ValidationResult {
  const sanitized = sanitizeText(venue)
  
  if (!sanitized) {
    return { isValid: false, error: 'Venue is required' }
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Venue must be 100 characters or less' }
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Venue must be at least 2 characters' }
  }
  
  return { isValid: true, sanitizedValue: sanitized }
}

export function validateCity(city: string): ValidationResult {
  const sanitized = sanitizeText(city)
  
  if (!sanitized) {
    return { isValid: false, error: 'City is required' }
  }
  
  if (sanitized.length > 50) {
    return { isValid: false, error: 'City must be 50 characters or less' }
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'City must be at least 2 characters' }
  }
  
  if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
    return { isValid: false, error: 'City can only contain letters, spaces, hyphens, and apostrophes' }
  }
  
  return { isValid: true, sanitizedValue: sanitized }
}

export function validateUrl(url: string): ValidationResult {
  if (!url) {
    return { isValid: true, sanitizedValue: '' }
  }
  
  const sanitized = sanitizeText(url)
  
  if (sanitized.length > 500) {
    return { isValid: false, error: 'URL must be 500 characters or less' }
  }
  
  try {
    const urlObj = new URL(sanitized)
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return { isValid: false, error: 'URL must use http or https protocol' }
    }
    return { isValid: true, sanitizedValue: sanitized }
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' }
  }
}

export function validateNotes(notes: string): ValidationResult {
  if (!notes) {
    return { isValid: true, sanitizedValue: '' }
  }
  
  const sanitized = sanitizeText(notes)
  
  if (sanitized.length > 500) {
    return { isValid: false, error: 'Notes must be 500 characters or less' }
  }
  
  return { isValid: true, sanitizedValue: sanitized }
}

export function validateUserName(name: string): ValidationResult {
  const sanitized = sanitizeText(name)
  
  if (!sanitized) {
    return { isValid: false, error: 'Full name is required' }
  }
  
  if (sanitized.length > 50) {
    return { isValid: false, error: 'Full name must be 50 characters or less' }
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters' }
  }
  
  if (!/^[a-zA-Z0-9\s\-']+$/.test(sanitized)) {
    return { isValid: false, error: 'Full name can only contain letters, numbers, spaces, hyphens, and apostrophes' }
  }
  
  return { isValid: true, sanitizedValue: sanitized }
}

export function validateDate(date: string): ValidationResult {
  if (!date) {
    return { isValid: false, error: 'Date is required' }
  }
  
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' }
  }
  
  
  const twoYearsFromNow = new Date()
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2)
  
  if (dateObj > twoYearsFromNow) {
    return { isValid: false, error: 'Date cannot be more than 2 years in the future' }
  }
  
  return { isValid: true, sanitizedValue: date }
}

export function validateTime(time: string): ValidationResult {
  if (!time) {
    return { isValid: false, error: 'Time is required' }
  }
  
  if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return { isValid: false, error: 'Please enter a valid time in HH:MM format' }
  }
  
  return { isValid: true, sanitizedValue: time }
}

export function validateRsvpStatus(status: string): ValidationResult {
  const validStatuses = ['going', 'maybe', 'not_going']
  
  if (!validStatuses.includes(status)) {
    return { isValid: false, error: 'Invalid RSVP status' }
  }
  
  return { isValid: true, sanitizedValue: status }
}

export function normalizeNameForStorage(name: string): string {
  return sanitizeText(name).toLowerCase()
}

export function formatNameForDisplay(normalizedName: string): string {
  if (!normalizedName || typeof normalizedName !== 'string') {
    return ''
  }
  
  return normalizedName
    .split(' ')
    .map(word => {
      if (!word) return word
      
      const prefixes = ['mc']
      
      const lowerWord = word.toLowerCase()
      for (const prefix of prefixes) {
        if (lowerWord.startsWith(prefix) && word.length > prefix.length) {
          return prefix.charAt(0).toUpperCase() + prefix.slice(1) + 
                 word.charAt(prefix.length).toUpperCase() + word.slice(prefix.length + 1)
        }
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
