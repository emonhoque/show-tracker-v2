import { Card, CardContent } from '@/components/ui/card'

export function ShowCardSkeleton() {
  return (
    <Card className="w-full mb-4">
      <CardContent className="p-4 space-y-3">
        {/* Header with Date/Time and Actions */}
        <div className="flex justify-between items-start">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Title, Venue, and Location */}
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>

        {/* RSVPs */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>

        {/* RSVP Buttons */}
        <div className="pt-2 border-t">
          <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <div className="h-8 bg-gray-200 rounded w-full sm:w-20 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-full sm:w-20 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-full sm:w-24 animate-pulse"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
