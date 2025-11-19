/**
 * Script to verify all transactions were successful
 */

import { SuiClient } from '@mysten/sui/client'
import * as fs from 'fs'
import * as path from 'path'

const SUI_CLIENT = new SuiClient({ url: 'https://fullnode.devnet.sui.io' })

interface AddressTransactions {
  address?: string
  txDigests: string[]
}

async function verifyTransaction(digest: string): Promise<boolean> {
  try {
    const tx = await SUI_CLIENT.getTransactionBlock({
      digest,
      options: { showEffects: true }
    })

    const status = tx.effects?.status?.status
    return status === 'success'
  } catch (error) {
    console.error(`Failed to verify ${digest}:`, error)
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.error('Usage: bun run verify <path-to-json-file>')
    process.exit(1)
  }

  const filePath = args[0]
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log('📖 Reading transaction data...\n')
  const data: AddressTransactions[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  let totalTx = 0
  let successTx = 0
  let failedTx = 0

  for (const wallet of data) {
    console.log(`\nVerifying ${wallet.address?.slice(0, 10)}... (${wallet.txDigests.length} txs)`)
    
    for (const digest of wallet.txDigests) {
      totalTx++
      const success = await verifyTransaction(digest)
      
      if (success) {
        successTx++
        process.stdout.write('✓')
      } else {
        failedTx++
        process.stdout.write('✗')
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log('\n\n📊 Verification Summary:\n')
  console.log(`Total Transactions: ${totalTx}`)
  console.log(`Successful: ${successTx} (${((successTx/totalTx)*100).toFixed(2)}%)`)
  console.log(`Failed: ${failedTx} (${((failedTx/totalTx)*100).toFixed(2)}%)`)
  console.log(`Total Unique Addresses: ${data.length}`)
}

main().catch(console.error)
