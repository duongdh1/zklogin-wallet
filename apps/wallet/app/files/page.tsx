'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { useZkLoginSession } from '@/hooks/use-zklogin-session'
import { WalrusClient, type FileMetadata } from '@/utils/walrus'
import { UploadPdfDialog } from '@/components/organisms/upload-pdf-dialog'
import { Download, FileText, Loader2, RefreshCw } from 'lucide-react'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

export default function FilesPage() {
  const zkLogin = useZkLoginSession()
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    const session = zkLogin.getSession()
    if (!session) return

    try {
      setLoading(true)
      const walrusClient = new WalrusClient()
      
      // Calculate address from ephemeral keypair
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(session.ephemeralSecretKey)
      const address = ephemeralKeyPair.getPublicKey().toSuiAddress()
      
      const userFiles = await walrusClient.listUserFiles(address)
      setFiles(userFiles)
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDownload = async (file: FileMetadata) => {
    const session = zkLogin.getSession()
    if (!session) return

    try {
      setDownloading(file.blobId)
      const walrusClient = new WalrusClient()
      
      const blob = await walrusClient.downloadPDF(file.blobId, file.blobId, {
        ephemeralSecretKey: session.ephemeralSecretKey,
        randomness: session.randomness,
        nonce: session.nonce,
        zkProof: session.zkProof,
        maxEpoch: session.maxEpoch,
        idToken: session.idToken
      })

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download file. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  const session = zkLogin.getSession()
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please login to view your files</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Files</h1>
          <p className="text-muted-foreground">
            Manage your encrypted files on Walrus
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadFiles}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <UploadPdfDialog />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No files yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first PDF file to Walrus
            </p>
            <UploadPdfDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <Card key={file.blobId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  <span className="truncate">{file.filename}</span>
                </CardTitle>
                <CardDescription>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs space-y-1">
                  <p className="text-muted-foreground">
                    Blob ID: <span className="font-mono">{file.blobId.slice(0, 12)}...</span>
                  </p>
                  <p className="text-muted-foreground">
                    Type: {file.mimetype}
                  </p>
                  {file.allowedAddresses.length > 0 && (
                    <p className="text-muted-foreground">
                      Shared with: {file.allowedAddresses.length} address(es)
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleDownload(file)}
                  disabled={downloading === file.blobId}
                  className="w-full"
                  size="sm"
                >
                  {downloading === file.blobId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
