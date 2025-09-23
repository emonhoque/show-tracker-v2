'use client'

import dynamic from 'next/dynamic'
import { ReleaseCardSkeleton } from '@/components/ReleaseCardSkeleton'

// Dynamically import ReleasesFeed with loading fallback
const ReleasesFeed = dynamic(() => import('./ReleasesFeed'), {
  loading: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ReleaseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  ),
  ssr: false
})

export default ReleasesFeed
