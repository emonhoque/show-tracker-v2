-- Create shows table
CREATE TABLE shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date_time TIMESTAMPTZ NOT NULL,
    time_local TEXT NOT NULL, -- Store original time input (e.g., "19:00")
    city TEXT NOT NULL DEFAULT 'Boston',
    venue TEXT NOT NULL,
    ticket_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rsvps table
CREATE TABLE rsvps (
    show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('going', 'maybe', 'not_going')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (show_id, name)
);

-- Create indexes for performance
CREATE INDEX idx_shows_date_time ON shows(date_time);
CREATE INDEX idx_rsvps_show_id ON rsvps(show_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Security policies for shows table
-- Allow anyone to read shows (for public viewing)
CREATE POLICY "Allow public read access to shows" ON shows
    FOR SELECT USING (true);

-- Allow anyone to insert shows (for adding new shows)
CREATE POLICY "Allow public insert access to shows" ON shows
    FOR INSERT WITH CHECK (true);

-- Allow anyone to update shows (for editing shows)
CREATE POLICY "Allow public update access to shows" ON shows
    FOR UPDATE USING (true);

-- Allow anyone to delete shows (for removing shows)
CREATE POLICY "Allow public delete access to shows" ON shows
    FOR DELETE USING (true);

-- Security policies for rsvps table
-- Allow anyone to read rsvps (for viewing RSVP lists)
CREATE POLICY "Allow public read access to rsvps" ON rsvps
    FOR SELECT USING (true);

-- Allow anyone to insert rsvps (for creating RSVPs)
CREATE POLICY "Allow public insert access to rsvps" ON rsvps
    FOR INSERT WITH CHECK (true);

-- Allow anyone to update rsvps (for changing RSVP status)
CREATE POLICY "Allow public update access to rsvps" ON rsvps
    FOR UPDATE USING (true);

-- Allow anyone to delete rsvps (for removing RSVPs)
CREATE POLICY "Allow public delete access to rsvps" ON rsvps
    FOR DELETE USING (true);

-- Note: These policies allow full public access since this is a group show tracker
-- where all members should be able to manage shows and RSVPs.
-- The app uses a simple password gate for basic access control.