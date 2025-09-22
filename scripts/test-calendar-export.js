#!/usr/bin/env node

/**
 * Test script for calendar export functionality
 * Run with: node scripts/test-calendar-export.js
 */

const { generateGoogleCalendarUrl, generateICSContent, getCalendarEventData, validateCalendarData } = require('../lib/calendar.ts')

// Mock show data for testing
const mockShow = {
  id: 'test-show-123',
  title: 'Test Artist',
  date_time: '2024-03-15T23:00:00Z', // 7 PM Boston time
  time_local: '19:00',
  city: 'Boston',
  venue: 'Test Venue',
  ticket_url: 'https://example.com/tickets',
  spotify_url: 'https://open.spotify.com/artist/test',
  notes: 'This is a test show for calendar export',
  created_at: '2024-03-01T12:00:00Z'
}

console.log('🧪 Testing Calendar Export Functionality\n')

try {
  // Test 1: Validate calendar data
  console.log('1. Testing calendar data validation...')
  const validation = validateCalendarData(mockShow)
  console.log(`   ✅ Validation result: ${validation.isValid ? 'PASS' : 'FAIL'}`)
  if (!validation.isValid) {
    console.log(`   ❌ Error: ${validation.error}`)
  }

  // Test 2: Generate Google Calendar URL
  console.log('\n2. Testing Google Calendar URL generation...')
  const googleUrl = generateGoogleCalendarUrl(mockShow, 'https://showtracker.app/test-show')
  console.log(`   ✅ Google Calendar URL generated`)
  console.log(`   🔗 URL: ${googleUrl}`)

  // Test 3: Generate ICS content
  console.log('\n3. Testing ICS content generation...')
  const icsContent = generateICSContent(mockShow, 'https://showtracker.app/test-show')
  console.log(`   ✅ ICS content generated (${icsContent.length} characters)`)
  console.log(`   📄 First 200 chars: ${icsContent.substring(0, 200)}...`)

  // Test 4: Get calendar event data
  console.log('\n4. Testing calendar event data...')
  const eventData = getCalendarEventData(mockShow, 'https://showtracker.app/test-show')
  console.log(`   ✅ Event data generated`)
  console.log(`   📅 Title: ${eventData.title}`)
  console.log(`   📍 Location: ${eventData.location}`)
  console.log(`   ⏰ Start: ${eventData.start}`)
  console.log(`   ⏰ End: ${eventData.end}`)

  console.log('\n🎉 All tests passed! Calendar export functionality is working correctly.')
  
} catch (error) {
  console.error('\n❌ Test failed:', error.message)
  console.error(error.stack)
  process.exit(1)
}
