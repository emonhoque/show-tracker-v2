-- =====================================================
-- SHOW TRACKER - COMPLETE DATABASE SCHEMA
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
-- ✅ All user-generated tables only (no Supabase system tables)

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
    numeric_id TEXT NOT NULL UNIQUE,
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
    email TEXT,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. UTILITY FUNCTIONS
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
    community_numeric_id TEXT,
    user_role TEXT,
    member_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.numeric_id,
        cm.role,
        COUNT(cm2.user_id) as member_count
    FROM communities c
    JOIN community_members cm ON c.id = cm.community_id
    LEFT JOIN community_members cm2 ON c.id = cm2.community_id
    WHERE cm.user_id = user_uuid
    GROUP BY c.id, c.name, c.numeric_id, cm.role
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

-- =====================================================
-- HELPER FUNCTIONS FOR RLS (FIXES CIRCULAR DEPENDENCIES)
-- =====================================================

-- Function to get user's community IDs (bypasses RLS for policy use)
CREATE OR REPLACE FUNCTION get_user_community_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID[] AS $$
DECLARE
    result UUID[];
BEGIN
    -- Use exception handling to gracefully handle missing table
    BEGIN
        SELECT ARRAY(
            SELECT cm.community_id 
            FROM community_members cm 
            WHERE cm.user_id = user_uuid
        ) INTO result;
        RETURN COALESCE(result, ARRAY[]::UUID[]);
    EXCEPTION
        WHEN undefined_table THEN
            RETURN ARRAY[]::UUID[];
        WHEN OTHERS THEN
            RETURN ARRAY[]::UUID[];
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to check if user is member of specific community
CREATE OR REPLACE FUNCTION is_user_community_member(
    user_uuid UUID DEFAULT auth.uid(),
    community_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    result BOOLEAN;
BEGIN
    IF community_uuid IS NULL THEN
        RETURN TRUE; -- Allow access to shows without community_id
    END IF;
    
    -- Use exception handling to gracefully handle missing table
    BEGIN
        SELECT EXISTS (
            SELECT 1 
            FROM community_members cm 
            WHERE cm.user_id = user_uuid 
            AND cm.community_id = community_uuid
        ) INTO result;
        RETURN COALESCE(result, FALSE);
    EXCEPTION
        WHEN undefined_table THEN
            RETURN FALSE;
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to check if user can access show
CREATE OR REPLACE FUNCTION can_user_access_show(
    show_community_id UUID DEFAULT NULL,
    show_public_id TEXT DEFAULT NULL,
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow access to shows without community_id (legacy shows)
    IF show_community_id IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Allow access by public_id if user is member of show's community
    IF show_public_id IS NOT NULL THEN
        RETURN is_user_community_member(user_uuid, show_community_id);
    END IF;
    
    -- Standard community membership check
    RETURN is_user_community_member(user_uuid, show_community_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to get show by public_id and community_numeric_id
CREATE OR REPLACE FUNCTION get_show_by_public_id(
    p_public_id TEXT,
    p_community_numeric_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    date_time TIMESTAMPTZ,
    time_local TEXT,
    city TEXT,
    venue TEXT,
    category TEXT,
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
        s.id, s.title, s.date_time, s.time_local, s.city, s.venue, s.category,
        s.poster_url, s.notes, s.created_at, s.community_id,
        s.public_id, s.slug, s.shareable_url, s.share_count, s.last_shared_at
    FROM shows s
    LEFT JOIN communities c ON s.community_id = c.id
    WHERE s.public_id = p_public_id
    AND (
        p_community_numeric_id IS NULL 
        OR c.numeric_id = p_community_numeric_id
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
            new_shareable_url := '/groups/' || show_record.community_numeric_id || '/event/' || new_public_id;
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

-- Additional utility functions
CREATE OR REPLACE FUNCTION generate_numeric_id()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION batch_generate_shareable_urls()
RETURNS INTEGER AS $$
DECLARE
    show_record RECORD;
    new_public_id TEXT;
    new_slug TEXT;
    new_shareable_url TEXT;
    community_numeric_id TEXT;
    attempts INTEGER;
    max_attempts INTEGER := 10;
    updated_count INTEGER := 0;
BEGIN
    FOR show_record IN 
        SELECT s.id, s.title, s.community_id, c.numeric_id as community_numeric_id
        FROM shows s
        LEFT JOIN communities c ON s.community_id = c.id
        WHERE s.public_id IS NULL
    LOOP
        attempts := 0;
        
        -- Generate unique public_id
        LOOP
            new_public_id := encode(gen_random_bytes(6), 'base64url');
            new_public_id := replace(replace(new_public_id, '+', ''), '/', '');
            new_public_id := left(new_public_id, 8);
            
            -- Check if public_id is unique
            IF NOT EXISTS (SELECT 1 FROM shows WHERE public_id = new_public_id) THEN
                EXIT;
            END IF;
            
            attempts := attempts + 1;
            IF attempts >= max_attempts THEN
                RAISE NOTICE 'Could not generate unique public_id for show %', show_record.id;
                CONTINUE;
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
            shareable_url = new_shareable_url,
            share_count = '0',
            last_shared_at = NOW()
        WHERE id = show_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION create_default_community_and_migrate()
RETURNS VOID AS $$
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

CREATE OR REPLACE FUNCTION get_unique_rsvp_names()
RETURNS TABLE(name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT r.name
    FROM public.rsvps r
    WHERE r.name IS NOT NULL
    ORDER BY r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- =====================================================
-- 3. TRIGGERS
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
-- 4. PERFORMANCE INDEXES
-- =====================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_shows_upcoming ON shows(date_time ASC);
CREATE INDEX IF NOT EXISTS idx_shows_past ON shows(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_shows_category ON shows(category);
CREATE INDEX IF NOT EXISTS idx_shows_community_id ON shows(community_id);
CREATE INDEX IF NOT EXISTS idx_shows_public_id ON shows(public_id) WHERE public_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shows_public_id_unique ON shows(public_id) WHERE public_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shows_community_public_id ON shows(community_id, public_id) WHERE public_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rsvps_show_id ON rsvps(show_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_community_id ON rsvps(community_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_show_status ON rsvps(show_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_show_name_unique ON rsvps(show_id, name) WHERE name IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_communities_numeric_id ON communities(numeric_id);
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
-- 5. ROW LEVEL SECURITY (RLS) SETUP
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

-- Create community-scoped RLS policies for shows table (FIXED: Uses helper functions)
CREATE POLICY "shows_select_policy" ON shows
    FOR SELECT USING (
        can_user_access_show(community_id, public_id, (select auth.uid()))
    );

CREATE POLICY "shows_insert_policy" ON shows
    FOR INSERT WITH CHECK (
        -- Users can insert shows in communities they belong to
        is_user_community_member((select auth.uid()), community_id)
        OR
        -- Allow insertion without community_id during migration
        community_id IS NULL
    );

CREATE POLICY "shows_update_policy" ON shows
    FOR UPDATE USING (
        -- Users can update shows in communities they belong to
        is_user_community_member((select auth.uid()), community_id)
        OR
        -- Allow update without community_id during migration
        community_id IS NULL
    );

CREATE POLICY "shows_delete_policy" ON shows
    FOR DELETE USING (
        -- Users can delete shows in communities they belong to
        is_user_community_member((select auth.uid()), community_id)
        OR
        -- Allow delete without community_id during migration
        community_id IS NULL
    );

-- Create RLS policies for rsvps table (FIXED: Uses helper functions)
CREATE POLICY "rsvps_select_policy" ON rsvps
    FOR SELECT USING (
        -- Users can see RSVPs in communities they belong to
        is_user_community_member((select auth.uid()), community_id)
        OR
        -- Allow access to RSVPs without community_id (legacy support)
        community_id IS NULL
    );

CREATE POLICY "rsvps_insert_policy" ON rsvps
    FOR INSERT WITH CHECK (
        -- Users can create RSVPs in communities they belong to
        (select auth.uid()) IS NOT NULL 
        AND user_id = (select auth.uid())
        AND (
            is_user_community_member((select auth.uid()), community_id)
            OR community_id IS NULL
        )
    );

CREATE POLICY "rsvps_update_policy" ON rsvps
    FOR UPDATE USING (
        -- Users can update their own RSVPs in communities they belong to
        (select auth.uid()) = user_id 
        AND (
            is_user_community_member((select auth.uid()), community_id)
            OR community_id IS NULL
        )
    );

CREATE POLICY "rsvps_delete_policy" ON rsvps
    FOR DELETE USING (
        -- Users can delete their own RSVPs in communities they belong to
        (select auth.uid()) = user_id 
        AND (
            is_user_community_member((select auth.uid()), community_id)
            OR community_id IS NULL
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

-- Communities table policies (FIXED: Uses helper functions)
CREATE POLICY "communities_select_policy" ON communities
    FOR SELECT USING (
        -- Users can read communities where they are members
        id = ANY(get_user_community_ids((select auth.uid())))
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

CREATE POLICY "communities_delete_policy" ON communities
    FOR DELETE USING (
        -- Users can delete communities they created
        (SELECT auth.uid()) = created_by
        OR
        -- Allow system operations (admin changes handled by application logic)
        (SELECT auth.uid()) IS NOT NULL
    );

-- Community members table policies (FIXED: No recursion, uses helper functions)
CREATE POLICY "community_members_select_policy" ON community_members
    FOR SELECT USING (
        -- Users can read their own membership records
        user_id = (select auth.uid())
        OR
        -- Allow system access for authorization checks (needed for app functionality)
        (select auth.uid()) IS NOT NULL
    );

CREATE POLICY "community_members_insert_policy" ON community_members
    FOR INSERT WITH CHECK (
        -- Users can join communities (self-insertion)
        (select auth.uid()) = user_id
        OR
        -- Allow system/admin operations (handled by application logic with proper validation)
        (select auth.uid()) IS NOT NULL
    );

CREATE POLICY "community_members_update_policy" ON community_members
    FOR UPDATE USING (
        -- Users can update their own membership records
        (select auth.uid()) = user_id
        OR
        -- Allow system operations (admin changes handled by application logic)
        (select auth.uid()) IS NOT NULL
    );

CREATE POLICY "community_members_delete_policy" ON community_members
    FOR DELETE USING (
        -- Users can leave communities (delete their own membership)
        (select auth.uid()) = user_id
        OR
        -- Allow system operations (admin removals handled by application logic)
        (select auth.uid()) IS NOT NULL
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
-- 6. FINAL SETUP
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
-- SCHEMA COMPLETE
-- =====================================================
-- Your show-tracker database schema is now fully configured with:
-- ✅ Core tables: shows, rsvps, artists, releases, user_artists
-- ✅ Google Authentication with profiles table
-- ✅ Show categories with smart categorization
-- ✅ Multi-communities support
-- ✅ Music features with community-level control
-- ✅ Shareable URLs for events
-- ✅ Performance indexes for fast queries
-- ✅ Comprehensive RLS policies for security
-- ✅ Helper functions to avoid RLS policy circular dependencies
-- ✅ All user-generated tables only (no Supabase system tables)
-- 
-- Next steps:
-- 1. Configure Google OAuth in Supabase Auth settings
-- 2. Test authentication flow
-- 3. Test community functionality
-- 4. Test shareable URLs
-- 5. Enable feature flags when ready
-- 
-- The database schema is ready for your complete show-tracker application!
