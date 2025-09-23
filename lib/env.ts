/**
 * Environment variable utilities with proper type safety
 */

// Environment variable getter with type safety
export function getEnvVar(key: string): string | undefined {
  // Always use process.env directly - Next.js handles the client-side injection
  return process.env[key]
}

// Required environment variable getter
export function getRequiredEnvVar(key: string): string {
  const value = getEnvVar(key)
  if (!value || value.trim() === '') {
    console.error(`Environment variable ${key} not found or empty. Available env vars:`, {
      NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'] ? 'present' : 'missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ? 'present' : 'missing',
      allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')),
      actualValues: {
        NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
      }
    })
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}

// Boolean environment variable getter
export function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key]
  if (!value) return defaultValue
  return value.toLowerCase() === 'true'
}

// Client-side environment variables (safe to use in browser)
export const clientEnv = {
  // Supabase (public) - lazy getters
  get NEXT_PUBLIC_SUPABASE_URL() {
    return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  
  // App URLs - lazy getters
  get NEXT_PUBLIC_APP_URL() {
    return getEnvVar('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'
  },
  get NEXT_PUBLIC_SITE_URL() {
    return getEnvVar('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000'
  },
} as const

// Server-side environment variables (only for server-side code)
export const serverEnv = {
  // Supabase (server-only) - lazy getters
  get SUPABASE_URL() {
    return getRequiredEnvVar('SUPABASE_URL')
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY')
  },
  
  // Google OAuth - lazy getters
  get GOOGLE_CLIENT_ID() {
    return getEnvVar('GOOGLE_CLIENT_ID')
  },
  get GOOGLE_CLIENT_SECRET() {
    return getEnvVar('GOOGLE_CLIENT_SECRET')
  },
  
  // Spotify - lazy getters
  get SPOTIFY_CLIENT_ID() {
    return getEnvVar('SPOTIFY_CLIENT_ID')
  },
  get SPOTIFY_CLIENT_SECRET() {
    return getEnvVar('SPOTIFY_CLIENT_SECRET')
  },
  
  // Discord - lazy getter
  get DISCORD_BOT_API_URL() {
    return getEnvVar('DISCORD_BOT_API_URL')
  },
  
  // Blob storage - lazy getter
  get BLOB_READ_WRITE_TOKEN() {
    return getEnvVar('BLOB_READ_WRITE_TOKEN')
  },
  
  // Cron - lazy getter
  get CRON_SECRET() {
    return getEnvVar('CRON_SECRET')
  },
  
  // Feature flags - lazy getters
  get ENABLE_CALENDAR_EXPORT() {
    return getBooleanEnvVar('ENABLE_CALENDAR_EXPORT')
  },
  get ENABLE_GOOGLE_CALENDAR_LINKS() {
    return getBooleanEnvVar('ENABLE_GOOGLE_CALENDAR_LINKS')
  },
  get ENABLE_ICS_DOWNLOAD() {
    return getBooleanEnvVar('ENABLE_ICS_DOWNLOAD')
  },
  get ENABLE_SHAREABLE_URLS() {
    return getBooleanEnvVar('ENABLE_SHAREABLE_URLS')
  },
  get ENABLE_NATIVE_SHARING() {
    return getBooleanEnvVar('ENABLE_NATIVE_SHARING')
  },
  get REQUIRE_COMMUNITY_MEMBERSHIP() {
    return getBooleanEnvVar('REQUIRE_COMMUNITY_MEMBERSHIP')
  },
  get PUBLIC_SHARE_ENABLED() {
    return getBooleanEnvVar('PUBLIC_SHARE_ENABLED')
  },
  
  // Other - lazy getter
  get SHARE_URL_EXPIRATION_DAYS() {
    return getEnvVar('SHARE_URL_EXPIRATION_DAYS')
  },
} as const

// Legacy export for backward compatibility (server-side only)
// Only export serverEnv for server-side usage
export const env = serverEnv
