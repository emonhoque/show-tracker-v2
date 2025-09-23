'use client'

import dynamic from 'next/dynamic'
import { Calendar } from 'lucide-react'

// Dynamically import CalendarExportButton with loading fallback
const CalendarExportButton = dynamic(() => import('./CalendarExportButton').then(mod => ({ default: mod.CalendarExportButton })), {
  loading: () => (
    <button 
      disabled
      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md opacity-50 cursor-not-allowed"
    >
      <Calendar className="h-4 w-4 mr-2" />
      Loading...
    </button>
  ),
  ssr: false
})

export default CalendarExportButton
