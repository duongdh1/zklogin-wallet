'use client'

import { useState, useEffect } from 'react'
import { TokenBalance as TokenBalanceType } from '@/utils/sui'
import { fetchTokenBalances } from '@/utils/coin-gecko'
import { NumberDisplay } from '@/components/atoms/number-display'

interface TokenBalanceProps {
  address: string
  onBalancesChange: (balances: TokenBalanceType[], totalValue: number) => void
  refreshTrigger?: number
}

export function TokenBalance({ address, onBalancesChange, refreshTrigger }: TokenBalanceProps) {
  const [tokens, setTokens] = useState<TokenBalanceType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBalances = async () => {
      setLoading(true)
      try {
        const balances = await fetchTokenBalances(address)
        setTokens(balances)
        const totalValue = calculateTotalValue(balances)
        onBalancesChange(balances, totalValue)
      } catch (error) {
        console.error('Failed to fetch token balances:', error)
        setTokens([])
        onBalancesChange([], 0)
      } finally {
        setLoading(false)
      }
    }

    if (address) {
      fetchBalances()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, refreshTrigger])

  const calculateTotalValue = (balances: TokenBalanceType[]): number => {
    return balances.reduce((total, token) => total + parseFloat(token.usdValue), 0)
  }

  const getTokenIcon = (symbol: string) => {
    const colors: { [key: string]: string } = {
      'SUI': 'bg-blue-100 text-blue-600',
      'USDC': 'bg-green-100 text-green-600',
      'USDT': 'bg-green-100 text-green-600',
      'WETH': 'bg-purple-100 text-purple-600',
      'ETH': 'bg-purple-100 text-purple-600'
    }
    
    return colors[symbol] || 'bg-gray-100 text-gray-600'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tokens.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tokens found</p>
          <p className="text-sm">This wallet appears to be empty</p>
        </div>
      ) : (
        tokens.map((token) => (
          <div key={token.symbol} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTokenIcon(token.symbol)}`}>
                <span className="font-bold text-sm">{token.symbol.charAt(0)}</span>
              </div>
              <div>
                <div className="font-medium">{token.symbol}</div>
                <div className="text-sm text-muted-foreground">{token.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                <NumberDisplay value={token.balance} decimals={6} /> {token.symbol}
              </div>
              <div className="text-sm text-muted-foreground">
                <NumberDisplay value={token.usdValue} prefix="$" />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
