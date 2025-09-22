'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { createClient } from './supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshProfile: () => Promise<void>
  profileData: any
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
  const [profileData, setProfileData] = useState<any>(null)

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
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

    const initializeAuth = async () => {
      try {
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
          async (_event, session) => {
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
                  console.error('Error loading profile on auth change:', error)
                }
              } else {
                setProfileData(null)
              }
            }
          }
        )

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    const cleanup = initializeAuth()

    return () => {
      mounted = false
      cleanup.then(cleanupFn => cleanupFn?.())
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
