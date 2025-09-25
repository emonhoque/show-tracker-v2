import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const returnUrl = searchParams.get('returnUrl')

  if (error) {
    const errorUrl = returnUrl 
      ? `${origin}/signin?error=${encodeURIComponent(error)}&returnUrl=${encodeURIComponent(returnUrl)}`
      : `${origin}/signin?error=${encodeURIComponent(error)}`
    return NextResponse.redirect(errorUrl)
  }

  if (code) {
    let redirectTo: string
    if (returnUrl) {
      if (returnUrl.startsWith('http')) {
        redirectTo = returnUrl
      } else {
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

  return NextResponse.redirect(`${origin}/signin`)
}
