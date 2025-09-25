'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Download, ExternalLink, Loader2, Clock, X } from 'lucide-react'
import { Show } from '@/lib/types'
import { createClient } from '@/lib/supabase'

interface CalendarExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  show: Show
  shareableUrl?: string
}

const durationOptions = [
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '3', label: '3 hours' },
  { value: '4', label: '4 hours' },
  { value: '5', label: '5 hours' },
  { value: '6', label: '6 hours' }
]

export function CalendarExportModal({ open, onOpenChange, show, shareableUrl }: CalendarExportModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState('3')

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No session token available')
    }
    
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }

  const handleGoogleCalendar = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await authenticatedFetch('/api/calendar/google', {
        method: 'POST',
        body: JSON.stringify({ 
          showId: show.id, 
          shareableUrl,
          duration: parseInt(duration)
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate calendar link')
      }

      if (data.calendarUrl) {
        window.open(data.calendarUrl, '_blank', 'noopener,noreferrer')
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Google Calendar export error:', error)
      setError(error instanceof Error ? error.message : 'Failed to export to Google Calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleICSDownload = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await authenticatedFetch('/api/calendar/ics', {
        method: 'POST',
        body: JSON.stringify({ 
          showId: show.id, 
          shareableUrl,
          duration: parseInt(duration)
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate calendar file')
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${show.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'calendar.ics'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      onOpenChange(false) 
    } catch (error) {
      console.error('ICS download error:', error)
      setError(error instanceof Error ? error.message : 'Failed to download calendar file')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5" />
            Calendar
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Primary Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleGoogleCalendar}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 h-12 text-base font-medium"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ExternalLink className="h-5 w-5" />
              )}
              Google Calendar
            </Button>
            
            <Button
              onClick={handleICSDownload}
              disabled={isLoading}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-12 text-base font-medium"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              Download .ics File
            </Button>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Clock className="h-4 w-4" />
              Approximate Duration
            </div>
            <Select value={duration} onChange={setDuration}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
