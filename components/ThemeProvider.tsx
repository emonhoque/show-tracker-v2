'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'dark' | 'light'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'light',
  setTheme: () => {},
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'show-tracker-theme',
}: ThemeProviderProps) {
  // Initialize theme from DOM class (set by the blocking script) or default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement
      if (root.classList.contains('dark')) return 'dark'
      if (root.classList.contains('light')) return 'light'
    }
    return defaultTheme
  })
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage on mount
  useEffect(() => {
    setMounted(true)
    
    try {
      const storedTheme = localStorage.getItem(storageKey) as Theme
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
        setThemeState(storedTheme)
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error)
    }
  }, [storageKey])

  // Update DOM classes when theme changes
  useEffect(() => {
    if (!mounted) return
    
    try {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(theme)
    } catch (error) {
      console.warn('Failed to update theme classes:', error)
    }
  }, [theme, mounted])

  // Memoized setTheme function to prevent unnecessary re-renders
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    if (mounted) {
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error)
      }
    }
  }, [mounted, storageKey])

  const value = {
    theme,
    setTheme,
  }

  return (
    <ThemeProviderContext value={value}>
      {children}
    </ThemeProviderContext>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    // Return default values instead of throwing error during SSR
    return {
      theme: 'light' as Theme,
      setTheme: () => {}
    }
  }

  return context
}
