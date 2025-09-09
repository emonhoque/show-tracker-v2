'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  showTitle: string
  onConfirm: () => void
  loading?: boolean
}

export function DeleteConfirmDialog({ 
  open, 
  onOpenChange, 
  showTitle, 
  onConfirm, 
  loading = false 
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <DialogTitle>Delete Show</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete <strong>&ldquo;{showTitle}&rdquo;</strong>? 
            This action cannot be undone and will also delete all RSVPs for this show.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? 'Deleting...' : 'Delete Show'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
