/**
 * Environment variable utilities with proper type safety
 */

// Environment variable getter with type safety
export function getEnvVar(key: string): string | undefined {
  return process.env[key]
}

// Required environment variable getter
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
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

// Common environment variables with type safety
export const env = {
  // Supabase
  SUPABASE_URL: getRequiredEnvVar('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  NEXT_PUBLIC_SUPABASE_URL: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  
  // App URLs
  NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000',
  NEXT_PUBLIC_SITE_URL: getEnvVar('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000',
  
  // Google OAuth
  GOOGLE_CLIENT_ID: getEnvVar('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: getEnvVar('GOOGLE_CLIENT_SECRET'),
  
  // Spotify
  SPOTIFY_CLIENT_ID: getEnvVar('SPOTIFY_CLIENT_ID'),
  SPOTIFY_CLIENT_SECRET: getEnvVar('SPOTIFY_CLIENT_SECRET'),
  
  // Discord
  DISCORD_BOT_API_URL: getEnvVar('DISCORD_BOT_API_URL'),
  
  // Blob storage
  BLOB_READ_WRITE_TOKEN: getEnvVar('BLOB_READ_WRITE_TOKEN'),
  
  // Cron
  CRON_SECRET: getEnvVar('CRON_SECRET'),
  
  // Feature flags
  ENABLE_CALENDAR_EXPORT: getBooleanEnvVar('ENABLE_CALENDAR_EXPORT'),
  ENABLE_GOOGLE_CALENDAR_LINKS: getBooleanEnvVar('ENABLE_GOOGLE_CALENDAR_LINKS'),
  ENABLE_ICS_DOWNLOAD: getBooleanEnvVar('ENABLE_ICS_DOWNLOAD'),
  ENABLE_SHAREABLE_URLS: getBooleanEnvVar('ENABLE_SHAREABLE_URLS'),
  ENABLE_NATIVE_SHARING: getBooleanEnvVar('ENABLE_NATIVE_SHARING'),
  REQUIRE_COMMUNITY_MEMBERSHIP: getBooleanEnvVar('REQUIRE_COMMUNITY_MEMBERSHIP'),
  PUBLIC_SHARE_ENABLED: getBooleanEnvVar('PUBLIC_SHARE_ENABLED'),
  
  // Other
  SHARE_URL_EXPIRATION_DAYS: getEnvVar('SHARE_URL_EXPIRATION_DAYS'),
} as const
