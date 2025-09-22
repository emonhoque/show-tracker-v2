'use client'

import { Card, CardContent } from '@/components/ui/card'

export function ShowDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button Skeleton */}
      <div className="mb-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
      </div>

      <Card className="w-full">
        <CardContent className="p-6 space-y-6">
          {/* Header with Title and Share Button */}
          <div className="flex justify-between items-start">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Poster Image Skeleton */}
          <div className="w-full">
            <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>

          {/* Show Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date and Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
              </div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
            </div>

            {/* Venue and Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
              </div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
            </div>
          </div>

          {/* Notes Skeleton */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex flex-wrap gap-3">
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* RSVPs Skeleton */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/5 animate-pulse"></div>
            </div>
          </div>

          {/* RSVP Buttons Skeleton */}
          <div className="pt-4 border-t border-border">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3 animate-pulse"></div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-20 animate-pulse"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-20 animate-pulse"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-24 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
