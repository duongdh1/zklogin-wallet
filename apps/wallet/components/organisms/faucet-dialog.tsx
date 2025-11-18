'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/dialog'
import { Button } from '@repo/ui/button'
import { Droplet } from 'lucide-react'
import { requestDevnetSui } from '@/utils/sui'
import { toast } from 'sonner'
import { storeTransaction } from '@/utils/transaction-tracker'

interface FaucetDialogProps {
  address: string
  onSuccess?: () => void
}

export function FaucetDialog({ address, onSuccess }: FaucetDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleRequestFaucet = async () => {
    if (!address) {
      toast.error('No wallet address found')
      return
    }

    setIsLoading(true)
    try {
      const result = await requestDevnetSui(address)
      
      if (result.success) {
        // Store faucet transaction (digest from response if available)
        if (result.digest) {
          storeTransaction(result.digest, address, 'faucet')
        }
        
        toast.success(result.message)
        setOpen(false)
        // Trigger balance refresh after successful faucet
        if (onSuccess) {
          setTimeout(() => {
            onSuccess()
          }, 2000) // Wait 2s for transaction to be confirmed on chain
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Faucet request failed:', error)
      toast.error('Failed to request from faucet')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Droplet className="h-4 w-4 mr-2" />
          Get Devnet SUI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Devnet SUI</DialogTitle>
          <DialogDescription>
            Get free SUI tokens from the devnet faucet for testing
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm space-y-2">
              <p>
                This will request <strong>10 SUI</strong> from the Sui devnet faucet.
              </p>
              <p className="text-muted-foreground">
                Devnet tokens have no real value and are only for testing purposes.
              </p>
              <p className="text-muted-foreground">
                You can request from the faucet multiple times, but there may be rate limits.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm space-y-1">
              <div className="font-medium text-blue-900 dark:text-blue-100">Your Address:</div>
              <div className="font-mono text-xs text-blue-700 dark:text-blue-300 break-all">
                {address}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestFaucet}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Requesting...' : 'Request SUI'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
