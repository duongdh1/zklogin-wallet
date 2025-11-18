'use client'

import { useState } from 'react'
import { Copy, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/dialog'
import { Button } from '@repo/ui/button'
import QRCode from 'react-qr-code'

interface ReceiveTokenDialogProps {
  address: string
}

export function ReceiveTokenDialog({ address }: ReceiveTokenDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code')
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        
        const pngFile = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.download = `sui-wallet-address-${address.slice(0, 8)}.png`
        downloadLink.href = pngFile
        downloadLink.click()
      }
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Receive</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Tokens</DialogTitle>
          <DialogDescription>
            Share your wallet address or scan the QR code to receive tokens
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg">
              <QRCode
                id="qr-code"
                value={address}
                size={200}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Wallet Address</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-3 bg-muted rounded-md">
                <code className="text-sm break-all">{address}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">How to receive tokens:</p>
            <ul className="space-y-1 text-xs">
              <li>Share your wallet address with the sender</li>
              <li>Or have them scan the QR code above</li>
              <li>Make sure they're sending Sui network tokens</li>
              <li>Transactions usually complete within seconds</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
