import { createClient } from './supabase'

// Sign in with Google
export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const callbackUrl = `${siteUrl}/auth/callback`
    
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      }
    })

    if (error) {
      return { error: error.message }
    }

    return {}
  } catch (error) {
    console.error('Google sign-in error:', error)
    return { error: 'Failed to initiate Google sign-in' }
  }
}

