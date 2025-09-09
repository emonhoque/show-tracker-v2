import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    // Get shows where date_time >= now (using current timestamp)
    const now = new Date()
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .gte('date_time', now.toISOString())
      .order('date_time', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming shows' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
