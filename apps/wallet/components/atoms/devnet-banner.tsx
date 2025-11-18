'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@repo/ui/badge'
import { SUI_CHAINS } from '@/utils/sui'

export function DevnetBanner() {
  const [isDevnet, setIsDevnet] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Only check environment variable after component mounts
    const suiChain = process.env.NEXT_PUBLIC_SUI_CHAIN
    setIsDevnet(suiChain === SUI_CHAINS.DEVNET)
    setIsMounted(true)
  }, [])

  // Don't render anything until after hydration
  if (!isMounted) {
    return null
  }

  // Only show banner when SUI_CHAIN is set to 'devnet'
  if (!isDevnet) {
    return null
  }

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <Badge variant="destructive" className="px-3 py-1 rounded-full text-xs font-medium uppercase">
        devnet
      </Badge>
    </div>
  )
}
