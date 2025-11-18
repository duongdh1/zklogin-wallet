'use client'

import { useState } from 'react'
import { PinInput } from '@/components/molecules/pin-input'
import { Shield } from 'lucide-react'

interface TransactionSaltFormProps {
  onPinComplete: (pin: string) => void
  onCancel: () => void
  isLoading?: boolean
  disabled?: boolean
  transactionDetails?: {
    token: string
    amount: string
    recipient: string
  } | null
}

export function TransactionSaltForm({ 
  onPinComplete, 
  onCancel,
  isLoading = false,
  disabled = false,
  transactionDetails
}: TransactionSaltFormProps) {
  const [pinError, setPinError] = useState('')
  const [clearTrigger, setClearTrigger] = useState(0)

  const handlePinComplete = (pin: string) => {
    setPinError('')
    onPinComplete(pin)
  }

  const handlePinError = (errorMessage: string) => {
    setPinError(errorMessage)
    setClearTrigger(prev => prev + 1)
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter your 6-digit PIN to authorize this transaction.
        </p>
      </div>
      
      {pinError && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-xs">!</span>
          </div>
          {pinError}
        </div>
      )}
      
      <form onSubmit={(e) => e.preventDefault()}>
        <PinInput
          onComplete={handlePinComplete}
          onError={handlePinError}
          clearTrigger={clearTrigger}
          disabled={disabled || isLoading}
        />
      </form>
    </div>
  )
}
