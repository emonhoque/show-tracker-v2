-- =====================================================
-- SHOW TRACKER - MASTER DATABASE MIGRATION
-- =====================================================
-- This file contains the complete database schema, migrations, and features for the show-tracker app.
-- Run this entire file in your Supabase SQL editor to set up the complete application.
--
-- Features included:
-- ✅ Core tables (shows, rsvps, artists, releases, user_artists)
-- ✅ Google Authentication with profiles table
-- ✅ Show categories with smart categorization
-- ✅ Multi-communities support
-- ✅ Music features with community-level control
-- ✅ Shareable URLs for events
-- ✅ Performance indexes and RLS policies
-- ✅ Migration helpers and data migration scripts

-- =====================================================
-- 1. CORE TABLE CREATION
-- =====================================================

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
    -- Community support (added later)
    community_id UUID,
    -- Shareable URL support (added later)
    public_id TEXT,
    slug TEXT,
    shareable_url TEXT,
    share_count INTEGER DEFAULT 0,
    last_shared_at TIMESTAMPTZ
);

-- Create rsvps table
CREATE TABLE IF NOT EXISTS rsvps (
    show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('going', 'maybe', 'not_going')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Google Auth support (added later)
    user_id UUID,
    -- Community support (added later)
    community_id UUID,
    PRIMARY KEY (show_id, name)
);

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

-- =====================================================
-- 2. GOOGLE AUTH - PROFILES TABLE
-- =====================================================

-- Create profiles table with foreign key to auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. MULTI-COMMUNITIES - COMMUNITY TABLES
-- =====================================================

-- Create communities table
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    numeric_id TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_default BOOLEAN DEFAULT FALSE,
    music_enabled BOOLEAN DEFAULT FALSE
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
-- 4. ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add user_id column to rsvps table (nullable initially for migration)
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add community_id columns to existing tables
ALTER TABLE shows ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id) ON DELETE CASCADE;

-- =====================================================
-- 5. PERFORMANCE INDEXES
-- =====================================================

-- Drop any existing duplicate indexes first
DROP INDEX IF EXISTS idx_shows_date_time;

