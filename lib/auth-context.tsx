'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { createClient } from './supabase'
import type { User } from '@supabase/supabase-js'
import { env } from './env'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshProfile: () => Promise<void>
  profileData: {
    id: string
    name: string
    email: string
    avatar_url?: string
  } | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // Return default values instead of throwing error during SSR or before context is ready
    console.warn('useAuth called outside of AuthProvider context')
    return {
      user: null,
      loading: true,
      signOut: async () => {},
      refreshUser: async () => {},
      refreshProfile: async () => {},
      profileData: null
    }
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<{
    id: string
    name: string
    email: string
    avatar_url?: string
  } | null>(null)

  const signOut = useCallback(async () => {
    try {
      if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Supabase environment variables not available for sign out')
        return
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Supabase environment variables not available for refresh user')
        return
      }
      const supabase = createClient()
      const { data: { user: refreshedUser } } = await supabase.auth.getUser()
      setUser(refreshedUser)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const profile = await response.json()
        setProfileData(profile)
      } else {
        console.error('Failed to refresh profile:', response.status)
      }
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async (): Promise<void> => {
      try {
        // Check if environment variables are available
        if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.error('Supabase environment variables not available')
          if (mounted) {
            setLoading(false)
          }
          return
        }

        const supabase = createClient()

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
          
          // Load profile data if user is authenticated
          if (session?.user) {
            try {
              const response = await fetch('/api/profile')
              if (response.ok) {
                const profile = await response.json()
                setProfileData(profile)
              }
            } catch (error) {
              console.error('Error loading initial profile:', error)
            }
          }
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (mounted) {
              setUser(session?.user ?? null)
              setLoading(false)
              
              // Only load profile data on sign in, not on every auth change
              if (session?.user && event === 'SIGNED_IN') {
                try {
                  const response = await fetch('/api/profile')
                  if (response.ok) {
                    const profile = await response.json()
                    setProfileData(profile)
                  }
                } catch (error) {
                  console.error('Error loading profile on auth change:', error)
                }
              } else if (!session?.user) {
                setProfileData(null)
              }
            }
          }
        )

        // Store subscription for cleanup
        subscription.unsubscribe()
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [])

  const value = {
    user,
    loading,
    signOut,
    refreshUser,
    refreshProfile,
    profileData
  }

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  )
}
