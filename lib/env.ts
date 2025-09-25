/**
 * Environment variable utilities with proper type safety
 */

export function getEnvVar(key: string): string | undefined {
  return process.env[key]
}

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

export function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key]
  if (!value) return defaultValue
  return value.toLowerCase() === 'true'
}

export const clientEnv = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  
  get NEXT_PUBLIC_APP_URL() {
    return getEnvVar('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'
  },
  get NEXT_PUBLIC_SITE_URL() {
    return getEnvVar('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000'
  },
} as const

export const serverEnv = {
  get SUPABASE_URL() {
    return getRequiredEnvVar('SUPABASE_URL')
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY')
  },
  
  get GOOGLE_CLIENT_ID() {
    return getEnvVar('GOOGLE_CLIENT_ID')
  },
  get GOOGLE_CLIENT_SECRET() {
    return getEnvVar('GOOGLE_CLIENT_SECRET')
  },
  
  get SPOTIFY_CLIENT_ID() {
    return getEnvVar('SPOTIFY_CLIENT_ID')
  },
  get SPOTIFY_CLIENT_SECRET() {
    return getEnvVar('SPOTIFY_CLIENT_SECRET')
  },
  
  get DISCORD_BOT_API_URL() {
    return getEnvVar('DISCORD_BOT_API_URL')
  },
  
  get BLOB_READ_WRITE_TOKEN() {
    return getEnvVar('BLOB_READ_WRITE_TOKEN')
  },
  
  get CRON_SECRET() {
    return getEnvVar('CRON_SECRET')
  },
  
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
  
  get SHARE_URL_EXPIRATION_DAYS() {
    return getEnvVar('SHARE_URL_EXPIRATION_DAYS')
  },
  
  get NEXT_PUBLIC_APP_URL() {
    return getEnvVar('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
} as const

export const env = serverEnv
