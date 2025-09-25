'use client'

import { useState } from 'react'
import Image from 'next/image'
import { 
  validateTitle, 
  validateVenue, 
  validateCity, 
  validateUrl, 
  validateNotes, 
  validateDate, 
  validateTime 
} from '@/lib/validation'
import { getAllCategories, getCategoryInfo } from '@/lib/categories'
import { createClient } from '@/lib/supabase'
import { ShowCategory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectContent, SelectOption } from '@/components/ui/select'
import { clientLogger } from '@/lib/client-logger'

interface AddShowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onShowAdded: () => void
  communityId?: string | null
}

export function AddShowModal({ open, onOpenChange, onShowAdded, communityId }: AddShowModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    date_local: '',
    time_local: '',
    city: '',
    venue: '',
    category: 'general',
    ticket_url: '',
    spotify_url: '',
    apple_music_url: '',
    poster_url: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
        'Cache-Control': 'max-age=300',
        ...options.headers,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const titleValidation = validateTitle(formData.title)
    if (!titleValidation.isValid) {
      setError(titleValidation.error!)
      return
    }

    const venueValidation = validateVenue(formData.venue)
    if (!venueValidation.isValid) {
      setError(venueValidation.error!)
      return
    }

    const cityValidation = validateCity(formData.city)
    if (!cityValidation.isValid) {
      setError(cityValidation.error!)
      return
    }

    const dateValidation = validateDate(formData.date_local)
    if (!dateValidation.isValid) {
      setError(dateValidation.error!)
      return
    }

    const timeValidation = validateTime(formData.time_local)
    if (!timeValidation.isValid) {
      setError(timeValidation.error!)
      return
    }

    const urlValidation = validateUrl(formData.ticket_url)
    if (!urlValidation.isValid) {
      setError(urlValidation.error!)
      return
    }

    const notesValidation = validateNotes(formData.notes)
    if (!notesValidation.isValid) {
      setError(notesValidation.error!)
      return
    }

    setSaving(true)
    try {
      let posterUrl = formData.poster_url
      if (selectedFile) {
        setUploading(true)
        const uploadFormData = new FormData()
        uploadFormData.append('file', selectedFile)
        
        const uploadResponse = await fetch('/api/upload-poster', {
          method: 'POST',
          body: uploadFormData
        })
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Failed to upload poster')
        }
        
        const uploadData = await uploadResponse.json()
        posterUrl = uploadData.url
        setUploading(false)
      }

      clientLogger.debug('Submitting show', { communityId })
      const response = await authenticatedFetch('/api/shows', {
        method: 'POST',
        body: JSON.stringify({ ...formData, poster_url: posterUrl, community_id: communityId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create show')
      }

      setFormData({
        title: '',
        date_local: '',
        time_local: '',
        city: '',
        venue: '',
        category: 'general',
        ticket_url: '',
        spotify_url: '',
        apple_music_url: '',
        poster_url: '',
        notes: ''
      })
      setSelectedFile(null)
      setPreviewUrl(null)
      onOpenChange(false)
      onShowAdded()
    } catch (error) {
      clientLogger.error('Error creating show', { error })
      setError(error instanceof Error ? error.message : 'Failed to create show')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.')
        return
      }

      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        setError('File too large. Maximum size is 10MB.')
        return
      }

      setSelectedFile(file)
      setError('')
      
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setFormData(prev => ({ ...prev, poster_url: '' }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          setError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.')
          return
        }

        const maxSize = 10 * 1024 * 1024  
        if (file.size > maxSize) {
          setError('File too large. Maximum size is 10MB.')
          return
        }

        setSelectedFile(file)
        setError('')
        
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg mx-auto h-[85vh] sm:h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg">Add New Show</DialogTitle>
            <DialogDescription className="text-sm">
              Create a new show for the group. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-6 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="space-y-2">
              <label htmlFor="show-title" className="text-sm font-medium text-foreground">Title *</label>
                <Input
                  id="show-title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Show title"
                  className="w-full h-10 text-base"
                  required
                  aria-describedby="title-required"
                />
                <div id="title-required" className="sr-only">Title is required</div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              <div className="space-y-2 min-w-0">
                <label htmlFor="show-date" className="text-sm font-medium text-foreground">Date *</label>
                <Input
                  id="show-date"
                  type="date"
                  value={formData.date_local}
                  onChange={(e) => handleChange('date_local', e.target.value)}
                  className="w-full h-10 text-base"
                  required
                  aria-describedby="date-required"
                />
                <div id="date-required" className="sr-only">Date is required</div>
              </div>
              
              <div className="space-y-2 min-w-0">
                <label htmlFor="show-time" className="text-sm font-medium text-foreground">Time *</label>
                <Select
                  value={formData.time_local}
                  onChange={(value) => handleChange('time_local', value)}
                >
                  <SelectTrigger id="show-time" aria-describedby="time-required">
                    {formData.time_local ? 
                      new Date(`2000-01-01T${formData.time_local}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }) : 
                      'Select time'
                    }
                  </SelectTrigger>
                  <div id="time-required" className="sr-only">Time is required</div>
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
              <label htmlFor="show-location" className="text-sm font-medium text-foreground">Location *</label>
              <Input
                id="show-location"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Location name"
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
                required
                aria-describedby="location-required"
              />
              <div id="location-required" className="sr-only">Location is required</div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="show-venue" className="text-sm font-medium text-foreground">Venue *</label>
              <Input
                id="show-venue"
                value={formData.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                placeholder="Venue name"
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
                required
                aria-describedby="venue-required"
              />
              <div id="venue-required" className="sr-only">Venue is required</div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="show-category" className="text-sm font-medium text-foreground">Category</label>
              <Select
                value={formData.category}
                onChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger id="show-category" aria-label="Select category">
                  {getCategoryInfo(formData.category as ShowCategory).label}
                </SelectTrigger>
                <SelectContent>
                  {getAllCategories().map((category) => (
                    <SelectOption key={category.value} value={category.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{category.label}</span>
                        <span className="text-xs text-muted-foreground">{category.description}</span>
                      </div>
                    </SelectOption>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="show-ticket-url" className="text-sm font-medium text-foreground">Ticket URL</label>
              <Input
                id="show-ticket-url"
                type="url"
                value={formData.ticket_url}
                onChange={(e) => handleChange('ticket_url', e.target.value)}
                placeholder="https://..."
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
                aria-describedby="ticket-url-help"
              />
              <div id="ticket-url-help" className="sr-only">Optional ticket purchase URL</div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="show-spotify-url" className="text-sm font-medium text-foreground">Spotify URL</label>
              <Input
                id="show-spotify-url"
                type="url"
                value={formData.spotify_url}
                onChange={(e) => handleChange('spotify_url', e.target.value)}
                placeholder="https://open.spotify.com/..."
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
                aria-describedby="spotify-url-help"
              />
              <div id="spotify-url-help" className="sr-only">Optional Spotify URL for the artist</div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="show-apple-music-url" className="text-sm font-medium text-foreground">Apple Music URL</label>
              <Input
                id="show-apple-music-url"
                type="url"
                value={formData.apple_music_url}
                onChange={(e) => handleChange('apple_music_url', e.target.value)}
                placeholder="https://music.apple.com/..."
                className="w-full h-10 text-sm"
                style={{ fontSize: '16px' }}
                aria-describedby="apple-music-url-help"
              />
              <div id="apple-music-url-help" className="sr-only">Optional Apple Music URL for the artist</div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="poster-upload" className="text-sm font-medium text-foreground">Poster Image</label>
              {!selectedFile && !previewUrl ? (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('poster-upload')?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload poster image"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      document.getElementById('poster-upload')?.click()
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="poster-upload"
                    aria-describedby="poster-upload-help"
                  />
                  <div className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">
                    Click to upload or drag and drop poster image
                    <br />
                    <span className="text-xs text-gray-400 dark:text-gray-400">JPEG, PNG, WebP (max 10MB)</span>
                  </div>
                  <div id="poster-upload-help" className="sr-only">Upload a poster image for the show. Supported formats: JPEG, PNG, WebP. Maximum size: 10MB.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {previewUrl && (
                    <div className="relative">
                      <Image
                        src={previewUrl}
                        alt="Poster preview"
                        width={400}
                        height={128}
                        className="w-full max-h-32 object-contain rounded-lg bg-gray-50 dark:bg-gray-800"
                      />
                      <button
                        type="button"
                        onClick={removeFile}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="poster-upload-new"
                    />
                    <label
                      htmlFor="poster-upload-new"
                      className="flex-1 text-center py-2 px-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded text-sm cursor-pointer transition-colors"
                    >
                      Change Image
                    </label>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="show-notes" className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                id="show-notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional information..."
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:text-foreground resize-none min-h-[60px]"
                rows={3}
                aria-describedby="notes-help"
              />
              <div id="notes-help" className="sr-only">Optional additional information about the show</div>
            </div>
            
            {error && (
              <p className="text-sm text-destructive" role="alert" aria-live="polite">{error}</p>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="w-full sm:w-auto"
              aria-label="Cancel and close dialog"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving || uploading} 
              className="w-full sm:w-auto"
              aria-label={uploading ? 'Uploading poster image' : saving ? 'Saving show' : 'Add new show'}
            >
              {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Add Show'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
