import { createBrowserClient } from '@supabase/ssr'
import { env } from './env'

// Client-side Supabase client
export function createClient() {
  try {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables:', {
        url: env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
        key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing'
      })
      throw new Error('Missing Supabase environment variables')
    }
    
    return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw error
  }
}

// Legacy export for backward compatibility - only create if env vars are available
export const supabase = (() => {
  try {
    if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return createClient()
    }
    return null
  } catch (error) {
    console.error('Failed to create legacy Supabase client:', error)
    return null
  }
})()