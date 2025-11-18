'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { AuthenticatedLayout } from '@/components/templates/authenticated-layout'
import { Badge } from '@repo/ui/badge'
import { NumberDisplay } from '@/components/atoms/number-display'
import { fetchTransactions, TransactionRecord } from '@/utils/sui'
import { getTransactionsByAddress } from '@/utils/transaction-tracker'

export default function ActivityPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)

  const breadcrumbItems = [
    { label: 'Activity' }
  ]

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadTransactions = async () => {
      try {
        // Get stored transactions from Google Sheets (instant)
        const storedTxs = await getTransactionsByAddress(user.address)
        
        // Also fetch from on-chain to get full details (slower but complete)
        const onChainTxns = await fetchTransactions(user.address)
        
        // Merge: prioritize on-chain data, add stored-only transactions
        const allTxns = [...onChainTxns]
        
        // Add any stored transactions not yet on-chain or not in query results
        storedTxs.forEach(stored => {
          if (!onChainTxns.some(tx => tx.hash === stored.digest)) {
            // Convert stored transaction to TransactionRecord format
            allTxns.push({
              id: stored.digest,
              type: stored.type === 'send' ? 'send' : 'receive',
              amount: '0',
              symbol: 'SUI',
              status: 'pending',
              timestamp: new Date(stored.timestamp).toLocaleString(),
              hash: stored.digest,
              to: stored.type === 'send' ? 'Unknown' : user.address,
              from: stored.type === 'send' ? user.address : 'Unknown',
            })
          }
        })
        
        setTransactions(allTxns)
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        // Fallback to stored transactions only
        try {
          const storedTxs = await getTransactionsByAddress(user.address)
          const fallbackTxns = storedTxs.map(stored => ({
            id: stored.digest,
            type: stored.type === 'send' ? 'send' as const : 'receive' as const,
            amount: '0',
            symbol: 'SUI',
            status: 'pending' as const,
            timestamp: new Date(stored.timestamp).toLocaleString(),
            hash: stored.digest,
            to: stored.type === 'send' ? 'Unknown' : user.address,
            from: stored.type === 'send' ? user.address : 'Unknown',
          }))
          setTransactions(fallbackTxns)
        } catch {
          setTransactions([])
        }
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [user])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return null
    }
  }

  return (
    <AuthenticatedLayout 
      breadcrumbItems={breadcrumbItems}
      balances={[]}
      onSend={() => {}}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity</h1>
          <p className="text-muted-foreground">
            View your transaction history and activity
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                <NumberDisplay value={transactions.length} decimals={0} />
              </div>
              <p className="text-sm text-muted-foreground">Recent activity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                <NumberDisplay value={transactions.filter(tx => {
                  const txDate = new Date(tx.timestamp)
                  const now = new Date()
                  return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()
                }).length} decimals={0} />
              </div>
              <p className="text-sm text-muted-foreground">Transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {transactions.length > 0 ? 
                  <NumberDisplay 
                    value={(transactions.filter(tx => tx.status === 'completed').length / transactions.length * 100).toFixed(1)} 
                    suffix="%" 
                    decimals={1} 
                  /> : 
                  '0%'
                }
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest transaction activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-muted rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-24"></div>
                          <div className="h-3 bg-muted rounded w-32"></div>
                          <div className="h-3 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-16"></div>
                        <div className="h-3 bg-muted rounded w-12"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No transactions found</p>
                    <p className="text-sm">Your transaction history will appear here</p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          {tx.type === 'send' ? (
                            <ArrowUpRight className="h-5 w-5 text-red-500" />
                          ) : (
                            <ArrowDownLeft className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {tx.type === 'send' ? 'Sent' : 'Received'} <NumberDisplay value={tx.amount} decimals={6} /> {tx.symbol}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tx.type === 'send' ? `To: ${tx.to}` : `From: ${tx.from}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tx.timestamp}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(tx.status)}
                        {getStatusBadge(tx.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
            <CardDescription>Complete transaction history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No additional transactions found</p>
              <p className="text-sm">Your recent transactions are shown above</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Detailed information about your transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.slice(0, 2).map((tx) => (
                <div key={`detail-${tx.id}`} className="p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
                      <p className="font-mono text-sm break-all">{tx.hash}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Amount</label>
                      <p className="font-medium">
                        <NumberDisplay value={tx.amount} decimals={6} /> {tx.symbol}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
                      <p className="capitalize">{tx.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(tx.status)}
                        <span className="capitalize">{tx.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
