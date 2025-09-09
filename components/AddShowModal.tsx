'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AddShowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onShowAdded: () => void
}

export function AddShowModal({ open, onOpenChange, onShowAdded }: AddShowModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    date_local: '',
    time_local: '',
    city: 'Boston',
    venue: '',
    ticket_url: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (!formData.title || !formData.date_local || !formData.time_local || !formData.city || !formData.venue) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create show')
      }

      // Reset form and close modal
      setFormData({
        title: '',
        date_local: '',
        time_local: '',
        city: 'Boston',
        venue: '',
        ticket_url: '',
        notes: ''
      })
      onOpenChange(false)
      onShowAdded()
    } catch (error) {
      console.error('Error creating show:', error)
      setError(error instanceof Error ? error.message : 'Failed to create show')
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
            <DialogTitle className="text-lg">Add New Show</DialogTitle>
            <DialogDescription className="text-sm">
              Create a new show for the group. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Title *</label>
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
                <label className="text-sm font-medium text-gray-700">Date *</label>
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
                <label className="text-sm font-medium text-gray-700">Time *</label>
                <select
                  value={formData.time_local}
                  onChange={(e) => handleChange('time_local', e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md h-10 bg-white"
                  required
                >
                  <option value="">Select time</option>
                  {Array.from({ length: 24 }, (_, index) => {
                    const hour = (15 + index) % 24;
                    const timeString = `${hour.toString().padStart(2, '0')}:00`;
                    const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                    return (
                      <option key={timeString} value={timeString}>
                        {displayTime}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Location *</label>
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
              <label className="text-sm font-medium text-gray-700">Venue *</label>
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
              <label className="text-sm font-medium text-gray-700">Ticket URL</label>
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
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional information..."
                className="w-full px-3 py-2 text-sm border rounded-md resize-none min-h-[60px]"
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
              {saving ? 'Saving...' : 'Add Show'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
