'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const pathname = usePathname()
  
  // Generate breadcrumbs from pathname if no items provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    
    // Always start with home
    breadcrumbs.push({
      label: 'Home',
      href: '/home',
      icon: <Home className="h-4 w-4" />
    })
    
    let currentPath = ''
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      // Skip numeric IDs and public IDs in breadcrumbs for cleaner display
      if (segment.match(/^\d+$/) || segment.match(/^[a-zA-Z0-9_-]+$/)) {
        // This is likely an ID, try to get a better label
        if (segments[index - 1] === 'communities' && segment !== 'create') {
          breadcrumbs.push({
            label: 'Community',
            href: currentPath
          })
        } else if (segments[index - 1] === 'c' && segments[index + 1] === 'e') {
          breadcrumbs.push({
            label: 'Show',
            href: currentPath
          })
        } else if (segments[index - 1] === 'e') {
          // This is the public ID, don't add to breadcrumbs
          return
        } else if (segments[index - 1] === 'invite') {
          breadcrumbs.push({
            label: 'Invite',
            href: currentPath
          })
        } else if (segments[index - 1] === 'share') {
          breadcrumbs.push({
            label: 'Share',
            href: currentPath
          })
        } else {
          breadcrumbs.push({
            label: segment.charAt(0).toUpperCase() + segment.slice(1),
            href: currentPath
          })
        }
      } else {
        // Regular segment
        const label = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        
        breadcrumbs.push({
          label,
          href: currentPath
        })
      }
    })
    
    return breadcrumbs
  }
  
  const breadcrumbItems = items || generateBreadcrumbs()
  
  return (
    <nav className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`} aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
          )}
          
          {item.href && index < breadcrumbItems.length - 1 ? (
            <Link
              href={item.href}
              className="flex items-center space-x-1 hover:text-foreground transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className="flex items-center space-x-1 text-foreground">
              {item.icon}
              <span>{item.label}</span>
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