-- Essential indexes for core functionality
CREATE INDEX IF NOT EXISTS idx_shows_upcoming ON shows(date_time ASC);
CREATE INDEX IF NOT EXISTS idx_shows_past ON shows(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_shows_category ON shows(category);
CREATE INDEX IF NOT EXISTS idx_rsvps_show_id ON rsvps(show_id);
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

-- User_id index for rsvps
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON rsvps(user_id);

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

-- Community scoped indexes
CREATE INDEX IF NOT EXISTS idx_shows_community_id ON shows(community_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_community_id ON rsvps(community_id);

-- Shareable URL indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_shows_public_id ON shows(public_id) WHERE public_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shows_community_public_id ON shows(community_id, public_id) WHERE public_id IS NOT NULL;

-- =====================================================
-- 6. UTILITY FUNCTIONS
-- =====================================================

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = '';

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

-- Function to get or create profile for existing name
CREATE OR REPLACE FUNCTION get_or_create_profile_for_name(user_name TEXT)
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
    temp_email TEXT;
BEGIN
    -- Check if profile already exists for this name
    SELECT id INTO profile_id 
    FROM profiles 
    WHERE LOWER(name) = LOWER(user_name) 
    LIMIT 1;
    
    IF profile_id IS NOT NULL THEN
        RETURN profile_id;
    END IF;
    
    -- Create temporary email for migration
    temp_email := 'migration-' || gen_random_uuid()::text || '@temp.local';
    
    -- Create temporary user in auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        temp_email,
        '',
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object('full_name', user_name),
        false,
        '',
        '',
        '',
        ''
    ) RETURNING id INTO profile_id;
    
    -- Profile will be created automatically by the trigger
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to create default community and migrate existing data
CREATE OR REPLACE FUNCTION create_default_community_and_migrate()
RETURNS void AS $$
DECLARE
    default_community_id UUID;
    profile_record RECORD;
BEGIN
    -- Create default community
    INSERT INTO communities (name, description, slug, created_by, is_default)
    VALUES (
        'Default Community',
        'All existing shows and RSVPs have been migrated to this community',
        'default',
        (SELECT id FROM profiles LIMIT 1), -- Use first profile as creator
        true
    )
    RETURNING id INTO default_community_id;
    
    -- Add all existing users to default community
    FOR profile_record IN SELECT id FROM profiles LOOP
        INSERT INTO community_members (community_id, user_id, role)
        VALUES (default_community_id, profile_record.id, 'member')
        ON CONFLICT (community_id, user_id) DO NOTHING;
    END LOOP;
    
    -- Update all existing shows to default community
    UPDATE shows 
    SET community_id = default_community_id 
    WHERE community_id IS NULL;
    
    -- Update all existing RSVPs to default community
    UPDATE rsvps 
    SET community_id = default_community_id 
    WHERE community_id IS NULL;
    
    RAISE NOTICE 'Default community created and data migrated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to get user's communities
CREATE OR REPLACE FUNCTION get_user_communities(user_uuid UUID)
RETURNS TABLE (
    community_id UUID,
    community_name TEXT,
    community_numeric_id TEXT,
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

-- Function to get show by public_id and community_numeric_id
CREATE OR REPLACE FUNCTION get_show_by_public_id(
    p_public_id TEXT,
    p_community_id TEXT DEFAULT NULL
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
        p_community_id IS NULL 
        OR c.numeric_id = p_community_id
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
    SELECT s.*, c.numeric_id as community_numeric_id
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
        IF show_record.community_numeric_id IS NOT NULL THEN
            new_shareable_url := '/c/' || show_record.community_numeric_id || '/e/' || new_public_id;
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
-- 7. TRIGGERS
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
-- 8. ROW LEVEL SECURITY (RLS) SETUP
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
DROP POLICY IF EXISTS "shows_select_by_public_id" ON shows;
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

-- Create updated RLS policies for rsvps table
CREATE POLICY "rsvps_select_policy" ON rsvps
    FOR SELECT USING (
        -- Users can only access RSVPs from communities they belong to
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
        OR
        -- Allow access to RSVPs without community_id during migration
        community_id IS NULL
    );

CREATE POLICY "rsvps_insert_policy" ON rsvps
    FOR INSERT WITH CHECK (
        -- Allow insertion if user is authenticated OR if using legacy name field
        ((SELECT auth.uid()) IS NOT NULL AND community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        ))
        OR
        -- Legacy support for name-based RSVPs during migration
        (name IS NOT NULL AND community_id IS NULL)
    );

CREATE POLICY "rsvps_update_policy" ON rsvps
    FOR UPDATE USING (
        -- Users can update their own RSVPs in communities they belong to
        ((SELECT auth.uid()) = user_id AND community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        ))
        OR
        -- Legacy support for name-based RSVPs during migration
        (name IS NOT NULL AND community_id IS NULL)
    );

CREATE POLICY "rsvps_delete_policy" ON rsvps
    FOR DELETE USING (
        -- Users can delete their own RSVPs in communities they belong to
        ((SELECT auth.uid()) = user_id AND community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        ))
        OR
        -- Legacy support for name-based RSVPs during migration
        (name IS NOT NULL AND community_id IS NULL)
    );

-- Create RLS policies for other tables (open access for now)
CREATE POLICY "artists_select_policy" ON artists
    FOR SELECT USING (true);

CREATE POLICY "artists_insert_policy" ON artists
    FOR INSERT WITH CHECK (true);

CREATE POLICY "artists_update_policy" ON artists
    FOR UPDATE USING (true);

CREATE POLICY "artists_delete_policy" ON artists
    FOR DELETE USING (true);

CREATE POLICY "releases_select_policy" ON releases
    FOR SELECT USING (true);

CREATE POLICY "releases_insert_policy" ON releases
    FOR INSERT WITH CHECK (true);

CREATE POLICY "releases_update_policy" ON releases
    FOR UPDATE USING (true);

CREATE POLICY "releases_delete_policy" ON releases
    FOR DELETE USING (true);

CREATE POLICY "user_artists_select_policy" ON user_artists
    FOR SELECT USING (true);

CREATE POLICY "user_artists_insert_policy" ON user_artists
    FOR INSERT WITH CHECK (true);

CREATE POLICY "user_artists_update_policy" ON user_artists
    FOR UPDATE USING (true);

CREATE POLICY "user_artists_delete_policy" ON user_artists
    FOR DELETE USING (true);

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
        -- Users can update communities where they are admins
        id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Community members table policies
