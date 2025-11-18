'use client'

import { useState } from 'react'
import { Button } from '@repo/ui/button'
import { Copy, Check } from 'lucide-react'
import { BlockchainExplorerLink } from './blockchain-explorer-link'

interface WalletAddressProps {
  address: string
  className?: string
}

export function WalletAddress({ address, className = '' }: WalletAddressProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  return (
    <div className={`flex flex-row ${className}`}>
      <div className="flex grow items-center gap-2 bg-muted p-3 rounded-lg">
        <p className="font-mono text-sm break-all flex-1">
          {address}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="shrink-0 h-8 px-2"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy
            </>
          )}
        </Button>
      </div>
      <div className="flex justify-center items-center p-3">
        <BlockchainExplorerLink address={address} />
      </div>
    </div>
  )
}
