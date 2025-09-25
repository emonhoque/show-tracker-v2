'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  className?: string
  onClick?: () => void
}

export function BackButton({ 
  variant = 'ghost', 
  className = 'mb-4',
  onClick 
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.back()
    }
  }

  return (
    <Button 
      variant={variant}
      onClick={handleClick}
      className={className}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  )
}
