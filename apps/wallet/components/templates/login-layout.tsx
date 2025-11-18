'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { LoadingSpinner } from '@/components/atoms/loading-spinner'

interface LoginLayoutProps {
  children: React.ReactNode
}

export function LoginLayout({ children }: LoginLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingSpinner message="Loading..." />
  }

  // If authenticated, show loading while redirecting
  if (isAuthenticated) {
    return <LoadingSpinner message="Redirecting to dashboard..." />
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {children}
    </div>
  )
}