'use client'

import { useState } from 'react'
import { AlertCircle, Shield, Wallet, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { PinInput } from '@/components/molecules/pin-input'

interface SaltFormProps {
  onPinComplete: (pin: string) => void
  onBack?: () => void
  isLoading?: boolean
  disabled?: boolean
}

export function SaltForm({ 
  onPinComplete, 
  onBack,
  isLoading = false,
  disabled = false 
}: SaltFormProps) {
  const [pin, setPin] = useState('')
  const [step, setStep] = useState<'setup' | 'confirm'>('setup')
  const [clearTrigger, setClearTrigger] = useState(0)
  const [error, setError] = useState('')

  const handlePinComplete = (completedPin: string) => {
    setPin(completedPin)
    setError('') // Clear any existing error
    
    if (step === 'setup') {
      // Auto-proceed to confirm step
      setStep('confirm')
      setClearTrigger(prev => prev + 1)
    } else {
      // Auto-proceed to complete
      if (pin !== completedPin) {
        // PINs don't match, show error and restart
        setError('PINs do not match. Please try again.')
        setStep('setup')
        setPin('')
        setClearTrigger(prev => prev + 1) // Clear the PIN input
        return
      }
      
      // PINs match, proceed
      onPinComplete(completedPin)
    }
  }

  const handlePinError = (errorMessage: string) => {
    setError(errorMessage)
    setClearTrigger(prev => prev + 1) // Clear the PIN input
  }

  const handleBack = () => {
    setStep('setup')
    setError('')
    setClearTrigger(prev => prev + 1) // Clear the PIN input
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">
          {step === 'setup' ? 'Create Your Wallet PIN' : 'Confirm Your Wallet PIN'}
        </CardTitle>
        <CardDescription>
          {step === 'setup' 
            ? 'Create a 6-digit PIN that will be used to generate your unique Sui wallet address.'
            : 'Please re-enter your 6-digit PIN to confirm it.'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="text-center">
            <label className="text-sm font-medium text-muted-foreground mb-4 block">
              {step === 'setup' ? 'Enter your 6-digit PIN' : 'Re-enter your 6-digit PIN'}
            </label>
            <PinInput
              onComplete={handlePinComplete}
              onError={handlePinError}
              disabled={disabled || isLoading}
              clearTrigger={clearTrigger}
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Wallet className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium">About Your Wallet PIN:</p>
                <ul className="space-y-1 text-xs">
                  <li>Each PIN creates a unique Sui Wallet</li>
                  <li>The same PIN always maps to the same Sui Wallet</li>
                  <li>Use the same PIN across different devices to access the same Sui Wallet</li>
                  <li>Different PINs create different wallets</li>
                  <li>Store your PIN securely - it cannot be recovered</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {step === 'confirm' && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
              className="px-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Setting up your wallet...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
