import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { clientEnv, serverEnv } from './env'

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
        }
      },
    },
  })
}

export function createSupabaseAdmin() {
  return createServerClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll() { return [] },
      setAll() {},
    },
  })
}
