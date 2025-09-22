'use client'

import { Button } from '@/components/ui/button'

export function CategoryFilterSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled className="text-sm">
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </Button>
        {Array.from({ length: 6 }).map((_, index) => (
          <Button key={index} variant="outline" size="sm" disabled className="text-sm">
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </Button>
        ))}
      </div>
    </div>
  )
}
