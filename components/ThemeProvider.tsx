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
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    try {
      const storedTheme = localStorage.getItem(storageKey) as Theme
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
        setThemeState(storedTheme)
      } else {
        // Check if the document already has a theme class set by the script in layout.tsx
        const root = window.document.documentElement
        if (root.classList.contains('dark')) {
          setThemeState('dark')
        } else if (root.classList.contains('light')) {
          setThemeState('light')
        }
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error)
    }
  }, [storageKey])

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
    theme: mounted ? theme : defaultTheme, // Always return defaultTheme until mounted
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
    return {
      theme: 'light' as Theme,
      setTheme: () => {}
    }
  }

  return context
}
