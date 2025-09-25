'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  alt?: string
  size?: number
  className?: string
  fallbackIcon?: React.ReactNode
  onError?: () => void
}

// Global image loading state to prevent duplicate requests
const imageLoadingState = new Map<string, { loading: boolean; loaded: boolean; error: boolean }>()
// const imageListeners = new Map<string, Set<() => void>>()

// Function to notify all components listening to an image URL
// const notifyImageListeners = (src: string) => {
//   const listeners = imageListeners.get(src)
//   if (listeners) {
//     listeners.forEach(listener => listener())
//   }
// }

export function Avatar({ 
  src, 
  alt = 'Avatar', 
  size = 24, 
  className = '', 
  fallbackIcon,
  onError 
}: AvatarProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const imgRef = useRef<HTMLImageElement>(null)


  // Reset error state when src changes
  useEffect(() => {
    if (src) {
      setHasError(false)
      setIsLoading(true)
      
      // Check global loading state
      const cacheKey = src
      const globalState = imageLoadingState.get(cacheKey)
      
      if (globalState?.loaded) {
        setIsLoading(false)
        setHasError(false)
      } else if (globalState?.error) {
        setIsLoading(false)
        setHasError(true)
      } else if (globalState?.loading) {
        // Another component is already loading this image
        setIsLoading(true)
        setHasError(false)
      } else {
        // Mark as loading in global state
        imageLoadingState.set(cacheKey, { loading: true, loaded: false, error: false })
      }
    }
  }, [src])

  const handleError = () => {
    if (src) {
      // Update global state to error
      imageLoadingState.set(src, { loading: false, loaded: false, error: true })
    }
    
    setHasError(true)
    setIsLoading(false)
    onError?.()
  }

  const handleLoad = () => {
    if (src) {
      // Update global state to loaded
      imageLoadingState.set(src, { loading: false, loaded: true, error: false })
    }
    setIsLoading(false)
    setHasError(false)
  }

  if (!src || hasError) {
    return (
      <div 
        className={`w-${size} h-${size} rounded-full bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        {fallbackIcon || <User className="w-4 h-4 text-gray-400" />}
      </div>
    )
  }

  return (
    <div 
      className={`w-${size} h-${size} rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full" />
      )}
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        unoptimized={true}
        crossOrigin="anonymous"
        onError={handleError}
        onLoad={handleLoad}
        style={{ 
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out'
        }}
      />
    </div>
  )
}
