import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    // Get shows where date_time < Boston now, sorted descending, limit 200
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .lt('date_time', new Date().toISOString())
      .order('date_time', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch past shows' },
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
