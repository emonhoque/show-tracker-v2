'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface LeaveCommunityDialogProps {
  isOpen: boolean
  onClose: () => void
  communityId: string
  communityName: string
  userRole: 'admin' | 'member'
  onSuccess?: () => void
}

export function LeaveCommunityDialog({
  isOpen,
  onClose,
  communityId,
  communityName,
  userRole,
  onSuccess
}: LeaveCommunityDialogProps) {
  const [isLeaving, setIsLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  console.log('LeaveCommunityDialog rendered:', { isOpen, communityName, userRole })

  const handleLeave = async () => {
    try {
      setIsLeaving(true)
      setError(null)

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to leave a group')
        return
      }

      const response = await fetch(`/api/communities/${communityId}/members?userId=${session.user.id}&leave=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Clear the selected community from localStorage
        localStorage.removeItem('selectedCommunityId')
        
        // Call success callback if provided
        onSuccess?.()
        
        // Close dialog
        onClose()
        
        // Redirect to groups page
        router.push('/groups')
      } else {
        setError(data.error || 'Failed to leave group')
      }
    } catch (err) {
      console.error('Failed to leave community:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLeaving(false)
    }
  }

  const handleClose = () => {
    if (!isLeaving) {
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Leave Group</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to leave <strong>{communityName}</strong>?
            <div className="mt-2 text-sm text-gray-600">
              <p>⚠️ <strong>Important:</strong> This will remove all your RSVPs from events in this group.</p>
            </div>
            {userRole === 'admin' && (
              <span className="block mt-2 text-sm text-orange-600">
                ⚠️ As an admin, you&apos;ll need to transfer ownership or promote another member to admin before leaving.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLeaving}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={isLeaving}
            className="w-full sm:w-auto"
          >
            {isLeaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Leaving...
              </>
            ) : (
              'Leave Group'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