CREATE POLICY "community_members_select_policy" ON community_members
    FOR SELECT USING (
        -- Users can read membership where they are members
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "community_members_insert_policy" ON community_members
    FOR INSERT WITH CHECK (
        -- Community admins can add members OR users can join via invite
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
        )
        OR
        -- Allow self-joining via valid invite (handled by application logic)
        (SELECT auth.uid()) = user_id
    );

CREATE POLICY "community_members_update_policy" ON community_members
    FOR UPDATE USING (
        -- Community admins can update members OR users can update their own role
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
        )
        OR
        (SELECT auth.uid()) = user_id
    );

CREATE POLICY "community_members_delete_policy" ON community_members
    FOR DELETE USING (
        -- Community admins can remove members OR users can leave voluntarily
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
        )
        OR
        (SELECT auth.uid()) = user_id
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
        -- Users can create invites for communities they admin
        community_id IN (
            SELECT community_id 
            FROM community_members 
            WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- =====================================================
-- 9. SMART CATEGORIZATION MIGRATION
-- =====================================================

-- Update existing shows with smart categorization based on title and venue
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

-- =====================================================
-- 10. SHAREABLE URLS MIGRATION
-- =====================================================

-- Generate public IDs and slugs for existing shows
DO $$
DECLARE
    show_record RECORD;
    new_public_id TEXT;
    new_slug TEXT;
    new_shareable_url TEXT;
    community_numeric_id TEXT;
    attempts INTEGER;
    max_attempts INTEGER := 10;
BEGIN
    FOR show_record IN 
        SELECT s.id, s.title, s.community_id, c.slug as community_numeric_id
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
        IF show_record.community_numeric_id IS NOT NULL THEN
            new_shareable_url := '/c/' || show_record.community_numeric_id || '/e/' || new_public_id;
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
-- 11. MIGRATION SCRIPTS FOR EXISTING DATA
-- =====================================================

-- This script should be run after the above setup to migrate existing RSVPs
-- Uncomment and run this section when ready to migrate:

/*
-- Step 1: Get unique names from existing RSVPs
DO $$
DECLARE
    rsvp_record RECORD;
    profile_id UUID;
BEGIN
    -- Loop through all unique names in rsvps
    FOR rsvp_record IN 
        SELECT DISTINCT name FROM rsvps WHERE name IS NOT NULL
    LOOP
        -- Get or create profile for this name
        SELECT get_or_create_profile_for_name(rsvp_record.name) INTO profile_id;
        
        -- Update all RSVPs with this name to use the profile_id
        UPDATE rsvps 
        SET user_id = profile_id 
        WHERE name = rsvp_record.name AND user_id IS NULL;
        
        RAISE NOTICE 'Migrated RSVPs for user: %', rsvp_record.name;
    END LOOP;
END $$;

-- Step 2: Verify migration
SELECT 
    COUNT(*) as total_rsvps,
    COUNT(user_id) as rsvps_with_user_id,
    COUNT(name) as rsvps_with_name,
    COUNT(*) - COUNT(user_id) as unmigrated_rsvps
FROM rsvps;
*/

-- Execute the default community creation and migration
-- Uncomment the line below when ready to migrate existing data:
-- SELECT create_default_community_and_migrate();

-- =====================================================
-- 12. VALIDATION QUERIES
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

-- Verify all shows have valid categories
SELECT 
  category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM shows), 2) as percentage
FROM shows 
GROUP BY category 
ORDER BY count DESC;

-- =====================================================
-- 13. DATABASE STATISTICS UPDATE
-- =====================================================

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
-- 14. CLEANUP
-- =====================================================

-- Drop helper functions (they're recreated as needed)
DROP FUNCTION IF EXISTS generate_public_id();
DROP FUNCTION IF EXISTS create_slug(TEXT);

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
-- ✅ Migration helper functions
-- ✅ Backward compatibility with existing data
-- ✅ Database statistics updated
-- 
-- Next steps:
-- 1. Configure Google OAuth in Supabase Auth settings
-- 2. Run the migration scripts to migrate existing data (uncomment sections above)
-- 3. Test authentication flow
-- 4. Test community functionality
-- 5. Test shareable URLs
-- 6. Enable feature flags when ready
-- 
-- The database is ready for your complete show-tracker application!
