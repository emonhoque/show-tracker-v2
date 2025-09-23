'use client'

import { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CommunitySwitcher } from '@/components/CommunitySwitcher'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Community } from '@/lib/types'

interface LayoutProps {
  children: ReactNode
  currentCommunity?: Community | null
  onCommunityChange?: (community: Community) => void
  showAddButton?: boolean
  onAddClick?: () => void
  variant?: 'default' | 'landing'
  className?: string
  showBreadcrumbs?: boolean
}

export function Layout({ 
  children, 
  currentCommunity, 
  onCommunityChange, 
  showAddButton = false,
  onAddClick,
  variant = 'default',
  className = '',
  showBreadcrumbs = true
}: LayoutProps) {
  return (
    <div className={`min-h-screen bg-background flex flex-col ${className}`}>
      <Header
        showAddButton={showAddButton}
        onAddClick={onAddClick}
        variant={variant}
      />
      
      {/* Community Selector - only show if not landing page and community exists */}
      {variant !== 'landing' && currentCommunity && onCommunityChange && (
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-muted-foreground">
                Group:
              </label>
              <CommunitySwitcher 
                currentCommunity={currentCommunity}
                onCommunityChange={onCommunityChange}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Breadcrumbs - only show if not landing page and showBreadcrumbs is true */}
      {variant !== 'landing' && showBreadcrumbs && (
        <div className="bg-background border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <Breadcrumb />
          </div>
        </div>
      )}
      
      <main className="flex-1">
        {children}
      </main>
      
      <Footer variant={variant} />
    </div>
  )
}
