import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { CategoryStats } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('community_id')

    let query = supabase
      .from('shows')
      .select('category')
    
    if (communityId) {
      query = query.eq('community_id', communityId)
    }

    const { data: shows, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch category stats' },
        { status: 500 }
      )
    }

    const categoryCounts: Record<string, number> = {}
    let totalShows = 0

    shows?.forEach(show => {
      const category = show.category || 'general'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
      totalShows++
    })

    const stats: CategoryStats[] = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: totalShows > 0 ? Math.round((count / totalShows) * 100 * 100) / 100 : 0
    })).sort((a, b) => b.count - a.count)

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error fetching category stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
