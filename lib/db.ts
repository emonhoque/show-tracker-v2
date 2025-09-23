import { createClient } from '@supabase/supabase-js'
import { env } from './env'

// Create Supabase client with service role key for server-side operations
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
