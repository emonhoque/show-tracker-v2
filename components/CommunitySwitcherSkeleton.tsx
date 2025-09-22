'use client'

import { Button } from '@/components/ui/button'

export function CommunitySwitcherSkeleton() {
  return (
    <div className="flex items-center space-x-2">
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>
  )
}
