import { Card, CardContent } from '@/components/ui/card'

export function RSVPFilterSkeleton() {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
