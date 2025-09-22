'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { Show } from '@/lib/types'
import { CalendarExportModal } from '@/components/CalendarExportModal'

interface CalendarExportButtonProps {
  show: Show
  shareableUrl?: string
  className?: string
}

export function CalendarExportButton({ show, shareableUrl, className }: CalendarExportButtonProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2"
      >
        <Calendar className="h-4 w-4" />
        Add to Calendar
      </Button>
      
      <CalendarExportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        show={show}
        shareableUrl={shareableUrl}
      />
    </div>
  )
}
