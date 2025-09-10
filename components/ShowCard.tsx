'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Show, RSVPSummary } from '@/lib/types'
import { formatUserTime } from '@/lib/time'
import { formatNameForDisplay } from '@/lib/validation'
import { ExternalLink, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface ShowCardProps {
  show: Show
  isPast: boolean
  rsvps: RSVPSummary
  onEdit?: (show: Show) => void
  onDelete?: (showId: string) => void
  onRSVPUpdate?: () => void
}

export function ShowCard({ show, isPast, rsvps, onEdit, onDelete, onRSVPUpdate }: ShowCardProps) {
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)

  // Get userName from localStorage on client side
  useEffect(() => {
    setUserName(localStorage.getItem('userName'))
  }, [])

  const handleRSVP = async (status: 'going' | 'maybe' | 'not_going' | null) => {
    if (!userName || loading) return

    setLoading(true)
    
    // Optimistic update - immediately update the UI
    if (onRSVPUpdate) {
      onRSVPUpdate()
    }
    
    try {
      if (status) {
        // Add or update RSVP
        const response = await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            show_id: show.id,
            name: userName,
            status
          })
        })

        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to save RSVP')
          // Refresh RSVPs to revert optimistic update
          if (onRSVPUpdate) {
            onRSVPUpdate()
          }
          return
        }
      } else {
        // Remove RSVP completely
        const response = await fetch('/api/rsvp/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            show_id: show.id,
            name: userName
          })
        })

        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to remove RSVP')
          // Refresh RSVPs to revert optimistic update
          if (onRSVPUpdate) {
            onRSVPUpdate()
          }
          return
        }
      }
    } catch (error) {
      console.error('Error saving RSVP:', error)
      alert('Failed to save RSVP')
      // Refresh RSVPs to revert optimistic update
      if (onRSVPUpdate) {
        onRSVPUpdate()
      }
    } finally {
      setLoading(false)
    }
  }

  const userStatus = userName && rsvps
    ? rsvps.going?.includes(userName.toLowerCase())
      ? 'going'
      : rsvps.maybe?.includes(userName.toLowerCase())
      ? 'maybe'
      : rsvps.not_going?.includes(userName.toLowerCase())
      ? 'not_going'
      : null
    : null

  return (
    <Card className="w-full mb-4">
      <CardContent className="p-4 space-y-3">
        {/* Header with Date/Time and Actions */}
        <div className="flex justify-between items-start">
          <div className="text-lg font-semibold text-gray-900">
            {formatUserTime(show.date_time, show.time_local)}
          </div>
          {(onEdit || onDelete) && !isPast && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(show)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(show.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Title, Venue, and Location */}
        <div>
          <h3 className="text-xl font-bold">{show.title}</h3>
          <p className="text-gray-600">{show.venue}, {show.city}</p>
          {show.notes && (
            <p className="text-sm text-gray-500 italic mt-1">{show.notes}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {show.ticket_url && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={show.ticket_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" />
                Ticket
              </a>
            </Button>
          )}
        </div>

        {/* RSVPs */}
        <div className="space-y-2 text-sm">
          {rsvps?.going?.length > 0 && (
            <div>
              <span className="font-semibold">{isPast ? 'Went:' : 'Going:'}</span> {rsvps.going.map(formatNameForDisplay).join(', ')}
            </div>
          )}
          {rsvps?.maybe?.length > 0 && (
            <div>
              <span className="font-semibold">Maybe:</span> {rsvps.maybe.map(formatNameForDisplay).join(', ')}
            </div>
          )}
          {rsvps?.not_going?.length > 0 && (
            <div>
              <span className="font-semibold">{isPast ? "Didn't Go:" : 'Not Going:'}</span> {rsvps.not_going.map(formatNameForDisplay).join(', ')}
            </div>
          )}
        </div>

        {/* RSVP Buttons (only for upcoming shows) */}
        {!isPast && userName && (
          <div className="pt-2 border-t">
            <div className="text-sm text-gray-600 mb-2">Your RSVP:</div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <Button
                size="sm"
                variant={userStatus === 'going' ? 'default' : 'outline'}
                onClick={() => handleRSVP(userStatus === 'going' ? null : 'going')}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Going
              </Button>
              <Button
                size="sm"
                variant={userStatus === 'maybe' ? 'default' : 'outline'}
                onClick={() => handleRSVP(userStatus === 'maybe' ? null : 'maybe')}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Maybe
              </Button>
              <Button
                size="sm"
                variant={userStatus === 'not_going' ? 'default' : 'outline'}
                onClick={() => handleRSVP(userStatus === 'not_going' ? null : 'not_going')}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Not Going
              </Button>
              {userStatus && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRSVP(null)}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Attendance Button (only for past shows) */}
        {isPast && userName && (
          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <Button
                size="sm"
                variant={userStatus === 'going' ? 'default' : 'outline'}
                onClick={() => handleRSVP(userStatus === 'going' ? null : 'going')}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {userStatus === 'going' ? 'I was there!' : 'I was there!'}
              </Button>
              {userStatus === 'going' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRSVP(null)}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
