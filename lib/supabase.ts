import { createBrowserClient } from '@supabase/ssr'

// Client-side Supabase client
export function createClient() {
  try {
    // Get environment variables directly from process.env
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
    const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables:', {
        url: supabaseUrl ? 'present' : 'missing',
        key: supabaseAnonKey ? 'present' : 'missing',
        allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_'))
      })
      throw new Error('Missing Supabase environment variables')
    }
    
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw error
  }
}

// Legacy export for backward compatibility - only create if env vars are available
export const supabase = (() => {
  try {
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
    const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    
    if (supabaseUrl && supabaseAnonKey) {
      return createClient()
    }
    return null
  } catch (error) {
    console.error('Failed to create legacy Supabase client:', error)
    return null
  }
})()