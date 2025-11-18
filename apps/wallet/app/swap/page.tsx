'use client'

import { useState } from 'react'
import { ArrowUpDown, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Card } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Input } from '@repo/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/tabs'
import { AuthenticatedLayout } from '@/components/templates/authenticated-layout'
import { NumberDisplay } from '@/components/atoms/number-display'

export default function SpotTradingPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('buy')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')

  const breadcrumbItems = [
    { label: 'Swap' }
  ]

  const handleSwap = () => {
    // Swap logic here
    console.log(`${activeTab} ${fromAmount} SUI for ${toAmount} USD`)
  }

  const handleFlipTokens = () => {
    setActiveTab(activeTab === 'buy' ? 'sell' : 'buy')
    // Swap amounts
    const temp = fromAmount
    setFromAmount(toAmount)
    setToAmount(temp)
  }

  return (
    <AuthenticatedLayout 
      breadcrumbItems={breadcrumbItems}
      balances={[]}
      onSend={() => {}}
    >
      <div className="space-y-6">
        <div className="max-w-md mx-auto">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buy">Buy</TabsTrigger>
                  <TabsTrigger value="sell">Sell</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* From Token */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {activeTab === 'buy' ? 'You pay' : 'You sell'}
                </label>
                <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      className="border-0 bg-transparent text-lg font-medium placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">S</span>
                    </div>
                    <span className="font-medium">SUI</span>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  Balance: <NumberDisplay value="1,250.50" decimals={2} /> SUI
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFlipTokens}
                  className="rounded-full w-10 h-10 p-0"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>

              {/* To Token */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {activeTab === 'buy' ? 'You receive' : 'You get'}
                </label>
                <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={toAmount}
                      onChange={(e) => setToAmount(e.target.value)}
                      className="border-0 bg-transparent text-lg font-medium placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">$</span>
                    </div>
                    <span className="font-medium">USD</span>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  ≈ <NumberDisplay value="2.45" prefix="$" /> per SUI
                </div>
              </div>

              {/* Price Impact */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price Impact</span>
                  <span className="text-green-600">0.01%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Minimum received</span>
                  <span><NumberDisplay value="245.00" prefix="$" /></span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span><NumberDisplay value="0.001" /> SUI</span>
                </div>
              </div>

              {/* Swap Button */}
              <Button 
                onClick={handleSwap}
                className={`w-full h-12 text-lg font-medium ${
                  activeTab === 'buy' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={!fromAmount || !toAmount}
              >
                {activeTab === 'buy' ? 'Buy SUI' : 'Sell SUI'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
