import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Show ID is required' },
        { status: 400 }
      )
    }

    // Delete the show (RSVPs will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from('shows')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to delete show' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Show deleted successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { title, date_local, time_local, city, venue, ticket_url, notes } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Show ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!title || !date_local || !time_local || !city || !venue) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date_local, time_local, city, venue' },
        { status: 400 }
      )
    }

    // Convert Boston local time to UTC
    const bostonDateTime = new Date(`${date_local}T${time_local}`)
    const utcDateTime = new Date(bostonDateTime.getTime() - (bostonDateTime.getTimezoneOffset() * 60000))

    // Update the show
    const { data, error } = await supabase
      .from('shows')
      .update({
        title,
        date_time: utcDateTime.toISOString(),
        time_local,
        city,
        venue,
        ticket_url: ticket_url || null,
        notes: notes || null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update show' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Show not found' },
        { status: 404 }
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
