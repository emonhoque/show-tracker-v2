'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

interface GroupInfo {
  id: string
  name: string
  numeric_id: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const pathname = usePathname()
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  
  // Fetch group info when we detect a numeric ID in the groups path
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean)
    const groupsIndex = segments.findIndex(segment => segment === 'groups')
    
    if (groupsIndex !== -1 && segments[groupsIndex + 1] && segments[groupsIndex + 1]!.match(/^\d+$/)) {
      const numericId = segments[groupsIndex + 1]!
      fetchGroupInfo(numericId)
    }
  }, [pathname])

  const fetchGroupInfo = async (numericId: string) => {
    try {
      // Get the current session to include the auth token
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return
      
      // Get user's communities to find the one with matching numeric_id
      const response = await fetch('/api/communities', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.communities) {
        const foundCommunity = data.communities.find(
          (c: any) => c.community_numeric_id === numericId
        )
        
        if (foundCommunity) {
          setGroupInfo({
            id: foundCommunity.community_id,
            name: foundCommunity.community_name,
            numeric_id: foundCommunity.community_numeric_id
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch group info:', error)
    }
  }
  
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
        } else if (segments[index - 1] === 'groups' && segment.match(/^\d+$/)) {
          // Handle group numeric ID - use group name if available
          if (groupInfo && groupInfo.numeric_id === segment) {
            // Truncate long group names
            const displayName = groupInfo.name.length > 20 
              ? 'Group' 
              : groupInfo.name
            breadcrumbs.push({
              label: displayName,
              href: currentPath
            })
          } else {
            // Fallback while loading or if not found
            breadcrumbs.push({
              label: 'Group',
              href: currentPath
            })
          }
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
