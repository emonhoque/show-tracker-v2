/**
 * Dynamic import utilities for better code splitting
 */

import dynamic from 'next/dynamic'
import React from 'react'

const ReleasesFeedSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  </div>
)

const AddShowModalSkeleton = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    <span className="ml-2">Loading form...</span>
  </div>
)

const CalendarExportButtonSkeleton = () => (
  <button 
    disabled
    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md opacity-50 cursor-not-allowed"
  >
    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
    Loading...
  </button>
)

export const LazyReleasesFeed = dynamic(() => import('@/components/ReleasesFeed'), {
  loading: () => <ReleasesFeedSkeleton />,
  ssr: false
})

export const LazyAddShowModal = dynamic(() => import('@/components/AddShowModal').then(mod => ({ default: mod.AddShowModal })), {
  loading: () => <AddShowModalSkeleton />,
  ssr: false
})

export const LazyCalendarExportButton = dynamic(() => import('@/components/CalendarExportButton').then(mod => ({ default: mod.CalendarExportButton })), {
  loading: () => <CalendarExportButtonSkeleton />,
  ssr: false
})

export const lazyLoadUtility = <T extends React.ComponentType>(
  importFn: () => Promise<T>,
  fallback?: React.ComponentType
) => {
  return dynamic(importFn, {
    loading: fallback ? () => React.createElement(fallback) : undefined,
    ssr: false
  })
}

export const preloadComponents = () => {
  if (typeof window !== 'undefined') {
    import('@/components/AddShowModal')
    import('@/components/ReleasesFeed')
    import('@/components/CalendarExportButton')
  }
}
