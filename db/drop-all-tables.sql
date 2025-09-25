-- WARNING: This will permanently delete all data!
-- Run this script in your Supabase SQL editor to clean up the database and start fresh.

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_communities_updated_at ON communities;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS generate_public_id();
DROP FUNCTION IF EXISTS create_slug(TEXT);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS get_user_communities(UUID);
DROP FUNCTION IF EXISTS is_community_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_community_admin(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_community_ids(UUID);
DROP FUNCTION IF EXISTS is_user_community_member(UUID, UUID);
DROP FUNCTION IF EXISTS can_user_access_show(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS get_show_by_public_id(TEXT, TEXT);
DROP FUNCTION IF EXISTS increment_share_count(TEXT);
DROP FUNCTION IF EXISTS generate_shareable_url(UUID);
DROP FUNCTION IF EXISTS generate_numeric_id();
DROP FUNCTION IF EXISTS batch_generate_shareable_urls();
DROP FUNCTION IF EXISTS create_default_community_and_migrate();
DROP FUNCTION IF EXISTS get_or_create_profile_for_name(TEXT);
DROP FUNCTION IF EXISTS get_unique_rsvp_names();
DROP TABLE IF EXISTS community_invites CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS user_artists CASCADE;
DROP TABLE IF EXISTS releases CASCADE;
DROP TABLE IF EXISTS rsvps CASCADE;
DROP TABLE IF EXISTS shows CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Verify tables were dropped
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'profiles', 'communities', 'shows', 'rsvps', 'artists', 
    'releases', 'user_artists', 'community_members', 'community_invites'
);