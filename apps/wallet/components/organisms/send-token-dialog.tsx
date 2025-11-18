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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/select'
import { NumberDisplay } from '@/components/atoms/number-display'
import { TokenBalance, suiClient, signTransactionWithZkLogin, createTransferTransaction } from '@/utils/sui'
import { useAuth } from '@/contexts/auth-context'
import { TransactionSaltForm } from './transaction-salt-form'
import { toast } from 'sonner'
import { Transaction } from '@mysten/sui/transactions'
import { storeTransaction } from '@/utils/transaction-tracker'

interface SendTokenDialogProps {
  balances: TokenBalance[]
  onSend: (token: string, amount: string, recipient: string) => void
  onSuccess?: () => void
}

export function SendTokenDialog({ balances, onSend, onSuccess }: SendTokenDialogProps) {
  const { getZkLoginSession, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [selectedToken, setSelectedToken] = useState('')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPinForm, setShowPinForm] = useState(false)
  const [transactionData, setTransactionData] = useState<{
    token: string
    amount: string
    recipient: string
  } | null>(null)
  const [transactionError, setTransactionError] = useState('')

  const handleSend = async () => {
    if (!selectedToken || !amount || !recipient) return
    
    // Store transaction data and show PIN form
    setTransactionData({ token: selectedToken, amount, recipient })
    setShowPinForm(true)
  }

  const handlePinComplete = async (pin: string) => {
    if (!transactionData) return
    
    setTransactionError('')
    setIsLoading(true)
    try {
      // Get zkLogin session
      const zkLoginSession = getZkLoginSession()
      if (!zkLoginSession) {
        throw new Error('No active zkLogin session found')
      }

      // Create transfer transaction
      const transaction: Transaction = createTransferTransaction(
        transactionData.recipient, 
        transactionData.amount, 
        transactionData.token
      )
      
      // Sign and execute transaction with PIN
      const txDigest = await signTransactionWithZkLogin(suiClient, transaction, zkLoginSession, pin, user!.address)
      
      // Store transaction for reporting
      storeTransaction(txDigest, user!.address, 'send')
      
      console.log('Transaction sent:', txDigest)
      
      // Call the onSend callback for UI updates
      await onSend(transactionData.token, transactionData.amount, transactionData.recipient)
      
      // Reset form and close dialog
      setOpen(false)
      setSelectedToken('')
      setAmount('')
      setRecipient('')
      setShowPinForm(false)
      setTransactionData(null)
      
      toast.success(`Transaction sent successfully! Hash: ${txDigest}`)
      
      // Trigger balance refresh after successful send
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (error) {
      console.error('Send failed:', error)
      setTransactionError(error instanceof Error ? error.message : 'Unknown error')
      // Reset to form state on error
      setShowPinForm(false)
      setTransactionData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinCancel = () => {
    setShowPinForm(false)
    setTransactionData(null)
    setTransactionError('')
  }

  const selectedTokenData = balances.find(b => b.symbol === selectedToken)
  const maxAmount = selectedTokenData?.balance || '0'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Send</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showPinForm ? 'Authorize Transaction' : 'Send Tokens'}
          </DialogTitle>
          <DialogDescription>
            {showPinForm 
              ? 'Please check your transaction details and then authorize this transaction'
              : 'Transfer tokens to another wallet address'
            }
          </DialogDescription>
        </DialogHeader>
        
        {showPinForm ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between items-center">
                  <span>Token:</span>
                  <span>{transactionData?.token}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Amount:</span>
                  <span>{transactionData?.amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Recipient:</span>
                  <span className="font-mono text-[7px]">{transactionData?.recipient}</span>
                </div>
              </div>
            </div>
            
            <TransactionSaltForm
              onPinComplete={handlePinComplete}
              onCancel={handlePinCancel}
              isLoading={isLoading}
              transactionDetails={transactionData}
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
            <Label htmlFor="token">Select Token</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a token" />
              </SelectTrigger>
              <SelectContent>
                {balances.map((token) => (
                  <SelectItem key={token.symbol} value={token.coinType}>
                    <div className="flex items-center space-x-2">
                      <span>{token.symbol}</span>
                      <span className="text-muted-foreground">
                        Balance: <NumberDisplay value={token.balance} decimals={6} />
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex space-x-2">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.000001"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount(maxAmount)}
              >
                Max
              </Button>
            </div>
            {selectedTokenData && (
              <p className="text-sm text-muted-foreground">
                Available: <NumberDisplay value={selectedTokenData.balance} decimals={6} /> {selectedTokenData.symbol}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          {selectedTokenData && amount && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span><NumberDisplay value={amount} decimals={6} /> {selectedTokenData.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Value:</span>
                  <span><NumberDisplay value={(parseFloat(amount) * selectedTokenData.price).toString()} prefix="$" /></span>
                </div>
                <div className="flex justify-between">
                  <span>Gas Fee:</span>
                  <span>~0.001 SUI</span>
                </div>
              </div>
            </div>
          )}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!selectedToken || !amount || !recipient || isLoading}
                className="flex-1"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
