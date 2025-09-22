# Google Authentication Migration Guide

This guide walks you through migrating from password-based authentication to Google Authentication using Supabase Auth.

## Prerequisites

1. **Supabase Project Setup**
   - Create a Supabase project
   - Get your project URL and anon key
   - Get your service role key

2. **Google OAuth Setup**
   - Create a Google Cloud Console project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (development)
     - `https://yourdomain.com/auth/callback` (production)

3. **Environment Variables**
   - Copy `env.example` to `.env.local`
   - Fill in all required values

## Migration Steps

### Step 1: Database Migration

Run the database migration script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of database-google-auth-migration.sql
```

This will:
- Create the `profiles` table
- Add `user_id` column to `rsvps` table
- Set up RLS policies
- Create triggers for automatic profile creation

### Step 2: Configure Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Providers
3. Enable Google provider
4. Add your Google OAuth credentials:
   - Client ID: `GOOGLE_CLIENT_ID`
   - Client Secret: `GOOGLE_CLIENT_SECRET`
5. Set redirect URL to: `https://yourdomain.com/auth/callback`

### Step 3: Migrate Existing Users

Run the migration script to convert existing RSVP names to user profiles:

```bash
# Install tsx if not already installed
npm install -g tsx

# Run the migration script
npx tsx scripts/migrate-users.ts
```

This script will:
- Find all unique names in your RSVPs table
- Create temporary user accounts for each name
- Link RSVPs to the new user accounts
- Provide a detailed migration report

### Step 4: Test the Migration

1. **Health Check**
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/health/auth
   ```

2. **Test Authentication**
   - Start your development server
   - Visit the app - you should see the Google sign-in button
   - Test signing in with a Google account
   - Verify profile creation and RSVP functionality

### Step 5: Enable Google Auth

Once testing is complete, enable Google Authentication:

1. Set environment variables:
   ```bash
   ENABLE_GOOGLE_AUTH=true
   SUPABASE_AUTH_ENABLED=true
   ```

2. Deploy to production
3. Update your Google OAuth redirect URIs to include production URL

## Rollback Plan

If you need to rollback:

1. **Disable Google Auth**
   ```bash
   ENABLE_GOOGLE_AUTH=false
   SUPABASE_AUTH_ENABLED=false
   ```

2. **Restore Name-based RSVPs**
   ```sql
   -- Update RSVPs to use name instead of user_id
   UPDATE rsvps 
   SET name = p.name 
   FROM profiles p 
   WHERE rsvps.user_id = p.id AND rsvps.name IS NULL;
   ```

3. **Remove user_id column** (optional)
   ```sql
   ALTER TABLE rsvps DROP COLUMN user_id;
   ```

## Verification

After migration, verify:

- [ ] All existing RSVPs have associated user profiles
- [ ] Google sign-in works correctly
- [ ] Profile management works
- [ ] RSVP functionality is preserved
- [ ] No data loss occurred

## Troubleshooting

### Common Issues

1. **"Profile not found" errors**
   - Check if the profiles table was created
   - Verify the trigger is working
   - Check RLS policies

2. **Google OAuth errors**
   - Verify redirect URIs match exactly
   - Check Google OAuth credentials
   - Ensure Supabase Auth is properly configured

3. **Migration script failures**
   - Check database permissions
   - Verify environment variables
   - Check for invalid names in RSVPs

### Debug Commands

```bash
# Check health status
curl http://localhost:3000/api/health/auth

# Check database connection
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
supabase.from('profiles').select('count').then(console.log);
"
```

## Support

If you encounter issues:

1. Check the health endpoints
2. Review the migration script output
3. Check Supabase logs
4. Verify all environment variables are set correctly
