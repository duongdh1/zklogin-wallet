'use client'

import { ExternalLink } from 'lucide-react'
import { SUI_CHAINS } from '@/utils/sui'

interface BlockchainExplorerLinkProps {
  address: string
  className?: string
  children?: React.ReactNode
}

export function BlockchainExplorerLink({ 
  address, 
  className = "flex items-center space-x-2",
  children 
}: BlockchainExplorerLinkProps) {
  const suiChain = process.env.NEXT_PUBLIC_SUI_CHAIN
  
  // Determine the correct explorer URL based on the network
  const getExplorerUrl = () => {
    if (suiChain === SUI_CHAINS.DEVNET) {
      return `https://suiscan.xyz/devnet/account/${address}`
    } else {
      // Default to mainnet
      return `https://suiscan.xyz/mainnet/account/${address}`
    }
  }

  const getDisplayText = () => {
    if (suiChain === SUI_CHAINS.DEVNET) {
      return 'View on Blockexplorer (Devnet)'
    } else {
      return 'View on Blockexplorer'
    }
  }

  return (
    <a 
      href={getExplorerUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <ExternalLink className="h-4 w-4" />
      <span>{children || getDisplayText()}</span>
    </a>
  )
}
