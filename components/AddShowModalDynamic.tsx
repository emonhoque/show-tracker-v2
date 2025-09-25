'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const AddShowModal = dynamic(() => import('./AddShowModal').then(mod => ({ default: mod.AddShowModal })), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Loading form...</span>
    </div>
  ),
  ssr: false
})

export default AddShowModal
