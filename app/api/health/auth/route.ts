import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    const authHealth: {
      status: string;
      timestamp: string;
      googleAuth: { enabled: boolean; configured: boolean };
      supabaseAuth: { enabled: boolean; configured: boolean; connected?: boolean; userCount?: number; error?: string };
      passwordAuth: { enabled: boolean; configured: boolean };
      database?: { status?: string; error?: string };
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      googleAuth: {
        enabled: true, // Always enabled now
        configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      },
      supabaseAuth: {
        enabled: true, // Always enabled now
        configured: !!(process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      },
      passwordAuth: {
        enabled: false, // Removed
        configured: false
      }
    }

    // Test Supabase Auth connection
    if (authHealth.supabaseAuth.enabled) {
      try {
        const supabaseAdmin = createSupabaseAdmin()
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1
        })
        
        if (error) {
          authHealth.status = 'unhealthy'
          authHealth.supabaseAuth.error = error.message
        } else {
          authHealth.supabaseAuth.connected = true
          authHealth.supabaseAuth.userCount = data?.users?.length || 0
        }
      } catch {
        authHealth.status = 'unhealthy'
        authHealth.supabaseAuth.error = 'Connection failed'
      }
    }

    // Check if profiles table exists and is accessible
    try {
      const supabaseAdmin = createSupabaseAdmin()
      const { error } = await supabaseAdmin
        .from('profiles')
        .select('count')
        .limit(1)
      
      if (error) {
        authHealth.status = 'unhealthy'
        authHealth.database = { error: error.message }
      } else {
        authHealth.database = { status: 'connected' }
      }
    } catch {
      authHealth.status = 'unhealthy'
      authHealth.database = { error: 'Profiles table not accessible' }
    }

    return NextResponse.json(authHealth, {
      status: authHealth.status === 'healthy' ? 200 : 503
    })
  } catch {
    console.error('Auth health check error')
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Auth health check failed'
    }, { status: 503 })
  }
}
