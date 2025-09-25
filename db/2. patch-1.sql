-- =====================================================
-- FINAL COMPREHENSIVE FIX: Complete database setup
-- =====================================================
-- This single patch fixes all the database issues:
-- 1. Function signature problems
-- 2. Search path issues  
-- 3. Missing RLS policies
-- 4. Authentication context

-- =====================================================
-- STEP 1: Fix is_user_community_member function
-- =====================================================

-- Drop all existing versions to avoid conflicts
DROP FUNCTION IF EXISTS is_user_community_member CASCADE;

-- Create the function with proper search path and schema references
CREATE OR REPLACE FUNCTION is_user_community_member(
    user_uuid UUID,
    community_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    result BOOLEAN;
BEGIN
    -- Allow access to shows without community_id
    IF community_uuid IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- If user_uuid is NULL, deny access
    IF user_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is member of the community
    BEGIN
        SELECT EXISTS (
            SELECT 1 
            FROM public.community_members 
            WHERE user_id = user_uuid 
            AND community_id = community_uuid
        ) INTO result;
        
        RETURN COALESCE(result, FALSE);
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- =====================================================
-- STEP 2: Fix can_user_access_show function
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS can_user_access_show CASCADE;

-- Create with proper schema references
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
        RETURN public.is_user_community_member(user_uuid, show_community_id);
    END IF;
    
    -- Standard community membership check
    RETURN public.is_user_community_member(user_uuid, show_community_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- =====================================================
-- STEP 3: Create RLS policies for shows table
-- =====================================================

-- Enable RLS on shows table
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "shows_select_policy" ON shows;
DROP POLICY IF EXISTS "shows_insert_policy" ON shows;
DROP POLICY IF EXISTS "shows_update_policy" ON shows;
DROP POLICY IF EXISTS "shows_delete_policy" ON shows;

-- Create SELECT policy
CREATE POLICY "shows_select_policy" ON shows
FOR SELECT
USING (
    can_user_access_show(community_id, public_id, auth.uid())
);

-- Create INSERT policy
CREATE POLICY "shows_insert_policy" ON shows
FOR INSERT
WITH CHECK (
    community_id IS NULL 
    OR 
    is_user_community_member(auth.uid(), community_id)
);

-- Create UPDATE policy
CREATE POLICY "shows_update_policy" ON shows
FOR UPDATE
USING (
    community_id IS NULL 
    OR 
    is_user_community_member(auth.uid(), community_id)
)
WITH CHECK (
    community_id IS NULL 
    OR 
    is_user_community_member(auth.uid(), community_id)
);

-- Create DELETE policy
CREATE POLICY "shows_delete_policy" ON shows
FOR DELETE
USING (
    community_id IS NULL 
    OR 
    is_user_community_member(auth.uid(), community_id)
);

-- =====================================================
-- STEP 4: Create RLS policies for RSVPs table
-- =====================================================

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "rsvps_select_policy" ON rsvps;
DROP POLICY IF EXISTS "rsvps_insert_policy" ON rsvps;
DROP POLICY IF EXISTS "rsvps_update_policy" ON rsvps;
DROP POLICY IF EXISTS "rsvps_delete_policy" ON rsvps;

-- Create SELECT policy for RSVPs
-- Community members can see RSVPs for shows in their communities
CREATE POLICY "rsvps_select_policy" ON rsvps
FOR SELECT
USING (
    -- Allow if user is member of the show's community
    is_user_community_member(auth.uid(), community_id)
    OR
    -- Allow if user is member of the show's community (via show relationship)
    EXISTS (
        SELECT 1 
        FROM shows s 
        WHERE s.id = rsvps.show_id 
        AND is_user_community_member(auth.uid(), s.community_id)
    )
);

-- Create INSERT policy for RSVPs
-- Users can create RSVPs for shows they have access to
CREATE POLICY "rsvps_insert_policy" ON rsvps
FOR INSERT
WITH CHECK (
    -- User can only RSVP for themselves
    user_id = auth.uid()
    AND
    -- User must be member of the show's community
    (
        is_user_community_member(auth.uid(), community_id)
        OR
        EXISTS (
            SELECT 1 
            FROM shows s 
            WHERE s.id = rsvps.show_id 
            AND is_user_community_member(auth.uid(), s.community_id)
        )
    )
);

-- Create UPDATE policy for RSVPs
-- Users can update their own RSVPs for shows they have access to
CREATE POLICY "rsvps_update_policy" ON rsvps
FOR UPDATE
USING (
    -- User can only update their own RSVPs
    user_id = auth.uid()
    AND
    -- User must be member of the show's community
    (
        is_user_community_member(auth.uid(), community_id)
        OR
        EXISTS (
            SELECT 1 
            FROM shows s 
            WHERE s.id = rsvps.show_id 
            AND is_user_community_member(auth.uid(), s.community_id)
        )
    )
)
WITH CHECK (
    -- User can only update their own RSVPs
    user_id = auth.uid()
    AND
    -- User must be member of the show's community
    (
        is_user_community_member(auth.uid(), community_id)
        OR
        EXISTS (
            SELECT 1 
            FROM shows s 
            WHERE s.id = rsvps.show_id 
            AND is_user_community_member(auth.uid(), s.community_id)
        )
    )
);

-- Create DELETE policy for RSVPs
-- Users can delete their own RSVPs
CREATE POLICY "rsvps_delete_policy" ON rsvps
FOR DELETE
USING (
    -- User can only delete their own RSVPs
    user_id = auth.uid()
);

-- =====================================================
-- COMPLETE
-- =====================================================
