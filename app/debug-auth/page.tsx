'use client'

import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugAuthPage() {
  const { user, loading } = useAuth()
  const [session, setSession] = useState<any>(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('🔍 Debug: Direct session check:', { session, error })
        setSession(session)
      } catch (error) {
        console.error('❌ Debug: Session check error:', error)
      } finally {
        setSessionLoading(false)
      }
    }

    getSession()
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth Debug Page</h1>
        
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">AuthContext State</h2>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
              <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'null'}</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Direct Session Check</h2>
            <div className="space-y-2">
              <p><strong>Session Loading:</strong> {sessionLoading ? 'true' : 'false'}</p>
              <p><strong>Session:</strong> {session ? JSON.stringify(session, null, 2) : 'null'}</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Reload Page
              </button>
              <button 
                onClick={() => window.location.href = '/signin'}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Go to Sign In
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
