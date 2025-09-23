'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Filter, ChevronDown, Users, Plus } from 'lucide-react'
import { CategoryFilter } from '@/components/CategoryFilter'

interface RSVPFilterProps {
  selectedStatusFilters: Set<string>
  selectedCategoryFilters: Set<string>
  onStatusFilterToggle: (filter: string) => void
  onCategoryFilterToggle: (category: string) => void
  filteredShowsCount: number
  onClearAllFilters: () => void
  categoryStats?: Array<{ category: string; count: number }>
  hasCommunities?: boolean
}

export function RSVPFilter({
  selectedStatusFilters,
  selectedCategoryFilters,
  onStatusFilterToggle,
  onCategoryFilterToggle,
  filteredShowsCount,
  onClearAllFilters,
  categoryStats = [],
  hasCommunities = true
}: RSVPFilterProps) {
  const [filtersCollapsed, setFiltersCollapsed] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined)

  // Measure content height when component mounts or when filters change
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight
      setContentHeight(height)
    }
  }, [selectedStatusFilters, selectedCategoryFilters])

  const handleToggle = () => {
    if (isAnimating) return
    
    setIsAnimating(true)
    setFiltersCollapsed(!filtersCollapsed)
    
    // Reset animation state after transition completes
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  // If user has no communities, show community action buttons instead of filters
  if (!hasCommunities) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <Users className="w-12 h-12 text-muted-foreground mx-auto" />
              <h2 className="text-lg font-semibold text-foreground">No Communities Yet</h2>
              <p className="text-sm text-muted-foreground">
                Join a community to start tracking shows, or create your own to get started.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => window.location.href = '/groups'}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Browse Communities
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/groups/create'}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Community
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className={filtersCollapsed ? "p-2 sm:p-3" : "p-3 sm:p-4"}>
        <div className={filtersCollapsed ? "space-y-0" : "space-y-2 sm:space-y-3"}>
          {/* Compact header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <h2 className="text-sm sm:text-base font-semibold text-foreground">Filter Shows</h2>
            </div>
            
            <button
              onClick={handleToggle}
              disabled={isAnimating}
              className="flex items-center justify-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50 disabled:opacity-50 min-h-[32px] sm:min-h-[36px]"
            >
              <span className="text-xs sm:text-sm">
                {filtersCollapsed ? 'Show Filters' : 'Hide Filters'}
              </span>
              <div className={`transition-transform duration-300 ${filtersCollapsed ? 'rotate-0' : 'rotate-180'}`}>
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
            </button>
          </div>
          
          <div
            ref={contentRef}
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              filtersCollapsed 
                ? 'max-h-0 opacity-0' 
                : 'max-h-[1000px] opacity-100'
            }`}
            style={{
              maxHeight: filtersCollapsed ? '0px' : contentHeight ? `${contentHeight}px` : 'none'
            }}
          >
            <div className="space-y-2 sm:space-y-3 pt-2">
              {/* Category Filter */}
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium text-foreground">Categories:</span>
                  {!selectedCategoryFilters.has('all') && selectedCategoryFilters.size > 0 && (
                    <span className="text-xs text-primary">
                      ({selectedCategoryFilters.size})
                    </span>
                  )}
                </div>
                
                <CategoryFilter
                  selectedCategories={selectedCategoryFilters}
                  onCategoryToggle={onCategoryFilterToggle}
                  onClearAllCategories={() => onCategoryFilterToggle('all')}
                  filteredShowsCount={filteredShowsCount}
                  categoryStats={categoryStats}
                />
              </div>

              {/* RSVP Status Filters */}
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium text-foreground">Status:</span>
                  {!selectedStatusFilters.has('all') && selectedStatusFilters.size > 0 && (
                    <span className="text-xs text-primary">
                      ({selectedStatusFilters.size})
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1 sm:gap-2">
                  <Button
                    variant={selectedStatusFilters.has('all') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onStatusFilterToggle('all')}
                    className="h-7 sm:h-9 text-xs sm:text-sm px-2 transition-all duration-200 hover:scale-105"
                  >
                    All
                  </Button>
                  
                  <Button
                    variant={selectedStatusFilters.has('going') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onStatusFilterToggle('going')}
                    className="h-7 sm:h-9 text-xs sm:text-sm px-2 transition-all duration-200 hover:scale-105"
                  >
                    Going
                  </Button>
                  
                  <Button
                    variant={selectedStatusFilters.has('maybe') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onStatusFilterToggle('maybe')}
                    className="h-7 sm:h-9 text-xs sm:text-sm px-2 transition-all duration-200 hover:scale-105"
                  >
                    Maybe
                  </Button>
                  
                  <Button
                    variant={selectedStatusFilters.has('not_going') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onStatusFilterToggle('not_going')}
                    className="h-7 sm:h-9 text-xs sm:text-sm px-2 transition-all duration-200 hover:scale-105"
                  >
                    Not Going
                  </Button>
                </div>
              </div>

            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-between">
              <span>
                {filteredShowsCount} show{filteredShowsCount !== 1 ? 's' : ''} found
                {(!selectedStatusFilters.has('all') || !selectedCategoryFilters.has('all')) && (
                  <span className="ml-1 text-primary">
                    <span className="hidden sm:inline">(Categories: {selectedCategoryFilters.has('all') ? 'All' : selectedCategoryFilters.size} | Status: {selectedStatusFilters.has('all') ? 'All' : selectedStatusFilters.size})</span>
                    <span className="sm:hidden">(C:{selectedCategoryFilters.has('all') ? 'All' : selectedCategoryFilters.size} S:{selectedStatusFilters.has('all') ? 'All' : selectedStatusFilters.size})</span>
                  </span>
                )}
              </span>
              
              {(!selectedStatusFilters.has('all') || !selectedCategoryFilters.has('all')) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAllFilters}
                  className="text-xs sm:text-sm text-muted-foreground hover:text-foreground h-6 sm:h-8 px-2"
                >
                  <span className="hidden sm:inline">Clear All</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
