import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const returnUrl = searchParams.get('returnUrl')

  // Handle OAuth errors
  if (error) {
    const errorUrl = returnUrl 
      ? `${origin}/signin?error=${encodeURIComponent(error)}&returnUrl=${encodeURIComponent(returnUrl)}`
      : `${origin}/signin?error=${encodeURIComponent(error)}`
    return NextResponse.redirect(errorUrl)
  }

  if (code) {
    // Redirect to return URL if provided, otherwise go home
    let redirectTo: string
    if (returnUrl) {
      // If returnUrl is already a full URL, use it directly
      if (returnUrl.startsWith('http')) {
        redirectTo = returnUrl
      } else {
        // If it's a relative path, prepend the origin
        redirectTo = `${origin}${returnUrl}`
      }
    } else {
      redirectTo = `${origin}/`
    }
    const response = NextResponse.redirect(redirectTo)

    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      const errorUrl = returnUrl 
        ? `${origin}/signin?error=${encodeURIComponent(exchangeError.message)}&returnUrl=${encodeURIComponent(returnUrl)}`
        : `${origin}/signin?error=${encodeURIComponent(exchangeError.message)}`
      return NextResponse.redirect(errorUrl)
    }

    return response
  }

  // No code provided, redirect to sign in
  return NextResponse.redirect(`${origin}/signin`)
}
