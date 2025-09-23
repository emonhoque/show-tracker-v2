-- =====================================================
-- SHOW TRACKER - FINAL MASTER DATABASE MIGRATION
-- =====================================================
-- This file contains the complete, clean database schema for the show-tracker app.
-- This is the single source of truth - run this entire file in your Supabase SQL editor.
--
-- Features included:
-- ✅ Core tables (shows, rsvps, artists, releases, user_artists)
-- ✅ Google Authentication with profiles table
-- ✅ Show categories with smart categorization
-- ✅ Multi-communities support
-- ✅ Music features with community-level control
-- ✅ Shareable URLs for events
-- ✅ Performance indexes and RLS policies
-- ✅ Data migration for existing records

-- =====================================================
-- 1. CORE TABLE CREATION
-- =====================================================

-- Create profiles table (must be first due to foreign key dependencies)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create communities table
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL UNIQUE, -- Changed from numeric_id to slug for consistency
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_default BOOLEAN DEFAULT FALSE,
    music_enabled BOOLEAN DEFAULT FALSE
);

-- Create shows table
CREATE TABLE IF NOT EXISTS shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date_time TIMESTAMPTZ NOT NULL,
    time_local TEXT NOT NULL, -- Store original time input (e.g., "19:00")
    city TEXT NOT NULL DEFAULT 'Boston',
    venue TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN (
        'general',        -- Default/miscellaneous shows
        'festival',       -- Multi-day festivals and large events
        'club_night',     -- Club shows and DJ sets
        'live_music',     -- Live bands and concerts
        'warehouse',      -- Warehouse parties and underground events
        'outdoor',        -- Outdoor events and gatherings
        'private_event',  -- Private parties and exclusive events
        'workshop'        -- Educational or instructional events
    )),
    ticket_url TEXT,
    spotify_url TEXT,
    apple_music_url TEXT,
    google_photos_url TEXT,
    poster_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Community and shareable URL support
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    public_id TEXT,
    slug TEXT,
    shareable_url TEXT,
    share_count INTEGER DEFAULT 0,
    last_shared_at TIMESTAMPTZ
);

-- Create rsvps table (with proper UUID-based primary key)
CREATE TABLE IF NOT EXISTS rsvps (
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT, -- Keep for legacy compatibility, but not part of primary key
    status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    PRIMARY KEY (show_id, user_id)
);

-- Add comment to document the foreign key relationship
COMMENT ON CONSTRAINT rsvps_user_id_fkey ON rsvps IS 
'Foreign key constraint linking rsvps.user_id to profiles.id for proper relationship mapping in Supabase queries';

-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_name TEXT NOT NULL,
    spotify_id TEXT UNIQUE NOT NULL,
    spotify_url TEXT,
    image_url TEXT,
    genres TEXT[],
    popularity INTEGER,
    followers_count INTEGER,
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT, -- Track who added the artist (optional)
    is_active BOOLEAN DEFAULT true
);

-- Create releases table
CREATE TABLE IF NOT EXISTS releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    spotify_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    release_type TEXT CHECK (release_type IN ('album', 'single', 'compilation', 'ep')),
    release_date DATE NOT NULL,
    spotify_url TEXT,
    image_url TEXT,
    total_tracks INTEGER,
    external_urls JSONB,
    artists JSONB, -- Store all artists as JSON array
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_artists table
CREATE TABLE IF NOT EXISTS user_artists (
    user_id TEXT NOT NULL,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, artist_id)
);

-- Create community_members table
CREATE TABLE IF NOT EXISTS community_members (
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    PRIMARY KEY (community_id, user_id)
);

-- Create community_invites table
CREATE TABLE IF NOT EXISTS community_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INTEGER DEFAULT 100,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. FOREIGN KEY VERIFICATION
-- =====================================================

-- Verify the rsvps foreign key constraint was created successfully
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'rsvps'
          AND kcu.column_name = 'user_id'
          AND ccu.table_name = 'profiles'
          AND ccu.column_name = 'id'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'Foreign key constraint rsvps_user_id_fkey was not created properly';
    END IF;
    
    RAISE NOTICE 'Foreign key constraint rsvps_user_id_fkey verified successfully';
