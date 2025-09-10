export interface Show {
  id: string
  title: string
  date_time: string
  time_local: string
  city: string
  venue: string
  ticket_url?: string | null
  spotify_url?: string | null
  apple_music_url?: string | null
  google_photos_url?: string | null
  notes?: string | null
  created_at: string
}

export interface RSVP {
  show_id: string
  name: string
  status: 'going' | 'maybe' | 'not_going'
  updated_at: string
}

export interface RSVPSummary {
  going: string[]
  maybe: string[]
  not_going: string[]
}
