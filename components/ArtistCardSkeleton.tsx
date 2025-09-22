'use client'

import { Card, CardContent } from '@/components/ui/card'

export function ArtistCardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Artist Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="flex-1 min-w-0">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-1"></div>
              <div className="flex flex-wrap gap-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Genres */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
