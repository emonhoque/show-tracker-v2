'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const getIcon = () => {
    return theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
  }

  const getLabel = () => {
    return theme === 'light' ? 'Light' : 'Dark'
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="sm:px-3 px-2"
      title={`Current theme: ${getLabel()}. Click to toggle to ${theme === 'light' ? 'dark' : 'light'} mode.`}
    >
      {getIcon()}
      <span className="hidden sm:inline sm:ml-1">{getLabel()}</span>
    </Button>
  )
}
