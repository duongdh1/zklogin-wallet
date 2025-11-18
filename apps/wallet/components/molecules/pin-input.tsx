'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@repo/ui/input'

interface PinInputProps {
  length?: number
  onComplete: (pin: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
  clearTrigger?: number // When this changes, clear the input
}

export function PinInput({ 
  length = 6, 
  onComplete, 
  onError,
  disabled = false,
  className = '',
  clearTrigger = 0
}: PinInputProps) {
  const [pin, setPin] = useState<string[]>(new Array(length).fill(''))
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[activeIndex]?.focus()
  }, [activeIndex])

  // Clear input when clearTrigger changes
  useEffect(() => {
    if (clearTrigger > 0) {
      setPin(new Array(length).fill(''))
      setActiveIndex(0)
    }
  }, [clearTrigger, length])

  const handleChange = (index: number, value: string) => {
    if (disabled) return

    // Only allow single digit
    if (value.length > 1) {
      value = value.slice(-1)
    }

    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      onError?.('Only numbers are allowed')
      return
    }

    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)

    // Move to next input if value is entered
    if (value && index < length - 1) {
      setActiveIndex(index + 1)
    }

    // Check if all digits are filled and auto-proceed
    if (newPin.every(digit => digit !== '') && newPin.join('').length === length) {
      // Small delay to show the last digit before proceeding
      setTimeout(() => {
        onComplete(newPin.join(''))
      }, 100)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (disabled) return

    if (e.key === 'Backspace') {
      if (pin[index]) {
        // Clear current input
        const newPin = [...pin]
        newPin[index] = ''
        setPin(newPin)
      } else if (index > 0) {
        // Move to previous input
        setActiveIndex(index - 1)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveIndex(index - 1)
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      setActiveIndex(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return

    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    
    // Only allow numbers and correct length
    if (!/^\d+$/.test(pastedData)) {
      onError?.('Only numbers are allowed')
      return
    }

    if (pastedData.length !== length) {
      onError?.(`PIN must be exactly ${length} digits`)
      return
    }

    const newPin = pastedData.split('')
    setPin(newPin)
    setActiveIndex(length - 1)
    onComplete(pastedData)
  }

  return (
    <div className={`flex gap-2 justify-center ${className}`}>
      {pin.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => {
            if (el) {
              inputRefs.current[index] = el
            }
          }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setActiveIndex(index)}
          disabled={disabled}
          className={`w-12 h-12 text-center text-lg font-semibold ${
            activeIndex === index ? 'ring-2 ring-blue-500' : ''
          }`}
          autoComplete="off"
        />
      ))}
    </div>
  )
}
