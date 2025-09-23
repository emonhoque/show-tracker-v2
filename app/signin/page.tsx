import { Suspense } from 'react'
import { GoogleAuthGate } from '@/components/GoogleAuthGate'

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <GoogleAuthGate />
    </Suspense>
  )
}
