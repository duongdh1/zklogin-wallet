/**
 * Generate 1000+ transactions from 100 JWTs
 * Each JWT represents a unique wallet with its own ephemeral key
 */

import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { 
  jwtToAddress,
  getZkLoginSignature,
  genAddressSeed,
  generateRandomness
} from '@mysten/sui/zklogin'
import { jwtDecode } from 'jwt-decode'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Types
interface JwtPayload {
  iss?: string
  sub?: string
  aud?: string[] | string
  exp?: number
  nonce?: string
  [key: string]: any
}

interface ZkProof {
  proofPoints: {
    a: string[]
    b: string[][]
    c: string[]
  }
  issBase64Details: {
    value: string
    indexMod4: number
  }
  headerBase64: string
}

interface WalletConfig {
  jwtToken: string
  ephemeralSecretKey: string
  randomness: string
  maxEpoch: number
  zkProof: ZkProof
  salt: string
}

interface WalletData {
  address: string
  config: WalletConfig
  txDigests: string[]
}

// Configuration
const FAUCET_URL = 'https://faucet.devnet.sui.io/v2/gas'
const SUI_CLIENT = new SuiClient({ url: 'https://fullnode.devnet.sui.io' })
const TOTAL_TRANSACTIONS = 4
const TRANSFER_AMOUNT = 1_000_000_000 // 1 SUI

// Load wallet configs from JSON file
function loadWalletConfigs(): WalletConfig[] {
  const configFile = path.join(__dirname, 'wallets.json')
  
  if (!fs.existsSync(configFile)) {
    console.error('❌ ERROR: wallets.json not found')
    console.log('\nPlease create wallets.json with format:')
    console.log(`[
  {
    "jwtToken": "eyJ...",
    "ephemeralSecretKey": "suiprivkey1...",
    "randomness": "123...",
    "maxEpoch": 50,
    "zkProof": { ... },
    "salt": "0000000001"
  },
  ...
]`)
    process.exit(1)
  }

  try {
    const configs = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
    
    if (!Array.isArray(configs)) {
      throw new Error('wallets.json must be an array')
    }

    // Validate each config
    const required = ['jwtToken', 'ephemeralSecretKey', 'randomness', 'maxEpoch', 'zkProof', 'salt']
    for (let i = 0; i < configs.length; i++) {
      for (const field of required) {
        if (!configs[i][field]) {
          throw new Error(`Wallet ${i}: Missing required field: ${field}`)
        }
      }
    }

    return configs
  } catch (error: any) {
    console.error('❌ ERROR: Invalid wallets.json format:', error.message)
    process.exit(1)
  }
}

