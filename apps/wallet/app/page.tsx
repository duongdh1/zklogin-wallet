'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { AuthenticatedLayout } from '../components/templates/authenticated-layout'
import { TokenBalance } from '../components/molecules/token-balance'
import { ReceiveTokenDialog } from '../components/organisms/receive-token-dialog'
import { SendTokenDialog } from '../components/organisms/send-token-dialog'
import { NumberDisplay } from '../components/atoms/number-display'
import { WalletAddress } from '../components/atoms/wallet-address'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { TokenBalance as TokenBalanceType } from '../utils/sui'

export default function Page() {
  const { user } = useAuth()
  const [balances, setBalances] = useState<TokenBalanceType[]>([])
  const [totalValue, setTotalValue] = useState(0)

  const breadcrumbItems = [
    { label: 'Balances' }
  ]

  const handleBalancesChange = useCallback((newBalances: TokenBalanceType[], newTotalValue: number) => {
    setBalances(newBalances)
    setTotalValue(newTotalValue)
  }, [])

  const handleSend = async (token: string, amount: string, recipient: string) => {
    // In a real implementation, this would make an on-chain transaction
    console.log('Sending:', { token, amount, recipient })
    // Simulate transaction
    alert(`Sending ${amount} ${token} to ${recipient}`)
  }

  return (
    <AuthenticatedLayout
      breadcrumbItems={breadcrumbItems}
      balances={balances}
      onSend={handleSend}
    >
      <div className="space-y-6">
        {/* Portfolio Value */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value</CardTitle>
            <CardDescription>
              Total value of your holdings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  <NumberDisplay value={totalValue} prefix="$" />
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>+2.5% (24h)</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Assets</div>
                <div className="text-lg font-semibold">
                  <NumberDisplay value={balances.length} decimals={0} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Address Section */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>
              Your wallet address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-4">
                <WalletAddress address={user?.address || ''} />

                <div className="flex items-center space-x-2">
                  <SendTokenDialog balances={balances} onSend={handleSend} />
                  <ReceiveTokenDialog address={user?.address || ''} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Token Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Token Balances</CardTitle>
              <CardDescription>Your current token holdings</CardDescription>
            </CardHeader>
            <CardContent>
              <TokenBalance 
                address={user?.address || ''} 
                onBalancesChange={handleBalancesChange}
              />
            </CardContent>
          </Card>

          {/* zkLogin Info */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Your wallet uses zkLogin technology, which allows you to transact on Sui using your OAuth credentials 
              without revealing your identity or managing private keys.
            </p>
          </div>
      </div>
    </AuthenticatedLayout>
  )
}
