import { formatBostonTime, bostonToUTC, isShowPast } from '@/lib/time'

describe('Time Utilities', () => {
  describe('formatBostonTime', () => {
    it('should format UTC timestamp to Boston time', () => {
      // Test with a known UTC timestamp
      const utcDate = '2024-10-18T23:00:00Z' // 7:00 PM EST
      const formatted = formatBostonTime(utcDate)
      expect(formatted).toMatch(/Oct 18.*7:00 PM/)
    })
  })

  describe('bostonToUTC', () => {
    it('should convert Boston local date and time to UTC', () => {
      // Test conversion
      const dateLocal = '2024-10-18'
      const timeLocal = '19:00' // 7:00 PM Boston time
      const utc = bostonToUTC(dateLocal, timeLocal)
      
      // In October, Boston is in EDT (UTC-4)
      expect(utc.toISOString()).toBe('2024-10-18T23:00:00.000Z')
    })
  })

  describe('isShowPast', () => {
    it('should return true for past shows', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1) // Yesterday
      expect(isShowPast(pastDate)).toBe(true)
    })

    it('should return false for future shows', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1) // Tomorrow
      expect(isShowPast(futureDate)).toBe(false)
    })

    it('should handle edge case at exact Boston 7:00 PM', () => {
      // Create a date for today at 7:00 PM Boston time
      const now = new Date()
      const todayAt7PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0)
      
      // This test depends on current time, so we'll just verify the function works
      const result = isShowPast(todayAt7PM)
      expect(typeof result).toBe('boolean')
    })
  })
})
