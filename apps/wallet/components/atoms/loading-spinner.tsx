'use client'

import { cn } from '@repo/ui/lib/utils'

interface LoadingSpinnerProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ 
  message = 'Loading...', 
  className,
  size = 'md'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={cn(
      "min-h-screen bg-background flex items-center justify-center",
      className
    )}>
      <div className="text-center space-y-4">
        <div className={cn(
          "animate-spin rounded-full border-b-2 border-primary mx-auto",
          sizeClasses[size]
        )}></div>
        <p className="text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  )
}
