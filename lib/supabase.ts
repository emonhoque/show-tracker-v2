import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  })
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client
export function createClient() {
  try {
    return createBrowserClient(supabaseUrl!, supabaseAnonKey!)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw error
  }
}

// Legacy export for backward compatibility
export const supabase = createClient()