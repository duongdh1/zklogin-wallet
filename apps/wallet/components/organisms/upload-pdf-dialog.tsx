'use client'

import { useState } from 'react'
import { Button } from '@repo/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/dialog'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { useZkLoginSession } from '@/hooks/use-zklogin-session'
import { WalrusClient } from '@/utils/walrus'
import { Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

export function UploadPdfDialog() {
  const zkLogin = useZkLoginSession()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [allowedAddresses, setAllowedAddresses] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    blobId?: string
    txDigest?: string
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== 'application/pdf') {
        setUploadResult({
          success: false,
          message: 'Please select a PDF file'
        })
        return
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (selectedFile.size > maxSize) {
        setUploadResult({
          success: false,
          message: 'File size must be less than 10MB'
        })
        return
      }

      setFile(selectedFile)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    const session = zkLogin.getSession()
    if (!file || !session) {
      setUploadResult({
        success: false,
        message: 'Please select a file and ensure you are logged in'
      })
      return
    }

    try {
      setUploading(true)
      setUploadResult(null)

      // Parse allowed addresses
      const addresses = allowedAddresses
        .split(',')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0)

      // Default to sender's address if no addresses specified
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(session.ephemeralSecretKey)
      const senderAddress = ephemeralKeyPair.getPublicKey().toSuiAddress()
      
      if (addresses.length === 0) {
        addresses.push(senderAddress)
      }
      // Upload to Walrus
      const walrusClient = new WalrusClient()
      const result = await walrusClient.uploadPDF(file, addresses, {
        ephemeralSecretKey: session.ephemeralSecretKey,
        randomness: session.randomness,
        nonce: session.nonce,
        zkProof: session.zkProof,
        maxEpoch: session.maxEpoch,
        idToken: session.idToken
      })

      setUploadResult({
        success: true,
        message: 'File uploaded successfully!',
        blobId: result.blobId,
        txDigest: result.txDigest
      })

      // Reset form after 2 seconds
      setTimeout(() => {
        setFile(null)
        setAllowedAddresses('')
        setUploadResult(null)
        setOpen(false)
      }, 3000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed. Please try again.'
      console.error('Upload error:', error)
      setUploadResult({
        success: false,
        message
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload PDF to Walrus
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload PDF to Walrus</DialogTitle>
          <DialogDescription>
            Upload and encrypt your PDF file on Walrus with Seal encryption.
            Only specified addresses can decrypt and view the file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="pdf-file">PDF File (Max 10MB)</Label>
            <Input
              id="pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Allowed Addresses */}
          <div className="space-y-2">
            <Label htmlFor="allowed-addresses">
              Allowed Addresses (comma-separated, optional)
            </Label>
            <Input
              id="allowed-addresses"
              placeholder="0x123..., 0x456... (leave empty to allow only yourself)"
              value={allowedAddresses}
              onChange={(e) => setAllowedAddresses(e.target.value)}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to allow only your address. Add multiple addresses separated by commas.
            </p>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div
              className={`flex items-start gap-2 rounded-md border p-3 ${
                uploadResult.success
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-red-500/50 bg-red-500/10'
              }`}
            >
              {uploadResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{uploadResult.message}</p>
                {uploadResult.blobId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Blob ID: {uploadResult.blobId.slice(0, 20)}...
                  </p>
                )}
                {uploadResult.txDigest && (
                  <a
                    href={`https://suiscan.xyz/testnet/tx/${uploadResult.txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View on Explorer →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload to Walrus
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
