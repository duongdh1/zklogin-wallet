'use client'

import React from 'react'

interface NumberDisplayProps {
  value: string | number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function NumberDisplay({ 
  value, 
  decimals = 2, 
  prefix = '', 
  suffix = '', 
  className = '' 
}: NumberDisplayProps) {
  const formatNumber = (val: string | number): string => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    
    if (isNaN(num)) return '0'
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  return (
    <span className={className}>
      {prefix}{formatNumber(value)}{suffix}
    </span>
  )
}
