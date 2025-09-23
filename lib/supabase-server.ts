import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { clientEnv, serverEnv } from './env'

// Server-side Supabase client for server components and API routes
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  
  return createServerClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

// Server-side Supabase client with service role key
// This should only be used in server-side code (API routes, server actions)
export function createSupabaseAdmin() {
  return createServerClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll() { return [] },
      setAll() {},
    },
  })
}
