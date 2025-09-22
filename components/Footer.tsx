'use client'

import Link from 'next/link'
import { Music, Github, Mail, Heart } from 'lucide-react'

interface FooterProps {
  variant?: 'default' | 'landing'
}

export function Footer({ variant = 'default' }: FooterProps) {
  const currentYear = new Date().getFullYear()

  if (variant === 'landing') {
    return (
      <footer className="bg-muted/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Music className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">Show Tracker</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {currentYear} Show Tracker. Built for music communities everywhere.
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-card border-t border-border py-8 mt-auto">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">Show Tracker</span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <Link 
              href="/home" 
              className="hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link 
              href="/profile" 
              className="hover:text-foreground transition-colors"
            >
              Profile
            </Link>
            <Link 
              href="/communities" 
              className="hover:text-foreground transition-colors"
            >
              Communities
            </Link>
          </div>
          
          <div className="text-xs text-muted-foreground">
            © {currentYear} Show Tracker
          </div>
        </div>
      </div>
    </footer>
  )
}
