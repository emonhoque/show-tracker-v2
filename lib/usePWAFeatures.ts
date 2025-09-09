import { useEffect, useRef, useState } from 'react'

interface PullToRefreshState {
  isPulling: boolean
  pullDistance: number
  isRefreshing: boolean
}

export function usePWAFeatures() {
  const [isPWA, setIsPWA] = useState(false)
  const [pullToRefreshState, setPullToRefreshState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false
  })
  
  const touchStartY = useRef(0)
  const touchCurrentY = useRef(0)
  const pullThreshold = 80
  const maxPullDistance = 120

  // Detect if running as PWA
  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSPWA = (window.navigator as any).standalone === true
      const isAndroidPWA = window.matchMedia('(display-mode: standalone)').matches && 
                          /Android/i.test(navigator.userAgent)
      
      setIsPWA(isStandalone || isIOSPWA || isAndroidPWA)
    }

    checkPWA()
    window.addEventListener('resize', checkPWA)
    return () => window.removeEventListener('resize', checkPWA)
  }, [])

  // Handle pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isPWA || window.scrollY > 0) return
    
    touchStartY.current = e.touches[0].clientY
    setPullToRefreshState(prev => ({ ...prev, isPulling: true }))
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPWA || !pullToRefreshState.isPulling || window.scrollY > 0) return

    touchCurrentY.current = e.touches[0].clientY
    const pullDistance = Math.max(0, touchCurrentY.current - touchStartY.current)
    const limitedDistance = Math.min(pullDistance, maxPullDistance)
    
    setPullToRefreshState(prev => ({ 
      ...prev, 
      pullDistance: limitedDistance 
    }))

    // Prevent default scrolling when pulling
    if (pullDistance > 0) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = (onRefresh?: () => void) => {
    if (!isPWA || !pullToRefreshState.isPulling) return

    setPullToRefreshState(prev => ({ ...prev, isPulling: false }))

    if (pullToRefreshState.pullDistance >= pullThreshold && onRefresh) {
      setPullToRefreshState(prev => ({ ...prev, isRefreshing: true }))
      onRefresh()
      
      // Reset after refresh
      setTimeout(() => {
        setPullToRefreshState(prev => ({ 
          ...prev, 
          isRefreshing: false, 
          pullDistance: 0 
        }))
      }, 1000)
    } else {
      setPullToRefreshState(prev => ({ ...prev, pullDistance: 0 }))
    }
  }

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return {
    isPWA,
    pullToRefreshState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    scrollToTop
  }
}
