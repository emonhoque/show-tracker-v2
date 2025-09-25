'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CommunitySwitcher } from '@/components/CommunitySwitcher'
import { useAuth } from '@/lib/auth-context'
import { Community } from '@/lib/types'
import { 
  Plus, 
  LogOut, 
  Menu, 
  User, 
  Settings, 
  Music,
  Home
} from 'lucide-react'
import * as DropdownMenu from '@/components/ui/dropdown-menu'

interface HeaderProps {
  currentCommunity?: Community | null
  onCommunityChange?: (community: Community) => void
  showAddButton?: boolean
  onAddClick?: () => void
  variant?: 'default' | 'landing'
}

export function Header({ 
  currentCommunity, 
  onCommunityChange, 
  showAddButton = false,
  onAddClick,
  variant = 'default'
}: HeaderProps) {
  const { user, loading: authLoading, signOut, profileData, refreshProfile } = useAuth()
  const [userName, setUserName] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (user && !profileData && refreshProfile) {
      refreshProfile()
    }
  }, [user, profileData, refreshProfile])

  useEffect(() => {
    if (user) {
      const profileName = profileData?.name
      
      if (profileName) {
        setUserName(profileName)
      }
    } else {
      setUserName(null)
    }
  }, [user, profileData])

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (variant === 'landing') {
    return (
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Music className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Show Tracker</span>
            </Link>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button asChild variant="outline">
                <Link href="/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  if (!mounted || authLoading) {
    return (
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="animate-pulse flex justify-between items-center">
            <div className="h-8 w-32 bg-gray-200 rounded"></div>
            <div className="h-8 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </header>
    )
  }


  if (!user) {
    return (
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Show Tracker</span>
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button asChild variant="outline">
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-card shadow-sm border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/home" className="flex items-center space-x-2">
              <Music className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Show Tracker</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            {currentCommunity && onCommunityChange && (
              <CommunitySwitcher 
                currentCommunity={currentCommunity}
                onCommunityChange={onCommunityChange}
              />
            )}
          </div>
          
          <div className="flex gap-2">
            {/* Desktop buttons */}
            <div className="hidden sm:flex gap-2">
              {showAddButton && onAddClick && (
                <Button onClick={onAddClick} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
              <ThemeToggle />
              <DropdownMenu.DropdownMenu>
                <DropdownMenu.DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {profileData?.avatar_url || user.user_metadata?.['avatar_url'] ? (
                          <Image
                            src={profileData?.avatar_url || user.user_metadata['avatar_url'] || ''}
                            alt="Profile"
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                            unoptimized={true}
                            onError={(e) => {
                              console.error('Failed to load profile image:', e);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <User className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                       <span className="text-sm">
                         {userName || '...'}
                       </span>
                    </div>
                  </Button>
                </DropdownMenu.DropdownMenuTrigger>
                <DropdownMenu.DropdownMenuContent align="end" className="w-48 p-2">
                  <DropdownMenu.DropdownMenuItem onClick={() => router.push('/home')} className="py-3">
                    <Home className="mr-3 h-4 w-4" />
                    Home
                  </DropdownMenu.DropdownMenuItem>
                  <DropdownMenu.DropdownMenuItem onClick={() => router.push('/profile')} className="py-3">
                    <Settings className="mr-3 h-4 w-4" />
                    Profile Settings
                  </DropdownMenu.DropdownMenuItem>
                  <DropdownMenu.DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 py-3">
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </DropdownMenu.DropdownMenuItem>
                </DropdownMenu.DropdownMenuContent>
              </DropdownMenu.DropdownMenu>
            </div>
            
            {/* Mobile dropdown menu */}
            <div className="sm:hidden flex gap-2">
              {showAddButton && onAddClick && (
                <Button onClick={onAddClick} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
              <DropdownMenu.DropdownMenu>
                <DropdownMenu.DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    aria-label="Open menu"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenu.DropdownMenuTrigger>
                <DropdownMenu.DropdownMenuContent align="end" className="w-48 p-2">
                  <DropdownMenu.DropdownMenuItem onClick={() => router.push('/home')} className="py-3">
                    <Home className="mr-3 h-4 w-4" />
                    Home
                  </DropdownMenu.DropdownMenuItem>
                  <DropdownMenu.DropdownMenuItem onClick={() => router.push('/profile')} className="py-3">
                    <Settings className="mr-3 h-4 w-4" />
                    Profile Settings
                  </DropdownMenu.DropdownMenuItem>
                  <DropdownMenu.DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 py-3">
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </DropdownMenu.DropdownMenuItem>
                </DropdownMenu.DropdownMenuContent>
              </DropdownMenu.DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
