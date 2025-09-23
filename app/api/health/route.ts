import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import { env } from '@/lib/env'

export async function GET() {
  try {
    const health: {
      status: string;
      timestamp: string;
      features: {
        googleAuth: boolean;
        supabaseAuth: boolean;
        passwordAuth: boolean;
        calendarExport: boolean;
        googleCalendarLinks: boolean;
        icsDownload: boolean;
        shareableUrls: boolean;
        nativeSharing: boolean;
        communityMembershipRequired: boolean;
        publicShareEnabled: boolean;
      };
      environment: {
        nodeEnv: string | undefined;
        supabaseUrl: boolean;
        supabaseAnonKey: boolean;
        googleClientId: boolean;
      };
      database?: { status: string; error?: string };
      statistics?: { [key: string]: string | number };
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: {
        googleAuth: true, // Always enabled now
        supabaseAuth: true, // Always enabled now
        passwordAuth: false, // Removed
        calendarExport: env.ENABLE_CALENDAR_EXPORT,
        googleCalendarLinks: env.ENABLE_GOOGLE_CALENDAR_LINKS,
        icsDownload: env.ENABLE_ICS_DOWNLOAD,
        shareableUrls: env.ENABLE_SHAREABLE_URLS,
        nativeSharing: env.ENABLE_NATIVE_SHARING,
        communityMembershipRequired: env.REQUIRE_COMMUNITY_MEMBERSHIP,
        publicShareEnabled: env.PUBLIC_SHARE_ENABLED
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: !!env.SUPABASE_URL,
        supabaseAnonKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        googleClientId: !!env.GOOGLE_CLIENT_ID
      }
    }

    // Test database connection
    let supabaseAdmin: ReturnType<typeof createSupabaseAdmin> | null = null
    try {
      supabaseAdmin = createSupabaseAdmin()
      const { error } = await supabaseAdmin
        .from('profiles')
        .select('count')
        .limit(1)
      
      if (error) {
        health.status = 'unhealthy'
        health.database = { status: 'error', error: error.message }
      } else {
        health.database = { status: 'connected' }
      }
    } catch {
      health.status = 'unhealthy'
      health.database = { status: 'error', error: 'Connection failed' }
    }

    // Get user statistics if database is connected
    if (health.database?.status === 'connected' && supabaseAdmin) {
      try {
        const { count: profileCount } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
        
        const { count: rsvpCount } = await supabaseAdmin
          .from('rsvps')
          .select('*', { count: 'exact', head: true })
        
        const { count: showCount } = await supabaseAdmin
          .from('shows')
          .select('*', { count: 'exact', head: true })

        // Get shareable URL statistics if feature is enabled
        let shareableUrlStats = {}
        if (env.ENABLE_SHAREABLE_URLS) {
          try {
            const { count: showsWithPublicId } = await supabaseAdmin
              .from('shows')
              .select('*', { count: 'exact', head: true })
              .not('public_id', 'is', null)
            
            const { data: shareStats } = await supabaseAdmin
              .from('shows')
              .select('share_count')
              .not('share_count', 'is', null)
            
            const totalShares = shareStats?.reduce((sum: number, show: { share_count?: number }) => sum + (show.share_count || 0), 0) || 0

            shareableUrlStats = {
              showsWithPublicId: showsWithPublicId || 0,
              totalShares: totalShares
            }
          } catch {
            console.error('Error fetching shareable URL statistics')
            shareableUrlStats = { error: 'Failed to fetch shareable URL statistics' }
          }
        }

        health.statistics = {
          profiles: profileCount || 0,
          rsvps: rsvpCount || 0,
          shows: showCount || 0,
          ...shareableUrlStats
        }
      } catch {
        console.error('Error fetching statistics')
        health.statistics = { error: 'Failed to fetch statistics' }
      }
    }

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503
    })
  } catch {
    console.error('Health check error')
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 503 })
  }
}
