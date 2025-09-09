import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { bostonToUTC } from '@/lib/time'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, date_local, time_local, city, venue, ticket_url, notes } = body

    // Validate required fields
    if (!title || !date_local || !time_local || !city || !venue) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date_local, time_local, city, venue' },
        { status: 400 }
      )
    }

    // Convert Boston local date and time to UTC
    const utcDateTime = bostonToUTC(date_local, time_local)

    // Insert into database
    const { data, error } = await supabase
      .from('shows')
      .insert([
        {
          title,
          date_time: utcDateTime.toISOString(),
          time_local,
          city,
          venue,
          ticket_url: ticket_url || null,
          notes: notes || null
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create show' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
