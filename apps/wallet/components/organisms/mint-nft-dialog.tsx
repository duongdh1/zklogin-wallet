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
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { ImagePlus } from 'lucide-react'
import { suiClient, signTransactionWithZkLogin, createMintNftTransaction } from '@/utils/sui'
import { useAuth } from '@/contexts/auth-context'
import { TransactionSaltForm } from './transaction-salt-form'
import { toast } from 'sonner'

export function MintNftDialog() {
  const { getZkLoginSession, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPinForm, setShowPinForm] = useState(false)
  const [nftData, setNftData] = useState<{
    name: string
    description: string
    imageUrl: string
  } | null>(null)
  const [transactionError, setTransactionError] = useState('')

  const handleMint = async () => {
    if (!name || !description || !imageUrl) {
      toast.error('Please fill in all fields')
      return
    }

    // Validate image URL
    try {
      new URL(imageUrl)
    } catch {
      toast.error('Please enter a valid image URL')
      return
    }

    // Store NFT data and show PIN form
    setNftData({ name, description, imageUrl })
    setShowPinForm(true)
  }

  const handlePinComplete = async (pin: string) => {
    if (!nftData) return

    setTransactionError('')
    setIsLoading(true)
    try {
      // Get zkLogin session
      const zkLoginSession = getZkLoginSession()
      if (!zkLoginSession) {
        throw new Error('No active zkLogin session found')
      }

      // Create mint NFT transaction
      const transaction = createMintNftTransaction(
        nftData.name,
        nftData.description,
        nftData.imageUrl
      )

      // Sign and execute transaction with PIN
      const txDigest = await signTransactionWithZkLogin(
        suiClient,
        transaction,
        zkLoginSession,
        pin,
        user!.address
      )

      console.log('NFT minted:', txDigest)

      // Reset form and close dialog
      setOpen(false)
      setName('')
      setDescription('')
      setImageUrl('')
      setShowPinForm(false)
      setNftData(null)

      toast.success(`NFT minted successfully! Transaction: ${txDigest}`)
    } catch (error) {
      console.error('Mint failed:', error)
      setTransactionError(error instanceof Error ? error.message : 'Unknown error')
      // Reset to form state on error
      setShowPinForm(false)
      setNftData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinCancel = () => {
    setShowPinForm(false)
    setNftData(null)
    setTransactionError('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ImagePlus className="h-4 w-4 mr-2" />
          Mint NFT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showPinForm ? 'Authorize NFT Minting' : 'Mint NFT'}
          </DialogTitle>
          <DialogDescription>
            {showPinForm
              ? 'Please check your NFT details and authorize this transaction'
              : 'Create a new NFT on the Sui blockchain'
            }
          </DialogDescription>
        </DialogHeader>

        {showPinForm ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm space-y-2">
                <div className="space-y-1">
                  <span className="font-medium">Name:</span>
                  <p>{nftData?.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-medium">Description:</span>
                  <p className="text-muted-foreground">{nftData?.description}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-medium">Image URL:</span>
                  <p className="font-mono text-xs break-all text-muted-foreground">
                    {nftData?.imageUrl}
                  </p>
                </div>
                {nftData?.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={nftData.imageUrl}
                      alt={nftData.name}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage Error%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <TransactionSaltForm
              onPinComplete={handlePinComplete}
              onCancel={handlePinCancel}
              isLoading={isLoading}
              transactionDetails={nftData}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {transactionError && (
              <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-xs">!</span>
                </div>
                {transactionError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nft-name">NFT Name</Label>
              <Input
                id="nft-name"
                placeholder="My Awesome NFT"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nft-description">Description</Label>
              <Input
                id="nft-description"
                placeholder="A unique digital collectible"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nft-image">Image URL</Label>
              <Input
                id="nft-image"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Enter a direct link to your NFT image (PNG, JPG, GIF, etc.)
              </p>
            </div>

            {imageUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded-lg p-2">
                  <img
                    src={imageUrl}
                    alt="NFT Preview"
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EInvalid Image%3C/text%3E%3C/svg%3E'
                    }}
                  />
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm space-y-1">
                <div className="font-medium text-blue-900 dark:text-blue-100">Note:</div>
                <p className="text-blue-700 dark:text-blue-300">
                  Minting an NFT will create a new digital asset on the Sui blockchain. 
                  This requires a small gas fee (approximately 0.01 SUI).
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMint}
                disabled={!name || !description || !imageUrl || isLoading}
                className="flex-1"
              >
                {isLoading ? 'Minting...' : 'Continue'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
