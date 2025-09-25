'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
  onClose?: () => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ title, description, variant = 'default', onClose }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true)

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300)
      }, 5000)

      return () => clearTimeout(timer)
    }, [onClose])

    const handleClose = () => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 300)
    }

    const variantStyles = {
      default: 'bg-card border-border text-card-foreground',
      success: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/80 dark:border-green-600 dark:text-green-100',
      error: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/80 dark:border-red-600 dark:text-red-100',
      warning: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/80 dark:border-yellow-600 dark:text-yellow-100'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-lg border p-4 shadow-lg transition-all duration-300',
          variantStyles[variant],
          isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {title && (
              <div className="font-semibold text-sm mb-1">
                {title}
              </div>
            )}
            {description && (
              <div className="text-sm opacity-90">
                {description}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="ml-2 flex-shrink-0 rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }
)
Toast.displayName = 'Toast'

export { Toast }
