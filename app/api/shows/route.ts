import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { createServerSupabaseClient, createSupabaseAdmin } from '@/lib/supabase-server'
import { bostonToUTC } from '@/lib/time'
import { discordService, ShowData } from '@/lib/discord'
import { 
  validateTitle, 
  validateVenue, 
  validateCity, 
  validateUrl, 
  validateNotes, 
  validateDate, 
  validateTime 
} from '@/lib/validation'
import { isValidCategory } from '@/lib/categories'
import { logger } from '@/lib/logger'

export async function GET() {
  return NextResponse.json({ message: 'Shows API is working' })
}

export async function POST(request: NextRequest) {
  logger.debug('Shows API POST called')
  try {
    const body = await request.json()
    logger.debug('Request body', { body })
    const { title, date_local, time_local, city, venue, category, ticket_url, spotify_url, apple_music_url, google_photos_url, poster_url, notes, community_id } = body

    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (community_id && community_id !== 'null' && community_id !== 'undefined') {
      logger.debug('Checking community membership', { userId: user.id, communityId: community_id })
      const supabaseAdmin = createSupabaseAdmin()
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('community_members')
        .select('role')
        .eq('community_id', community_id)
        .eq('user_id', user.id)
        .single()

      logger.debug('Membership check result', { membership, membershipError })

      if (membershipError || !membership) {
        logger.warn('User is not a member of community', { userId: user.id, communityId: community_id })
        return NextResponse.json(
          { error: 'You are not a member of this community' },
          { status: 403 }
        )
      }
      
      logger.debug('User is a member with role', { userId: user.id, communityId: community_id, role: membership.role })
    }

    const titleValidation = validateTitle(title)
    if (!titleValidation.isValid) {
      return NextResponse.json({ error: titleValidation.error }, { status: 400 })
    }

    const venueValidation = validateVenue(venue)
    if (!venueValidation.isValid) {
      return NextResponse.json({ error: venueValidation.error }, { status: 400 })
    }

    const cityValidation = validateCity(city)
    if (!cityValidation.isValid) {
      return NextResponse.json({ error: cityValidation.error }, { status: 400 })
    }

    const dateValidation = validateDate(date_local)
    if (!dateValidation.isValid) {
      return NextResponse.json({ error: dateValidation.error }, { status: 400 })
    }

    const timeValidation = validateTime(time_local)
    if (!timeValidation.isValid) {
      return NextResponse.json({ error: timeValidation.error }, { status: 400 })
    }

    if (category && !isValidCategory(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const ticketUrlValidation = validateUrl(ticket_url || '')
    if (!ticketUrlValidation.isValid) {
      return NextResponse.json({ error: ticketUrlValidation.error }, { status: 400 })
    }

    const spotifyUrlValidation = validateUrl(spotify_url || '')
    if (!spotifyUrlValidation.isValid) {
      return NextResponse.json({ error: spotifyUrlValidation.error }, { status: 400 })
    }

    const appleMusicUrlValidation = validateUrl(apple_music_url || '')
    if (!appleMusicUrlValidation.isValid) {
      return NextResponse.json({ error: appleMusicUrlValidation.error }, { status: 400 })
    }

    const googlePhotosUrlValidation = validateUrl(google_photos_url || '')
    if (!googlePhotosUrlValidation.isValid) {
      return NextResponse.json({ error: googlePhotosUrlValidation.error }, { status: 400 })
    }

    const posterUrlValidation = validateUrl(poster_url || '')
    if (!posterUrlValidation.isValid) {
      return NextResponse.json({ error: posterUrlValidation.error }, { status: 400 })
    }

    const notesValidation = validateNotes(notes || '')
    if (!notesValidation.isValid) {
      return NextResponse.json({ error: notesValidation.error }, { status: 400 })
    }

    const utcDateTime = bostonToUTC(dateValidation.sanitizedValue!, timeValidation.sanitizedValue!)

    const { data, error } = await supabase
      .from('shows')
      .insert([
        {
          title: titleValidation.sanitizedValue,
          date_time: utcDateTime.toISOString(),
          time_local: timeValidation.sanitizedValue,
          city: cityValidation.sanitizedValue,
          venue: venueValidation.sanitizedValue,
          category: category || 'general',
          ticket_url: ticketUrlValidation.sanitizedValue || null,
          spotify_url: spotifyUrlValidation.sanitizedValue || null,
          apple_music_url: appleMusicUrlValidation.sanitizedValue || null,
          google_photos_url: googlePhotosUrlValidation.sanitizedValue || null,
          poster_url: posterUrlValidation.sanitizedValue || null,
          notes: notesValidation.sanitizedValue || null,
          community_id: community_id || null
        }
      ])
      .select()
      .single()

    if (error) {
      logger.error('Database error', { error, userId: user.id })
      return NextResponse.json(
        { error: 'Failed to create show' },
        { status: 500 }
      )
    }

    if (data) {
      const showData: ShowData = {
        id: data.id,
        title: data.title,
        date_time: data.date_time,
        venue: data.venue,
        city: data.city
      }
      
      discordService.sendNotificationAsync('new-show', showData)
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error('API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