// Request faucet
async function requestFaucet(address: string): Promise<boolean> {
  try {
    const response = await fetch(FAUCET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FixedAmountRequest: { recipient: address }
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Faucet failed for ${address}: ${error}`)
      return false
    }

    return true
  } catch (error) {
    console.error(`Faucet error for ${address}:`, error)
    return false
  }
}

// Execute transfer
async function executeTransfer(
  sender: WalletData,
  recipient: string
): Promise<string | null> {
  try {
    // Create ephemeral keypair from secret key
    const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(sender.config.ephemeralSecretKey)

    // Create transaction
    const txb = new Transaction()
    const [coin] = txb.splitCoins(txb.gas, [TRANSFER_AMOUNT])
    txb.transferObjects([coin], recipient)
    txb.setSender(sender.address)

    // Sign with ephemeral key
    const { bytes, signature: userSignature } = await txb.sign({
      client: SUI_CLIENT,
      signer: ephemeralKeyPair,
    })

    // Generate address seed
    const payload = jwtDecode<JwtPayload>(sender.config.jwtToken)
    const audString = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud
    const addressSeed = genAddressSeed(
      BigInt(sender.config.salt),
      'sub',
      payload.sub!,
      audString!
    ).toString()

    // Create zkLogin signature (use precomputed zkProof from config)
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
        ...sender.config.zkProof,
        addressSeed,
      },
      maxEpoch: sender.config.maxEpoch,
      userSignature,
    })

    // Execute transaction
    const result = await SUI_CLIENT.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkLoginSignature,
    })

    console.log(`✓ ${sender.address.slice(0, 8)}... → ${recipient.slice(0, 8)}... - ${result.digest}`)
    return result.digest
  } catch (error: any) {
    console.error(`Transfer failed: ${error.message}`)
    return null
  }
}

// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Main
async function main() {
  console.log('🚀 zkLogin Multi-JWT Transaction Generator\n')

  // Load wallet configurations
  console.log('📂 Loading wallet configurations...')
  const configs = loadWalletConfigs()
  console.log(`✓ Loaded ${configs.length} wallet configurations\n`)

  // Initialize wallets
  console.log('📝 Initializing wallets...\n')
  const wallets: WalletData[] = configs.map((config, index) => {
    const address = jwtToAddress(config.jwtToken, config.salt)
    console.log(`Wallet ${index + 1}: ${address}`)
    
    return {
      address,
      config,
      txDigests: []
    }
  })

  console.log(`\n✓ Initialized ${wallets.length} wallets\n`)

  // Request faucet for all wallets
  console.log('💧 Requesting faucet for all wallets...\n')

  for (let i = 0; i < wallets.length; i++) {
    const success = await requestFaucet(wallets[i].address)
    if (success) {
      console.log(`✓ Faucet ${i + 1}/${wallets.length}: ${wallets[i].address.slice(0, 10)}...`)
    }
    await delay(2000) // Rate limit
    
    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i + 1}/${wallets.length}`)
    }
  }

  console.log('\n✓ Faucet requests completed')
  console.log('⏳ Waiting 15 seconds for confirmations...\n')
  await delay(15000)

  // Execute transfers
  console.log(`💸 Executing transfers to reach ${TOTAL_TRANSACTIONS} transactions...\n`)

  let transactionCount = 0
  const transactionsPerWallet = Math.ceil(TOTAL_TRANSACTIONS / wallets.length)

  for (let round = 0; round < transactionsPerWallet; round++) {
    console.log(`\n--- Round ${round + 1}/${transactionsPerWallet} ---\n`)

    for (let i = 0; i < wallets.length; i++) {
      if (transactionCount >= TOTAL_TRANSACTIONS) break

      const sender = wallets[i]
      const recipientIndex = (i + 1) % wallets.length
      const recipient = wallets[recipientIndex].address

      const digest = await executeTransfer(sender, recipient)
      
      if (digest) {
        sender.txDigests.push(digest)
        transactionCount++
      }

      await delay(1500) // Rate limit

      if (transactionCount % 10 === 0) {
        console.log(`\nProgress: ${transactionCount}/${TOTAL_TRANSACTIONS} transactions`)
      }
    }

    if (transactionCount >= TOTAL_TRANSACTIONS) break
    
    console.log('\n⏳ Waiting 5 seconds before next round...')
    await delay(5000)
  }

  console.log(`\n✓ Completed ${transactionCount} transactions\n`)

  // Save results
  console.log('💾 Saving transaction data...\n')

  const results = wallets.map(wallet => ({
    address: wallet.address,
    txDigests: wallet.txDigests
  }))

  const outputDir = path.join(process.cwd(), 'transaction-reports')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputFile = path.join(outputDir, `transactions-${timestamp}.json`)

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2))

  console.log(`✓ Saved to: ${outputFile}\n`)

  // Summary
  console.log('📊 Summary:\n')
  console.log(`Total Wallets: ${wallets.length}`)
  console.log(`Total Transactions: ${transactionCount}`)
  console.log(`Average per Wallet: ${(transactionCount / wallets.length).toFixed(2)}`)
  console.log(`Wallets with Txs: ${results.filter(r => r.txDigests.length > 0).length}`)
  console.log(`\nOutput: ${outputFile}\n`)

  console.log('✅ Script completed successfully!\n')
}

main().catch(console.error)
