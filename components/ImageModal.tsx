'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { X } from 'lucide-react'

interface ImageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt: string
}

export function ImageModal({ open, onOpenChange, src, alt }: ImageModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 bg-transparent border-0 shadow-none"
        showCloseButton={false}
        onPointerDownOutside={(e) => {
          // Allow clicking outside to close
          e.preventDefault()
          onOpenChange(false)
        }}
      >
        <DialogTitle className="sr-only">
          {alt} - Click outside or press escape to close
        </DialogTitle>
        <DialogDescription className="sr-only">
          Image viewer for {alt}. Use the close button or press escape to close this modal.
        </DialogDescription>
        <div 
          className="relative w-full h-full flex items-center justify-center"
          onClick={() => onOpenChange(false)}
        >
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            aria-label="Close image"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Image */}
          <Image
            src={src}
            alt={alt}
            width={800}
            height={600}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
