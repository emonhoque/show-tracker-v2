'use client'

import { Button } from '@/components/ui/button'
import { getAllCategories, getCategoryColor, getCategoryIcon } from '@/lib/categories'

interface CategoryFilterProps {
  selectedCategories: Set<string>
  onCategoryToggle: (category: string) => void
  onClearAllCategories: () => void
  filteredShowsCount: number
  categoryStats?: Array<{ category: string; count: number }>
}

export function CategoryFilter({
  selectedCategories,
  onCategoryToggle,
  onClearAllCategories,
  filteredShowsCount,
  categoryStats = []
}: CategoryFilterProps) {
  const categories = getAllCategories()
  const hasFilters = !selectedCategories.has('all')

  // Create a map of category stats for quick lookup
  const statsMap = new Map(
    categoryStats.map(stat => [stat.category, stat.count])
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategories.has('all') ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryToggle('all')}
          className="text-sm"
        >
          All Categories
          {!hasFilters && (
            <span className="ml-2 text-xs opacity-75">({filteredShowsCount})</span>
          )}
        </Button>
        
        {categories.map((category) => {
          const isSelected = selectedCategories.has(category.value)
          const showCount = statsMap.get(category.value) || 0
          
          // Only show categories that have upcoming events
          if (showCount === 0) {
            return null
          }
          
          return (
            <Button
              key={category.value}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryToggle(category.value)}
              className={`text-sm ${isSelected ? getCategoryColor(category.value) : ''}`}
            >
              <span className="mr-1">{getCategoryIcon(category.value)}</span>
              {category.label}
              <span className="ml-2 text-xs opacity-75">({showCount})</span>
            </Button>
          )
        })}
      </div>
      
      {hasFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {filteredShowsCount} show{filteredShowsCount !== 1 ? 's' : ''}
            {selectedCategories.size > 1 && (
              <span> from {selectedCategories.size - 1} categor{selectedCategories.size > 2 ? 'ies' : 'y'}</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAllCategories}
            className="text-xs h-6 px-2"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