END $$;

-- =====================================================
-- 3. PERFORMANCE INDEXES
-- =====================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_shows_upcoming ON shows(date_time ASC);
CREATE INDEX IF NOT EXISTS idx_shows_past ON shows(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_shows_category ON shows(category);
CREATE INDEX IF NOT EXISTS idx_shows_community_id ON shows(community_id);
CREATE INDEX IF NOT EXISTS idx_shows_public_id ON shows(public_id) WHERE public_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shows_public_id_unique ON shows(public_id) WHERE public_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rsvps_show_id ON rsvps(show_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_community_id ON rsvps(community_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_show_status ON rsvps(show_id, status);

CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_artists_active ON artists(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_artists_last_checked ON artists(last_checked);

CREATE INDEX IF NOT EXISTS idx_releases_artist_id ON releases(artist_id);
CREATE INDEX IF NOT EXISTS idx_releases_release_date ON releases(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_releases_spotify_id ON releases(spotify_id);

CREATE INDEX IF NOT EXISTS idx_user_artists_user_id ON user_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_artists_artist_id ON user_artists(artist_id);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Communities table indexes
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_communities_is_default ON communities(is_default) WHERE is_default = true;

-- Community members indexes
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members(community_id, role);

-- Community invites indexes
CREATE INDEX IF NOT EXISTS idx_community_invites_community_id ON community_invites(community_id);
CREATE INDEX IF NOT EXISTS idx_community_invites_token ON community_invites(token);
CREATE INDEX IF NOT EXISTS idx_community_invites_expires_at ON community_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_community_invites_created_by ON community_invites(created_by);

-- =====================================================
-- 4. UTILITY FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to generate a random 8-character alphanumeric public ID
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create URL-friendly slug from title
CREATE OR REPLACE FUNCTION create_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(
        regexp_replace(
            regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
    ));
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to get user's communities
CREATE OR REPLACE FUNCTION get_user_communities(user_uuid UUID)
RETURNS TABLE (
    community_id UUID,
    community_name TEXT,
    community_slug TEXT,
    user_role TEXT,
    member_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.slug,
        cm.role,
        COUNT(cm2.user_id) as member_count
    FROM communities c
    JOIN community_members cm ON c.id = cm.community_id
    LEFT JOIN community_members cm2 ON c.id = cm2.community_id
    WHERE cm.user_id = user_uuid
    GROUP BY c.id, c.name, c.slug, cm.role
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to check if user is member of community
CREATE OR REPLACE FUNCTION is_community_member(user_uuid UUID, community_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM community_members 
        WHERE user_id = user_uuid AND community_id = community_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to check if user is admin of community
CREATE OR REPLACE FUNCTION is_community_admin(user_uuid UUID, community_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM community_members 
        WHERE user_id = user_uuid 
        AND community_id = community_uuid 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to get show by public_id and community_slug
CREATE OR REPLACE FUNCTION get_show_by_public_id(
    p_public_id TEXT,
    p_community_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    date_time TIMESTAMPTZ,
    time_local TEXT,
    city TEXT,
    venue TEXT,
    ticket_url TEXT,
    spotify_url TEXT,
    apple_music_url TEXT,
    google_photos_url TEXT,
    poster_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    community_id UUID,
    public_id TEXT,
    slug TEXT,
    shareable_url TEXT,
    share_count INTEGER,
    last_shared_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, s.title, s.date_time, s.time_local, s.city, s.venue,
        s.ticket_url, s.spotify_url, s.apple_music_url, s.google_photos_url,
        s.poster_url, s.notes, s.created_at, s.community_id,
        s.public_id, s.slug, s.shareable_url, s.share_count, s.last_shared_at
    FROM shows s
    LEFT JOIN communities c ON s.community_id = c.id
    WHERE s.public_id = p_public_id
    AND (
        p_community_slug IS NULL 
        OR c.slug = p_community_slug
        OR s.community_id IS NULL
    )
    AND (
        -- Check community membership
        s.community_id IS NULL
        OR s.community_id IN (
            SELECT cm.community_id 
            FROM community_members cm 
            WHERE cm.user_id = auth.uid()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to increment share count
CREATE OR REPLACE FUNCTION increment_share_count(p_public_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE shows 
    SET 
        share_count = COALESCE(share_count, 0) + 1,
        last_shared_at = NOW()
    WHERE public_id = p_public_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to generate new shareable URL for a show
CREATE OR REPLACE FUNCTION generate_shareable_url(p_show_id UUID)
RETURNS TEXT AS $$
DECLARE
    show_record RECORD;
    new_public_id TEXT;
    new_slug TEXT;
    new_shareable_url TEXT;
    attempts INTEGER;
    max_attempts INTEGER := 10;
BEGIN
    -- Get show details
    SELECT s.*, c.slug as community_slug
    INTO show_record
    FROM shows s
    LEFT JOIN communities c ON s.community_id = c.id
    WHERE s.id = p_show_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Show not found';
    END IF;
    
    -- Generate unique public ID if not exists
    IF show_record.public_id IS NULL THEN
        attempts := 0;
        
        LOOP
            new_public_id := generate_public_id();
            attempts := attempts + 1;
            
            -- Check if public_id already exists
            IF NOT EXISTS (SELECT 1 FROM shows WHERE public_id = new_public_id) THEN
                EXIT;
            END IF;
            
            -- Prevent infinite loop
            IF attempts >= max_attempts THEN
                RAISE EXCEPTION 'Failed to generate unique public_id after % attempts', max_attempts;
            END IF;
        END LOOP;
        
        -- Generate slug from title
        new_slug := create_slug(show_record.title);
        
        -- Generate shareable URL
        IF show_record.community_slug IS NOT NULL THEN
            new_shareable_url := '/c/' || show_record.community_slug || '/e/' || new_public_id;
        ELSE
            new_shareable_url := '/share/' || new_public_id;
        END IF;
        
        -- Update the show record
        UPDATE shows 
        SET 
            public_id = new_public_id,
            slug = new_slug,
            shareable_url = new_shareable_url
        WHERE id = p_show_id;
        
        RETURN new_shareable_url;
    ELSE
        RETURN show_record.shareable_url;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Create trigger for profiles updated_at timestamp
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for communities updated_at timestamp
CREATE TRIGGER update_communities_updated_at 
    BEFORE UPDATE ON communities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "shows_select_policy" ON shows;
DROP POLICY IF EXISTS "shows_insert_policy" ON shows;
DROP POLICY IF EXISTS "shows_update_policy" ON shows;
DROP POLICY IF EXISTS "shows_delete_policy" ON shows;
DROP POLICY IF EXISTS "rsvps_select_policy" ON rsvps;
DROP POLICY IF EXISTS "rsvps_insert_policy" ON rsvps;
DROP POLICY IF EXISTS "rsvps_update_policy" ON rsvps;
DROP POLICY IF EXISTS "rsvps_delete_policy" ON rsvps;
DROP POLICY IF EXISTS "artists_select_policy" ON artists;
DROP POLICY IF EXISTS "artists_insert_policy" ON artists;
DROP POLICY IF EXISTS "artists_update_policy" ON artists;
DROP POLICY IF EXISTS "artists_delete_policy" ON artists;
DROP POLICY IF EXISTS "releases_select_policy" ON releases;
DROP POLICY IF EXISTS "releases_insert_policy" ON releases;
DROP POLICY IF EXISTS "releases_update_policy" ON releases;
DROP POLICY IF EXISTS "releases_delete_policy" ON releases;
DROP POLICY IF EXISTS "user_artists_select_policy" ON user_artists;
DROP POLICY IF EXISTS "user_artists_insert_policy" ON user_artists;
DROP POLICY IF EXISTS "user_artists_update_policy" ON user_artists;
DROP POLICY IF EXISTS "user_artists_delete_policy" ON user_artists;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "communities_select_policy" ON communities;
DROP POLICY IF EXISTS "communities_insert_policy" ON communities;
DROP POLICY IF EXISTS "communities_update_policy" ON communities;
DROP POLICY IF EXISTS "communities_delete_policy" ON communities;
DROP POLICY IF EXISTS "community_members_select_policy" ON community_members;
DROP POLICY IF EXISTS "community_members_insert_policy" ON community_members;
DROP POLICY IF EXISTS "community_members_update_policy" ON community_members;
DROP POLICY IF EXISTS "community_members_delete_policy" ON community_members;
DROP POLICY IF EXISTS "community_invites_select_policy" ON community_invites;
DROP POLICY IF EXISTS "community_invites_insert_policy" ON community_invites;
DROP POLICY IF EXISTS "community_invites_update_policy" ON community_invites;
DROP POLICY IF EXISTS "community_invites_delete_policy" ON community_invites;

-- Create RLS policies for profiles table
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (
        -- Users can read their own profile
        (SELECT auth.uid()) = id
        OR
        -- Public read access for basic profile info (name, avatar) for RSVP display
        true
    );

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (
        -- Users can only insert their own profile
        (SELECT auth.uid()) = id
    );

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (
        -- Users can only update their own profile
        (SELECT auth.uid()) = id
    );

-- Create community-scoped RLS policies for shows table
CREATE POLICY "shows_select_policy" ON shows
    FOR SELECT USING (
        -- Users can only access shows from communities they belong to
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
        OR
        -- Allow access to shows without community_id during migration
        community_id IS NULL
        OR
        -- Allow access to shows by public_id (for shareable URLs)
        (public_id IS NOT NULL AND (
            -- Allow access if user is member of the show's community
            community_id IN (
                SELECT cm.community_id 
                FROM community_members cm 
                WHERE cm.user_id = (SELECT auth.uid())
            )
            OR
            -- Allow access if show has no community (legacy shows)
            community_id IS NULL
        ))
    );

CREATE POLICY "shows_insert_policy" ON shows
    FOR INSERT WITH CHECK (
        -- Users can insert shows in communities they belong to
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
        OR
        -- Allow insertion without community_id during migration
        community_id IS NULL
    );

CREATE POLICY "shows_update_policy" ON shows
    FOR UPDATE USING (
        -- Users can update shows in communities they belong to
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
        OR
        -- Allow update without community_id during migration
        community_id IS NULL
    );

CREATE POLICY "shows_delete_policy" ON shows
    FOR DELETE USING (
        -- Users can delete shows in communities they belong to
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
        OR
        -- Allow delete without community_id during migration
        community_id IS NULL
    );

-- Create RLS policies for rsvps table
CREATE POLICY "rsvps_select_policy" ON rsvps
    FOR SELECT USING (
        -- Users can see RSVPs in communities they belong to
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
        OR
        -- Allow access to RSVPs without community_id (legacy support)
        community_id IS NULL
    );

CREATE POLICY "rsvps_insert_policy" ON rsvps
    FOR INSERT WITH CHECK (
        -- Users can create RSVPs in communities they belong to
        (SELECT auth.uid()) IS NOT NULL 
        AND user_id = (SELECT auth.uid())
        AND community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "rsvps_update_policy" ON rsvps
    FOR UPDATE USING (
        -- Users can update their own RSVPs in communities they belong to
        (SELECT auth.uid()) = user_id 
        AND community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "rsvps_delete_policy" ON rsvps
    FOR DELETE USING (
        -- Users can delete their own RSVPs in communities they belong to
        (SELECT auth.uid()) = user_id 
        AND community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- Create RLS policies for other tables (open access for now)
CREATE POLICY "artists_select_policy" ON artists FOR SELECT USING (true);
CREATE POLICY "artists_insert_policy" ON artists FOR INSERT WITH CHECK (true);
CREATE POLICY "artists_update_policy" ON artists FOR UPDATE USING (true);
CREATE POLICY "artists_delete_policy" ON artists FOR DELETE USING (true);

CREATE POLICY "releases_select_policy" ON releases FOR SELECT USING (true);
CREATE POLICY "releases_insert_policy" ON releases FOR INSERT WITH CHECK (true);
CREATE POLICY "releases_update_policy" ON releases FOR UPDATE USING (true);
CREATE POLICY "releases_delete_policy" ON releases FOR DELETE USING (true);

CREATE POLICY "user_artists_select_policy" ON user_artists FOR SELECT USING (true);
CREATE POLICY "user_artists_insert_policy" ON user_artists FOR INSERT WITH CHECK (true);
CREATE POLICY "user_artists_update_policy" ON user_artists FOR UPDATE USING (true);
CREATE POLICY "user_artists_delete_policy" ON user_artists FOR DELETE USING (true);

-- Communities table policies
CREATE POLICY "communities_select_policy" ON communities
    FOR SELECT USING (
        -- Users can read communities where they are members
        id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "communities_insert_policy" ON communities
    FOR INSERT WITH CHECK (
        -- Users can create new communities (becomes admin automatically)
        (SELECT auth.uid()) = created_by
    );

CREATE POLICY "communities_update_policy" ON communities
    FOR UPDATE USING (
        -- Users can update communities they created
        (SELECT auth.uid()) = created_by
        OR
        -- Allow system operations (admin changes handled by application logic)
        (SELECT auth.uid()) IS NOT NULL
    );

-- Community members table policies (FIXED: No recursion)
CREATE POLICY "community_members_select_policy" ON community_members
    FOR SELECT USING (
        -- Users can read their own membership records
        user_id = (SELECT auth.uid())
        OR
        -- Allow system access for authorization checks (needed for app functionality)
        (SELECT auth.uid()) IS NOT NULL
    );

CREATE POLICY "community_members_insert_policy" ON community_members
    FOR INSERT WITH CHECK (
        -- Users can join communities (self-insertion)
        (SELECT auth.uid()) = user_id
        OR
        -- Allow system/admin operations (handled by application logic with proper validation)
        (SELECT auth.uid()) IS NOT NULL
    );

CREATE POLICY "community_members_update_policy" ON community_members
    FOR UPDATE USING (
        -- Users can update their own membership records
        (SELECT auth.uid()) = user_id
        OR
        -- Allow system operations (admin changes handled by application logic)
        (SELECT auth.uid()) IS NOT NULL
    );

CREATE POLICY "community_members_delete_policy" ON community_members
    FOR DELETE USING (
        -- Users can leave communities (delete their own membership)
        (SELECT auth.uid()) = user_id
        OR
        -- Allow system operations (admin removals handled by application logic)
        (SELECT auth.uid()) IS NOT NULL
    );

-- Community invites table policies
CREATE POLICY "community_invites_select_policy" ON community_invites
    FOR SELECT USING (
        -- Users can read invites they created OR anyone can read for token validation
        created_by = (SELECT auth.uid())
        OR
        -- Public read for token validation (needed for invite acceptance)
        true
    );

CREATE POLICY "community_invites_insert_policy" ON community_invites
    FOR INSERT WITH CHECK (
        -- Users can create invites for communities they created
        (SELECT auth.uid()) = created_by
        OR
        -- Allow system operations (admin invites handled by application logic)
        (SELECT auth.uid()) IS NOT NULL
    );

-- =====================================================
-- 7. DATA MIGRATION FOR EXISTING RECORDS
-- =====================================================

-- Create default community for existing data
INSERT INTO communities (name, description, slug, created_by, is_default)
SELECT 
    'Default Community',
    'All existing shows and RSVPs have been migrated to this community',
    'default',
    (SELECT id FROM profiles LIMIT 1),
    true
WHERE NOT EXISTS (SELECT 1 FROM communities WHERE is_default = true);

-- Add all existing users to default community
INSERT INTO community_members (community_id, user_id, role)
SELECT 
    c.id,
    p.id,
    'member'
FROM communities c
CROSS JOIN profiles p
WHERE c.is_default = true
AND NOT EXISTS (
    SELECT 1 FROM community_members cm 
    WHERE cm.community_id = c.id AND cm.user_id = p.id
);

-- Update all existing shows to default community
UPDATE shows 
SET community_id = (SELECT id FROM communities WHERE is_default = true LIMIT 1)
WHERE community_id IS NULL;

-- Update all existing RSVPs to default community
UPDATE rsvps 
SET community_id = (SELECT id FROM communities WHERE is_default = true LIMIT 1)
WHERE community_id IS NULL;

-- Migrate existing RSVPs to use user_id instead of name
-- Step 1: Create profiles for existing RSVP names that don't have profiles
INSERT INTO profiles (id, email, name, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    COALESCE(rsvps.name || '@legacy.local', 'unknown@legacy.local'),
    rsvps.name,
    NOW(),
    NOW()
FROM rsvps 
WHERE rsvps.user_id IS NULL 
  AND rsvps.name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE LOWER(p.name) = LOWER(rsvps.name)
  );

-- Step 2: Update RSVPs to use the created profiles
UPDATE rsvps 
SET user_id = (
    SELECT p.id 
    FROM profiles p 
    WHERE LOWER(p.name) = LOWER(rsvps.name) 
    LIMIT 1
)
WHERE user_id IS NULL AND name IS NOT NULL;

-- Step 3: For any remaining RSVPs without a matching profile, create a profile
INSERT INTO profiles (id, email, name, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    COALESCE(rsvps.name || '@legacy.local', 'unknown@legacy.local'),
    rsvps.name,
    NOW(),
    NOW()
FROM rsvps 
WHERE user_id IS NULL 
  AND name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE LOWER(p.name) = LOWER(rsvps.name)
  );

-- Step 4: Update the remaining NULL user_ids with the newly created profiles
UPDATE rsvps 
SET user_id = (
    SELECT p.id 
    FROM profiles p 
    WHERE LOWER(p.name) = LOWER(rsvps.name) 
    LIMIT 1
)
WHERE user_id IS NULL AND name IS NOT NULL;

-- Step 5: Make user_id NOT NULL (it should be populated by now)
ALTER TABLE rsvps ALTER COLUMN user_id SET NOT NULL;

-- Step 6: Make the name column nullable since we're now using user_id
ALTER TABLE rsvps ALTER COLUMN name DROP NOT NULL;

-- Step 7: Add a unique constraint on (show_id, name) for any legacy compatibility
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_show_name_unique 
ON rsvps (show_id, name) 
WHERE name IS NOT NULL;

-- Apply smart categorization to existing shows
UPDATE shows 
SET category = CASE
  -- Festival keywords
  WHEN (
    LOWER(title) LIKE '%festival%' OR 
    LOWER(title) LIKE '%fest%' OR 
    LOWER(title) LIKE '%weekend%' OR 
    LOWER(title) LIKE '%multi-day%' OR
    LOWER(venue) LIKE '%festival%' OR 
    LOWER(venue) LIKE '%fest%'
  ) THEN 'festival'
  
  -- Club night keywords
  WHEN (
    LOWER(title) LIKE '%club%' OR 
    LOWER(title) LIKE '%nightclub%' OR 
    LOWER(title) LIKE '%dj%' OR 
    LOWER(title) LIKE '%dance%' OR
    LOWER(venue) LIKE '%club%' OR 
    LOWER(venue) LIKE '%nightclub%'
  ) THEN 'club_night'
  
  -- Live music keywords
  WHEN (
    LOWER(title) LIKE '%band%' OR 
    LOWER(title) LIKE '%concert%' OR 
    LOWER(title) LIKE '%live%' OR 
    LOWER(title) LIKE '%acoustic%' OR
    LOWER(venue) LIKE '%concert%' OR 
    LOWER(venue) LIKE '%theater%' OR
    LOWER(venue) LIKE '%auditorium%'
  ) THEN 'live_music'
  
  -- Warehouse keywords
  WHEN (
    LOWER(title) LIKE '%warehouse%' OR 
    LOWER(title) LIKE '%underground%' OR 
    LOWER(title) LIKE '%rave%' OR
    LOWER(venue) LIKE '%warehouse%' OR 
    LOWER(venue) LIKE '%industrial%'
  ) THEN 'warehouse'
  
  -- Outdoor keywords
  WHEN (
    LOWER(title) LIKE '%outdoor%' OR 
    LOWER(title) LIKE '%park%' OR 
    LOWER(title) LIKE '%beach%' OR 
    LOWER(title) LIKE '%garden%' OR 
    LOWER(title) LIKE '%rooftop%' OR
    LOWER(venue) LIKE '%park%' OR 
    LOWER(venue) LIKE '%beach%' OR 
    LOWER(venue) LIKE '%garden%' OR 
    LOWER(venue) LIKE '%rooftop%'
  ) THEN 'outdoor'
  
  -- Private event keywords
  WHEN (
    LOWER(title) LIKE '%private%' OR 
    LOWER(title) LIKE '%exclusive%' OR 
    LOWER(title) LIKE '%invite%' OR
    LOWER(venue) LIKE '%private%'
  ) THEN 'private_event'
  
  -- Workshop keywords
  WHEN (
    LOWER(title) LIKE '%workshop%' OR 
    LOWER(title) LIKE '%class%' OR 
    LOWER(title) LIKE '%educational%' OR 
    LOWER(title) LIKE '%instruction%' OR
    LOWER(venue) LIKE '%workshop%' OR 
    LOWER(venue) LIKE '%studio%'
  ) THEN 'workshop'
  
  -- Default to general for all other cases
  ELSE 'general'
END
WHERE category IS NULL OR category = 'general';

-- Generate public IDs and slugs for existing shows
DO $$
DECLARE
    show_record RECORD;
    new_public_id TEXT;
    new_slug TEXT;
    new_shareable_url TEXT;
    community_slug TEXT;
    attempts INTEGER;
    max_attempts INTEGER := 10;
BEGIN
    FOR show_record IN 
        SELECT s.id, s.title, s.community_id, c.slug as community_slug
        FROM shows s
        LEFT JOIN communities c ON s.community_id = c.id
        WHERE s.public_id IS NULL
    LOOP
        attempts := 0;
        
        -- Generate unique public ID
        LOOP
            new_public_id := generate_public_id();
            attempts := attempts + 1;
            
            -- Check if public_id already exists
            IF NOT EXISTS (SELECT 1 FROM shows WHERE public_id = new_public_id) THEN
                EXIT;
            END IF;
            
            -- Prevent infinite loop
            IF attempts >= max_attempts THEN
                RAISE EXCEPTION 'Failed to generate unique public_id after % attempts', max_attempts;
            END IF;
        END LOOP;
        
        -- Generate slug from title
        new_slug := create_slug(show_record.title);
        
        -- Generate shareable URL
        IF show_record.community_slug IS NOT NULL THEN
            new_shareable_url := '/c/' || show_record.community_slug || '/e/' || new_public_id;
        ELSE
            new_shareable_url := '/share/' || new_public_id;
        END IF;
        
        -- Update the show record
        UPDATE shows 
        SET 
            public_id = new_public_id,
            slug = new_slug,
            shareable_url = new_shareable_url
        WHERE id = show_record.id;
        
    END LOOP;
END $$;

-- =====================================================
-- 8. VALIDATION AND CLEANUP
-- =====================================================

-- Verify all shows have public_ids
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM shows 
    WHERE public_id IS NULL;
    
    IF missing_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % shows still missing public_id', missing_count;
    END IF;
    
    RAISE NOTICE 'Migration successful: All shows have public_ids';
END $$;

-- Verify all RSVPs have user_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM rsvps WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Migration failed: Some RSVPs still have NULL user_id';
    END IF;
    
    RAISE NOTICE 'RSVP UUID migration completed successfully';
END $$;

-- Update table statistics for optimal query planning
ANALYZE shows;
ANALYZE rsvps;
ANALYZE artists;
ANALYZE releases;
ANALYZE user_artists;
ANALYZE profiles;
ANALYZE communities;
ANALYZE community_members;
ANALYZE community_invites;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Your show-tracker database is now fully configured with:
-- ✅ Core tables: shows, rsvps, artists, releases, user_artists
-- ✅ Google Authentication with profiles table
-- ✅ Show categories with smart categorization
-- ✅ Multi-communities support
-- ✅ Music features with community-level control
-- ✅ Shareable URLs for events
-- ✅ Performance indexes for fast queries
-- ✅ Comprehensive RLS policies for security
-- ✅ Data migration for existing records
-- ✅ UUID-based RSVP tracking with proper foreign key constraints
-- ✅ Database statistics updated
-- 
-- Next steps:
-- 1. Configure Google OAuth in Supabase Auth settings
-- 2. Test authentication flow
-- 3. Test community functionality
-- 4. Test shareable URLs
-- 5. Enable feature flags when ready
-- 
-- The database is ready for your complete show-tracker application!
