'use client'

import { usePWAFeatures } from '@/lib/usePWAFeatures'
import { ArrowUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PWAFeaturesProps {
  onRefresh?: () => void
}

export function PWAFeatures({ onRefresh }: PWAFeaturesProps) {
  const {
    isPWA,
    pullToRefreshState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    scrollToTop
  } = usePWAFeatures()

  if (!isPWA) return null

  return (
    <>
      {/* Pull to refresh indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200"
        style={{
          transform: `translateY(${Math.max(0, pullToRefreshState.pullDistance - 60)}px)`,
          opacity: pullToRefreshState.pullDistance > 20 ? 1 : 0
        }}
      >
        <div className="bg-white rounded-full p-3 shadow-lg border">
          <RefreshCw 
            className={`w-6 h-6 text-gray-600 transition-transform duration-200 ${
              pullToRefreshState.isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${pullToRefreshState.pullDistance * 2}deg)`
            }}
          />
        </div>
      </div>

      {/* Scroll to top button */}
      <Button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-40 rounded-full w-12 h-12 p-0 shadow-lg"
        size="sm"
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-5 h-5" />
      </Button>

      {/* Touch handlers for pull to refresh */}
      <div
        className="fixed inset-0 pointer-events-none z-30"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => handleTouchEnd(onRefresh)}
      />
    </>
  )
}
