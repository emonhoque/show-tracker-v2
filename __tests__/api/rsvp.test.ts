/**
 * @jest-environment node
 */
import { POST } from '@/app/api/rsvp/route'
import { NextRequest } from 'next/server'

// Mock the Supabase client
jest.mock('@/lib/db', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { date_time: '2023-01-01T00:00:00Z' }, // Past date
            error: null
          }))
        }))
      })),
      upsert: jest.fn()
    }))
  }
}))

describe('RSVP API Route', () => {
  it('should return 409 when trying to RSVP to a past show', async () => {
    const request = new NextRequest('http://localhost:3000/api/rsvp', {
      method: 'POST',
      body: JSON.stringify({
        show_id: 'test-show-id',
        name: 'Test User',
        status: 'going'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Cannot RSVP to past shows')
  })

  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/rsvp', {
      method: 'POST',
      body: JSON.stringify({
        show_id: 'test-show-id',
        // missing name and status
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('should validate status values', async () => {
    const request = new NextRequest('http://localhost:3000/api/rsvp', {
      method: 'POST',
      body: JSON.stringify({
        show_id: 'test-show-id',
        name: 'Test User',
        status: 'invalid-status'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid status. Must be "going", "maybe", or "not_going"')
  })
})
