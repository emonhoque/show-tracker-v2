'use client'

import { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

interface ShareableLayoutProps {
  children: ReactNode
  className?: string
}

export function ShareableLayout({ 
  children, 
  className = ''
}: ShareableLayoutProps) {
  return (
    <div className={`min-h-screen bg-background flex flex-col ${className}`}>
      <Header variant="default" />
      
      <main className="flex-1">
        {children}
      </main>
      
      <Footer variant="default" />
    </div>
  )
}
