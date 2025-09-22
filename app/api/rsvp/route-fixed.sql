-- After running the database migration, update the RSVP API to use proper upsert
-- Replace the current upsert logic in app/api/rsvp/route.ts with this:

const { data, error } = await supabase
  .from('rsvps')
  .upsert(
    rsvpData,
    { onConflict: 'show_id,user_id' }
  )
  .select()
  .single()

-- This will work properly after the migration because:
-- 1. The PRIMARY KEY is now (show_id, user_id)
-- 2. All RSVPs have valid user_id values
-- 3. The onConflict parameter matches the actual primary key
