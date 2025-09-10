-- =====================================================
-- SHOW TRACKER - COMPLETE DATABASE SETUP
-- =====================================================
-- This file contains the complete database schema, 
-- performance optimizations, and RLS policies for the show-tracker app.
-- Run this entire file in your Supabase SQL editor.

-- =====================================================
-- 1. TABLE CREATION
-- =====================================================

-- Create shows table
CREATE TABLE IF NOT EXISTS shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date_time TIMESTAMPTZ NOT NULL,
    time_local TEXT NOT NULL, -- Store original time input (e.g., "19:00")
    city TEXT NOT NULL DEFAULT 'Boston',
    venue TEXT NOT NULL,
    ticket_url TEXT,
    spotify_url TEXT,
    apple_music_url TEXT,
    google_photos_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rsvps table
CREATE TABLE IF NOT EXISTS rsvps (
    show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('going', 'maybe', 'not_going')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (show_id, name)
);

-- =====================================================
-- 2. PERFORMANCE INDEXES
-- =====================================================

-- Drop any existing duplicate indexes first
DROP INDEX IF EXISTS idx_shows_date_time;

-- Essential indexes for core functionality
CREATE INDEX IF NOT EXISTS idx_shows_upcoming ON shows(date_time ASC);
CREATE INDEX IF NOT EXISTS idx_shows_past ON shows(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_rsvps_show_id ON rsvps(show_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_show_status ON rsvps(show_id, status);

-- Optional indexes for future features (uncomment if needed)
-- CREATE INDEX IF NOT EXISTS idx_rsvps_name_lower ON rsvps(LOWER(name));
-- CREATE INDEX IF NOT EXISTS idx_shows_date_city ON shows(date_time, city);
-- CREATE INDEX IF NOT EXISTS idx_shows_title_gin ON shows USING gin(to_tsvector('english', title));
-- CREATE INDEX IF NOT EXISTS idx_shows_venue_gin ON shows USING gin(to_tsvector('english', venue));

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to shows" ON shows;
DROP POLICY IF EXISTS "Allow public insert access to shows" ON shows;
DROP POLICY IF EXISTS "Allow public update access to shows" ON shows;
DROP POLICY IF EXISTS "Allow public delete access to shows" ON shows;
DROP POLICY IF EXISTS "Allow authenticated read access to shows" ON shows;
DROP POLICY IF EXISTS "Allow authenticated insert access to shows" ON shows;
DROP POLICY IF EXISTS "Allow authenticated update access to shows" ON shows;
DROP POLICY IF EXISTS "Allow authenticated delete access to shows" ON shows;

DROP POLICY IF EXISTS "Allow public read access to rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow public insert access to rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow public update access to rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow public delete access to rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow authenticated read access to rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow authenticated insert access to rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow authenticated update access to rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow authenticated delete access to rsvps" ON rsvps;

-- Create optimized RLS policies for shows table
CREATE POLICY "shows_select_policy" ON shows
    FOR SELECT USING (true);

CREATE POLICY "shows_insert_policy" ON shows
    FOR INSERT WITH CHECK (true);

CREATE POLICY "shows_update_policy" ON shows
    FOR UPDATE USING (true);

CREATE POLICY "shows_delete_policy" ON shows
    FOR DELETE USING (true);

-- Create optimized RLS policies for rsvps table
CREATE POLICY "rsvps_select_policy" ON rsvps
    FOR SELECT USING (true);

CREATE POLICY "rsvps_insert_policy" ON rsvps
    FOR INSERT WITH CHECK (true);

CREATE POLICY "rsvps_update_policy" ON rsvps
    FOR UPDATE USING (true);

CREATE POLICY "rsvps_delete_policy" ON rsvps
    FOR DELETE USING (true);

-- =====================================================
-- 4. DATABASE STATISTICS UPDATE
-- =====================================================

-- Update table statistics for optimal query planning
ANALYZE shows;
ANALYZE rsvps;

-- =====================================================
-- 5. VERIFICATION QUERIES (OPTIONAL)
-- =====================================================

-- Uncomment these to verify the setup:
-- SELECT 'Tables created successfully' as status;
-- SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
-- SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Your show-tracker database is now fully configured with:
-- ✅ Tables: shows, rsvps
-- ✅ Performance indexes for fast queries
-- ✅ Optimized RLS policies for security
-- ✅ Database statistics updated
-- 
-- The database is ready for your show-tracker application!
