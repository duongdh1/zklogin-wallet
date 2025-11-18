// Sui API service for fetching wallet data and token prices
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { normalizeSuiAddress } from '@mysten/sui/utils'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { getZkLoginSignature, genAddressSeed } from '@mysten/sui/zklogin'
import { ZkLoginSession } from '@/hooks/use-zklogin-session'
// @ts-ignore
import { jwtDecode } from 'jwt-decode'

export interface TokenBalance {
  symbol: string
  name: string
  balance: string
  usdValue: string
  price: number
  coinType: string
}

export interface TransactionRecord {
  id: string
  type: 'send' | 'receive'
  amount: string
  symbol: string
  to?: string
  from?: string
  status: 'completed' | 'pending' | 'failed'
  timestamp: string
  hash: string
  gasFee?: string
}

export const SUI_CHAINS = {
  DEVNET: 'devnet',
  TESTNET: 'testnet',
  MAINNET: 'mainnet'
}

export const SUI_DECIMALS = 9

// Convert SUI amount string to MIST (smallest unit) using BigInt for precision
export function toMist(amount: string): bigint {
  const [intPart, fracPart = ''] = amount.split('.')
  const frac9 = (fracPart + '000000000').slice(0, 9)
  return BigInt(intPart || '0') * BigInt(1_000_000_000) + BigInt(frac9)
}

// Helper function to extract JWT header and issuer information
function extractJwtInfo(idToken: string): { headerBase64: string; issBase64Details: { value: string; indexMod4: number } } {
  try {
    // Decode JWT header
    const header = jwtDecode(idToken, { header: true }) as any
    const headerBase64 = btoa(JSON.stringify(header))
    
    // Decode JWT payload to get issuer
    const payload = jwtDecode(idToken) as any
    const issuer = payload.iss || ''
    
    // Calculate indexMod4 for issuer
    const indexMod4 = issuer.length % 4
    
    return {
      headerBase64,
      issBase64Details: {
        value: issuer,
        indexMod4
      }
    }
  } catch (error) {
    console.error('Failed to extract JWT info:', error)
    // Return fallback values
    return {
      headerBase64: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9', // Base64 of {"alg":"RS256","typ":"JWT"}
      issBase64Details: {
        value: 'https://accounts.google.com',
        indexMod4: 0
      }
    }
  }
}

// Token metadata mapping
export const TOKEN_METADATA: { [key: string]: { symbol: string; name: string; decimals: number } } = {
  '0x2::sui::SUI': { symbol: 'SUI', name: 'Sui', decimals: 9 },
  '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  '0xaf8cd5edc19c4512f4259f0bee101a40d41eb83173818fbd0dbea56b6f4a8bf5::coin::COIN': { symbol: 'WETH', name: 'Wrapped Ethereum', decimals: 8 },
}

// Sui client instance
export const suiClient = new SuiClient({ url: 'https://fullnode.devnet.sui.io' })

export async function fetchTransactions(address: string): Promise<TransactionRecord[]> {
  try {
    const normalizedAddress = normalizeSuiAddress(address)
    
    // Get transaction history for the address (both sent and received)
    const [sentTxns, receivedTxns] = await Promise.all([
      suiClient.queryTransactionBlocks({
        filter: {
          FromAddress: normalizedAddress,
        },
        options: {
          showEffects: true,
          showInput: true,
          showEvents: true,
        },
        limit: 10,
        order: 'descending'
      }),
      suiClient.queryTransactionBlocks({
        filter: {
          ToAddress: normalizedAddress,
        },
        options: {
          showEffects: true,
          showInput: true,
          showEvents: true,
        },
        limit: 10,
        order: 'descending'
      })
    ])

    const transactions: TransactionRecord[] = []
    
    // Process sent transactions
    for (const txn of sentTxns.data) {
      const effects = txn.effects
      const status = effects?.status?.status === 'success' ? 'completed' : 'failed'
      const timestamp = new Date(Number(txn.timestampMs || 0)).toLocaleString()
      
      // Extract amount from transaction effects
      const gasUsed = effects?.gasUsed?.computationCost || '0'
      const amount = '0' // This would need more complex parsing to extract actual transfer amounts
      
      transactions.push({
        id: txn.digest,
        type: 'send',
        amount: amount,
        symbol: 'SUI',
        status: status as 'completed' | 'pending' | 'failed',
        timestamp,
        hash: txn.digest,
        gasFee: gasUsed,
        to: 'Unknown', // Would need to parse from transaction
        from: normalizedAddress
      })
    }
    
    // Process received transactions
    for (const txn of receivedTxns.data) {
      const effects = txn.effects
      const status = effects?.status?.status === 'success' ? 'completed' : 'failed'
      const timestamp = new Date(Number(txn.timestampMs || 0)).toLocaleString()
      
      transactions.push({
        id: txn.digest,
        type: 'receive',
        amount: '0', // Would need to parse from transaction
        symbol: 'SUI',
        status: status as 'completed' | 'pending' | 'failed',
        timestamp,
        hash: txn.digest,
        gasFee: '0', // No gas fee for received transactions
        from: 'Unknown', // Would need to parse from transaction
        to: normalizedAddress
      })
    }
    
    // Sort by timestamp (newest first) and limit to 20
    transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return transactions.slice(0, 20)
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    // Return mock data on error for now
    return []
  }
}

