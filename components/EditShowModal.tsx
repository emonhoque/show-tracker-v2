'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectContent, SelectOption } from '@/components/ui/select'
import { Show } from '@/lib/types'
import { formatInTimeZone } from 'date-fns-tz'

interface EditShowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  show: Show | null
  onShowUpdated: () => void
}

export function EditShowModal({ open, onOpenChange, show, onShowUpdated }: EditShowModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    date_local: '',
    time_local: '',
    city: 'Boston',
    venue: '',
    ticket_url: '',
    spotify_url: '',
    apple_music_url: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Populate form when show changes
  useEffect(() => {
    if (show) {
      const bostonDate = formatInTimeZone(show.date_time, 'America/New_York', 'yyyy-MM-dd')
      
      setFormData({
        title: show.title,
        date_local: bostonDate,
        time_local: show.time_local, // Use the stored time_local directly
        city: show.city,
        venue: show.venue,
        ticket_url: show.ticket_url || '',
        spotify_url: show.spotify_url || '',
        apple_music_url: show.apple_music_url || '',
        notes: show.notes || ''
      })
    }
  }, [show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!show) return

    // Validate required fields
    if (!formData.title || !formData.date_local || !formData.time_local || !formData.city || !formData.venue) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/shows/${show.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update show')
      }

      // Close modal and refresh
      onOpenChange(false)
      onShowUpdated()
    } catch (error) {
      console.error('Error updating show:', error)
      setError(error instanceof Error ? error.message : 'Failed to update show')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto h-[85vh] sm:h-[90vh] flex flex-col rounded-lg">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg">Edit Show</DialogTitle>
            <DialogDescription className="text-sm">
              Update the show details. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Show title"
                  className="w-full h-10 text-sm"
                  style={{ fontSize: '16px' }}
                  required
                />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-medium text-foreground">Date *</label>
                <Input
                  type="date"
                  value={formData.date_local}
                  onChange={(e) => handleChange('date_local', e.target.value)}
                  className="w-full h-10 text-sm"
                  style={{ fontSize: '16px' }}
                  required
                />
              </div>
              
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-medium text-foreground">Time *</label>
                <Select
                  value={formData.time_local}
                  onChange={(value) => handleChange('time_local', value)}
                >
                  <SelectTrigger>
                    {formData.time_local ? 
                      new Date(`2000-01-01T${formData.time_local}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }) : 
                      'Select time'
                    }
                  </SelectTrigger>
                  <SelectContent>
                    <SelectOption value="">Select time</SelectOption>
                    {Array.from({ length: 24 }, (_, index) => {
                      const hour = (15 + index) % 24;
                      const timeString = `${hour.toString().padStart(2, '0')}:00`;
                      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      });
                      return (
                        <SelectOption key={timeString} value={timeString}>
                          {displayTime}
                        </SelectOption>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Location *</label>
              <Input
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Location name"
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Venue *</label>
              <Input
                value={formData.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                placeholder="Venue name"
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ticket URL</label>
              <Input
                type="url"
                value={formData.ticket_url}
                onChange={(e) => handleChange('ticket_url', e.target.value)}
                placeholder="https://..."
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Spotify URL</label>
              <Input
                type="url"
                value={formData.spotify_url}
                onChange={(e) => handleChange('spotify_url', e.target.value)}
                placeholder="https://open.spotify.com/..."
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Apple Music URL</label>
              <Input
                type="url"
                value={formData.apple_music_url}
                onChange={(e) => handleChange('apple_music_url', e.target.value)}
                placeholder="https://music.apple.com/..."
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional information..."
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:text-foreground resize-none min-h-[60px]"
                rows={3}
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Saving...' : 'Update Show'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
