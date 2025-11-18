'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { AuthenticatedLayout } from '@/components/templates/authenticated-layout'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { Download, Trash2, Copy, ExternalLink } from 'lucide-react'
import { NumberDisplay } from '@/components/atoms/number-display'
import {
  getAllTransactions,
  getTransactionsByAddress,
  exportTransactionsForReport,
  downloadTransactionsJSON,
  getTransactionStats,
  clearAllTransactions,
  type AddressTransactionsArray
} from '@/utils/transaction-tracker'
import { toast } from 'sonner'

type FilterMode = 'current' | 'all'

interface StoredTransaction {
  digest: string
  address: string
  timestamp: number
  type: 'send' | 'receive' | 'faucet' | 'mint' | 'other'
}

interface TransactionStats {
  totalTransactions: number
  uniqueAddresses: number
  byType: {
    send: number
    receive: number
    faucet: number
    mint: number
    other: number
  }
  addressList: string[]
}

export default function TransactionHistoryPage() {
  const { user } = useAuth()
  const [filterMode, setFilterMode] = useState<FilterMode>('current')
  const [transactions, setTransactions] = useState<StoredTransaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [exportPreview, setExportPreview] = useState<AddressTransactionsArray>([])

  const breadcrumbItems = [
    { label: 'Transaction History' }
  ]

  const loadTransactions = useCallback(async () => {
    if (filterMode === 'current' && user?.address) {
      const txs = await getTransactionsByAddress(user.address)
      setTransactions(txs)
    } else {
      const txs = await getAllTransactions()
      setTransactions(txs)
    }
    
    const statistics = await getTransactionStats()
    setStats(statistics)
    
    // Load export preview
    const preview = await exportTransactionsForReport()
    setExportPreview(preview)
  }, [filterMode, user?.address])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleDownloadJSON = async () => {
    await downloadTransactionsJSON()
    toast.success('Transaction data downloaded!')
  }

  const handleCopyJSON = async () => {
    const data = await exportTransactionsForReport()
    const json = JSON.stringify(data, null, 2)
    navigator.clipboard.writeText(json)
    toast.success('Transaction data copied to clipboard!')
  }

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all transaction history? This cannot be undone.')) {
      const success = await clearAllTransactions()
      if (success) {
        await loadTransactions()
        toast.success('All transactions cleared')
      } else {
        toast.error('Failed to clear transactions')
      }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const openInExplorer = (digest: string) => {
    window.open(`https://suiscan.xyz/devnet/tx/${digest}`, '_blank')
  }

  return (
    <AuthenticatedLayout 
      breadcrumbItems={breadcrumbItems}
      balances={[]}
      onSend={() => {}}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
          <p className="text-muted-foreground">
            Track and export all zkLogin transactions for Sui Dev reporting
          </p>
        </div>

        {/* Statistics Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                <p className="text-xs text-muted-foreground">All recorded transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unique Addresses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueAddresses}</div>
                <p className="text-xs text-muted-foreground">Different wallet addresses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Progress to Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.min(100, Math.round((stats.totalTransactions / 1000) * 100))}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalTransactions}/1000 transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Address Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.min(100, Math.round((stats.uniqueAddresses / 100) * 100))}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.uniqueAddresses}/100 unique addresses
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter and Export Controls */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  View and export transaction digests for reporting
                </CardDescription>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterMode === 'current' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterMode('current')}
                >
                  Current User
                </Button>
                <Button
                  variant={filterMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterMode('all')}
                >
                  All Users
                </Button>
                
                <div className="w-px bg-border mx-1"></div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJSON}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadJSON}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions found</p>
                <p className="text-sm">Start making transactions to see them here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx, index) => (
                  <div
                    key={tx.digest}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <Badge variant="outline" className="text-xs">
                          {tx.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="font-mono text-xs break-all">
                        Digest: {tx.digest}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground break-all">
                        Address: {tx.address}
                      </div>
                    </div>
                    
                    <div className="flex gap-1 sm:ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(tx.digest)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openInExplorer(tx.digest)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Format Preview */}
        {stats && stats.totalTransactions > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Export Format Preview</CardTitle>
              <CardDescription>
                Data will be exported in this format for Sui Dev
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <pre>{JSON.stringify(exportPreview.slice(0, 2), null, 2)}</pre>
                {exportPreview.length > 2 && (
                  <p className="text-muted-foreground mt-2">
                    ... and {exportPreview.length - 2} more addresses
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Reporting Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Goal:</strong> 1,000 Devnet transactions across 100 unique addresses
              </p>
            </div>
            
            <div className="text-sm space-y-2">
              <p>To meet the requirements:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Generate at least 1,000 transactions on Devnet</li>
                <li>Use at least 100 different wallet addresses</li>
                <li>Store all transaction digests</li>
                <li>Export as JSON file when ready</li>
                <li>Submit the JSON file to Sui Dev team</li>
              </ul>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>Tip:</strong> Use PTBs (Programmable Transaction Blocks) to execute multiple transactions programmatically
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