// Transaction signing and creation functions
export async function signTransactionWithZkLogin(
  suiClient: SuiClient,
  transaction: Transaction,
  zkLoginSessionData: ZkLoginSession,
  userPin: string,
  userAddress: string
): Promise<string> {
  try {
    // Validate inputs
    if (!userPin || userPin.length === 0) {
      throw new Error('User PIN is required for transaction signing')
    }
    
    if (!zkLoginSessionData.ephemeralSecretKey) {
      throw new Error('Ephemeral secret key not found in session data')
    }


    // Create the ephemeral key pair
    const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(zkLoginSessionData.ephemeralSecretKey)

    // Use the provided user address
    const suiAddress = userAddress
    
    // Set the sender address
    transaction.setSender(suiAddress)

    // Sign the transaction with the ephemeral key pair
    const { bytes, signature: userSignature } = await transaction.sign({
      client: suiClient,
      signer: ephemeralKeyPair,
    })


    // Check if zkProof exists
    if (!zkLoginSessionData.zkProof) {
      throw new Error('ZK proof not found. Please complete the authentication process.')
    }

    // Extract JWT information
    const jwtInfo = extractJwtInfo(zkLoginSessionData.idToken)
    
    // Decode JWT to get aud (audience)
    const decodedJwt = jwtDecode(zkLoginSessionData.idToken) as any

    // Generate address seed from user PIN
    const addressSeed = genAddressSeed(
      BigInt(userPin),
      'sub',
      decodedJwt.sub,
      decodedJwt.aud
    ).toString()

    console.log('signature inputs', {
      inputs: {
        proofPoints: {
          a: zkLoginSessionData.zkProof.a,
          b: zkLoginSessionData.zkProof.b,
          c: zkLoginSessionData.zkProof.c,
        },
        issBase64Details: jwtInfo.issBase64Details,
        headerBase64: jwtInfo.headerBase64,
        addressSeed: addressSeed,
      },
      maxEpoch: zkLoginSessionData.maxEpoch,
      userSignature,
    });

    // Generate the zkLogin signature
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
        proofPoints: {
          a: zkLoginSessionData.zkProof.a,
          b: zkLoginSessionData.zkProof.b,
          c: zkLoginSessionData.zkProof.c,
        },
        issBase64Details: jwtInfo.issBase64Details,
        headerBase64: jwtInfo.headerBase64,
        addressSeed: addressSeed,
      },
      maxEpoch: zkLoginSessionData.maxEpoch,
      userSignature,
    })

    console.log('zkLoginSignature type:', typeof zkLoginSignature)
    console.log('zkLoginSignature length:', zkLoginSignature.length)
    console.log('First 100 chars:', zkLoginSignature.substring(0, 100))

    // Execute the transaction
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkLoginSignature,
    })

    return result.digest
  } catch (error) {
    console.error('Failed to sign transaction with zkLogin:', error)
    throw error
  }
}

export function createTransferTransaction(
  recipient: string,
  amount: string,
  coinType: string = '0x2::sui::SUI'
): Transaction {
  console.log('creating transfer transaction', {
    recipient,
    amount,
    coinType,
  })

  const txb = new Transaction()
  
  // Convert amount to MIST using BigInt for precision (following zklogin pattern)
  const amountMist = toMist(amount)
  
  // Split coins and transfer (no manual gas budget needed)
  const [coin] = txb.splitCoins(txb.gas, [amountMist])
  txb.transferObjects([coin], recipient)
  
  return txb
}

export function createSwapTransaction(
  fromCoinType: string,
  toCoinType: string,
  amount: string
): Transaction {
  const txb = new Transaction()
  
  // This is a simplified swap transaction
  // In a real implementation, you would integrate with a DEX protocol
  // For now, we'll just create a placeholder transaction
  
  // Split coins
  const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(amount)])
  
  // Placeholder for swap logic
  // In reality, this would call a swap function from a DEX package
  txb.moveCall({
    target: '0x2::coin::join',
    arguments: [txb.object(coin), txb.gas],
  })
  
  return txb
}

/**
 * Request SUI from devnet faucet
 * @param recipient Wallet address to receive SUI
 * @returns Promise that resolves when faucet request is complete
 */
export async function requestDevnetSui(recipient: string): Promise<{ success: boolean; message: string; digest?: string }> {
  try {
    const normalizedAddress = normalizeSuiAddress(recipient)
    
    // Request from devnet faucet (v2 endpoint gives 10 SUI)
    const response = await fetch('https://faucet.devnet.sui.io/v2/gas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        FixedAmountRequest: {
          recipient: normalizedAddress,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Faucet request failed: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Faucet response:', data)

    // Extract transaction digest from response if available
    const digest = data.task?.digest || data.transferredGasObjects?.[0]?.transferTxDigest

    return {
      success: true,
      message: 'Successfully requested 10 SUI from devnet faucet',
      digest,
    }
  } catch (error) {
    console.error('Faucet request failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to request from faucet',
    }
  }
}

/**
 * Create a transaction to mint an NFT
 * @param name NFT name
 * @param description NFT description
 * @param imageUrl NFT image URL
 * @returns Transaction object
 */
export function createMintNftTransaction(
  name: string,
  description: string,
  imageUrl: string
): Transaction {
  const txb = new Transaction()
  
  // Set gas budget
  txb.setGasBudget(10000000) // 0.01 SUI
  
  // Create NFT object using Move call
  // This uses the Sui framework's display standard
  txb.moveCall({
    target: '0x2::display::new',
    arguments: [
      txb.pure.string(name),
      txb.pure.string(description),
      txb.pure.string(imageUrl),
    ],
  })
  
  return txb
}
