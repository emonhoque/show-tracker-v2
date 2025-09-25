export interface Show {
  id: string
  title: string
  date_time: string
  time_local: string
  city: string
  venue: string
  category?: string | null
  ticket_url?: string | null
  spotify_url?: string | null
  apple_music_url?: string | null
  google_photos_url?: string | null
  poster_url?: string | null
  notes?: string | null
  created_at: string
  community_id?: string | null
  public_id?: string | null
  slug?: string | null
  shareable_url?: string | null
  share_count?: string | null
  last_shared_at?: string | null
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

export interface Artist {
  id: string
  artist_name: string
  spotify_id: string
  spotify_url?: string | null
  image_url?: string | null
  genres?: string[] | null
  popularity?: number | null
  followers_count?: number | null
  last_checked: string
  created_at: string
  created_by?: string | null
  is_active: boolean
}

export interface Release {
  id: string
  artist_id: string
  spotify_id: string
  name: string
  release_type: 'album' | 'single' | 'compilation' | 'ep'
  release_date: string
  spotify_url?: string | null
  image_url?: string | null
  total_tracks?: number | null
  external_urls?: Record<string, string> | null
  artists?: Array<{
    id: string
    name: string
  }> | null
  created_at: string
}

export interface UserArtist {
  user_id: string
  artist_id: string
  added_at: string
}

export interface SpotifyArtist {
  id: string
  name: string
  external_urls: {
    spotify: string
  }
  images: Array<{
    url: string
    height: number
    width: number
  }>
  genres: string[]
  popularity: number
  followers: {
    total: number
  }
}

export interface SpotifyRelease {
  id: string
  name: string
  album_type: string
  release_date: string
  external_urls: {
    spotify: string
  }
  images: Array<{
    url: string
    height: number
    width: number
  }>
  total_tracks: number
  artists: Array<{
    id: string
    name: string
  }>
}

export interface Community {
  id: string
  name: string
  description?: string | null
  numeric_id: string
  created_by: string
  created_at: string
  updated_at: string
  is_default: boolean
  music_enabled?: boolean
}

export interface CommunityMember {
  community_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  invited_by?: string | null
}

export interface CommunityInvite {
  id: string
  community_id: string
  created_by: string
  email?: string | null
  token: string
  expires_at: string
  max_uses: number
  current_uses: number
  created_at: string
}

export interface UserCommunity {
  community_id: string
  community_name: string
  community_numeric_id: string
  user_role: string
  member_count: number
}

export interface ShowWithCommunity extends Show {
  community_id?: string | null
}

export interface RSVPWithCommunity extends RSVP {
  user_id?: string | null
  community_id?: string | null
}

export interface CreateCommunityInput {
  name: string
  description?: string
}

export interface UpdateCommunityInput {
  name?: string
  description?: string
}

export interface InviteToCommunityInput {
  communityId: string
  email?: string
}

export interface AcceptInviteInput {
  token: string
}

export interface CommunityResponse {
  success: boolean
  community?: Community
  error?: string
}

export interface CommunitiesResponse {
  success: boolean
  communities?: UserCommunity[]
  error?: string
}

export interface InviteResponse {
  success: boolean
  inviteUrl?: string
  expiresAt?: string
  error?: string
}

export type ShowCategory = 
  | 'general'
  | 'festival'
  | 'club_night'
  | 'live_music'
  | 'warehouse'
  | 'outdoor'
  | 'private_event'
  | 'workshop'

export interface CategoryInfo {
  value: ShowCategory
  label: string
  description: string
  examples: string[]
}

export interface CategoryStats {
  category: string
  count: number
  percentage: number
}

export interface ShareableUrlResponse {
  success: boolean
  shareableUrl?: string
  publicId?: string
  error?: string
}

export interface ShowDetailResponse {
  success: boolean
  show?: Show
  rsvps?: RSVPSummary
  accessRequired?: boolean
  error?: string
}

export interface UrlResolutionResponse {
  success: boolean
  show?: Show
  accessRequired?: boolean
  error?: string
}

export interface ShareTrackingResponse {
  success: boolean
  shareCount?: number
  error?: string
}

export interface CalendarEvent {
  title: string
  start: string
  end: string
  location: string
  description: string
  url?: string
}

export interface CalendarExportResult {
  success: boolean
  calendarUrl?: string
  icsContent?: string
  filename?: string
  error?: string
}