#!/usr/bin/env tsx

/**
 * Test script for shareable URLs functionality
 * Run with: npx tsx scripts/test-shareable-urls.ts
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testShareableUrls() {
  console.log('🧪 Testing Shareable URLs functionality...\n')

  try {
    // Test 1: Check if shows table has the new columns
    console.log('1. Checking database schema...')
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'shows')
      .in('column_name', ['public_id', 'slug', 'shareable_url', 'share_count', 'last_shared_at'])

    if (columnError) {
      console.error('❌ Error checking columns:', columnError)
      return
    }

    const expectedColumns = ['public_id', 'slug', 'shareable_url', 'share_count', 'last_shared_at']
    const foundColumns = columns?.map(col => col.column_name) || []
    const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col))

    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns)
      console.log('   Please run the database migration first:')
      console.log('   psql -f database-shareable-urls-migration.sql')
      return
    }

    console.log('✅ All required columns exist')

    // Test 2: Check if any shows have public_ids
    console.log('\n2. Checking for shows with public IDs...')
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, title, public_id, shareable_url')
      .not('public_id', 'is', null)
      .limit(5)

    if (showsError) {
      console.error('❌ Error fetching shows:', showsError)
      return
    }

    if (!shows || shows.length === 0) {
      console.log('⚠️  No shows with public IDs found')
      console.log('   This is expected if the migration hasn\'t been run yet')
    } else {
      console.log(`✅ Found ${shows.length} shows with public IDs`)
      shows.forEach(show => {
        console.log(`   - ${show.title}: ${show.public_id}`)
      })
    }

    // Test 3: Test URL generation function
    console.log('\n3. Testing URL generation function...')
    const { data: testShows, error: testError } = await supabase
      .from('shows')
      .select('id, title')
      .limit(1)

    if (testError || !testShows || testShows.length === 0) {
      console.log('⚠️  No shows available for testing')
    } else {
      const testShow = testShows[0]
      console.log(`   Testing with show: ${testShow.title}`)

      const { data: urlData, error: urlError } = await supabase
        .rpc('generate_shareable_url', { p_show_id: testShow.id })

      if (urlError) {
        console.error('❌ Error generating URL:', urlError)
      } else {
        console.log('✅ URL generation function works')
      }
    }

    // Test 4: Test show resolution function
    console.log('\n4. Testing show resolution function...')
    if (shows && shows.length > 0) {
      const testShow = shows[0]
      const { data: resolvedShows, error: resolveError } = await supabase
        .rpc('get_show_by_public_id', { 
          p_public_id: testShow.public_id,
          p_community_slug: null
        })

      if (resolveError) {
        console.error('❌ Error resolving show:', resolveError)
      } else if (resolvedShows && resolvedShows.length > 0) {
        console.log('✅ Show resolution function works')
        console.log(`   Resolved: ${resolvedShows[0].title}`)
      } else {
        console.log('⚠️  Show resolution returned no results')
      }
    }

    // Test 5: Check feature flags
    console.log('\n5. Checking feature flags...')
    const featureFlags = {
      ENABLE_SHAREABLE_URLS: process.env.ENABLE_SHAREABLE_URLS,
      ENABLE_NATIVE_SHARING: process.env.ENABLE_NATIVE_SHARING,
      REQUIRE_COMMUNITY_MEMBERSHIP: process.env.REQUIRE_COMMUNITY_MEMBERSHIP,
      PUBLIC_SHARE_ENABLED: process.env.PUBLIC_SHARE_ENABLED,
      SHARE_URL_EXPIRATION_DAYS: process.env.SHARE_URL_EXPIRATION_DAYS
    }

    console.log('   Feature flags:')
    Object.entries(featureFlags).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value || 'not set'}`)
    })

    console.log('\n✅ Shareable URLs test completed!')
    console.log('\nNext steps:')
    console.log('1. Run the database migration: psql -f database-shareable-urls-migration.sql')
    console.log('2. Set ENABLE_SHAREABLE_URLS=true in your .env.local file')
    console.log('3. Test the sharing functionality in the UI')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testShareableUrls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test script failed:', error)
    process.exit(1)
  })
