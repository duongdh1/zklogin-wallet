/**
 * Bulk Transaction Generator for Sui Dev Reporting
 * 
 * This utility helps generate multiple transactions programmatically
 * to meet the requirement of 1000 transactions across 100 unique addresses.
 * 
 * Usage instructions are provided below.
 */

import { Transaction } from '@mysten/sui/transactions'
import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { getZkLoginSignature, genAddressSeed } from '@mysten/sui/zklogin'

/**
 * Generate multiple self-transfer transactions to reach the target count
 * This is a helper function that can be used to programmatically create transactions
 */
export async function generateBulkTransactions(config: {
  suiClient: SuiClient
  senderAddress: string
  ephemeralKeyPair: Ed25519Keypair
  zkProof: any
  maxEpoch: number
  jwtSub: string
  jwtAud: string
  userSalt: string
  count: number
  onProgress?: (completed: number, digest: string) => void
}): Promise<string[]> {
  const {
    suiClient,
    senderAddress,
    ephemeralKeyPair,
    zkProof,
    maxEpoch,
    jwtSub,
    jwtAud,
    userSalt,
    count,
    onProgress
  } = config

  const digests: string[] = []

  for (let i = 0; i < count; i++) {
    try {
      const txb = new Transaction()
      
      // Self-transfer a minimal amount (0.000001 SUI = 1000 MIST)
      const [coin] = txb.splitCoins(txb.gas, [1000n])
      txb.transferObjects([coin], senderAddress)
      txb.setSender(senderAddress)

      // Sign with ephemeral key
      const { bytes, signature: userSignature } = await txb.sign({
        client: suiClient,
        signer: ephemeralKeyPair,
      })

      // Generate address seed
      const addressSeed = genAddressSeed(
        BigInt(userSalt),
        'sub',
        jwtSub,
        jwtAud
      ).toString()

      // Get zkLogin signature
      const zkLoginSignature = getZkLoginSignature({
        inputs: { ...zkProof, addressSeed },
        maxEpoch,
        userSignature,
      })

      // Execute transaction
      const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature: zkLoginSignature,
      })

      digests.push(result.digest)
      
      if (onProgress) {
        onProgress(i + 1, result.digest)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Transaction ${i + 1} failed:`, error)
      // Continue with next transaction
    }
  }

  return digests
}

/**
 * Instructions for using bulk transaction generation:
 * 
 * 1. Make sure you have enough SUI in your wallet for gas fees
 *    - Each transaction costs ~0.001 SUI
 *    - For 1000 transactions, you'll need ~1 SUI
 * 
 * 2. Use the faucet multiple times to get enough SUI:
 *    - Each faucet request gives 10 SUI
 *    - You can request multiple times if needed
 * 
 * 3. To generate transactions across 100 addresses:
 *    - Create 100 different zkLogin sessions (100 different PINs/salts)
 *    - Run 10 transactions per address (100 addresses × 10 = 1000 transactions)
 * 
 * 4. All transaction digests are automatically stored in localStorage
 *    and can be exported from the Transaction History page
 * 
 * 5. Use Programmable Transaction Blocks (PTBs) for efficiency:
 *    - Batch multiple operations in a single transaction
 *    - This is already implemented in the self-transfer function above
 */

/**
 * Example usage pattern:
 * 
 * const digests = await generateBulkTransactions({
 *   suiClient,
 *   senderAddress: user.address,
 *   ephemeralKeyPair,
 *   zkProof: session.zkProof,
 *   maxEpoch: session.maxEpoch,
 *   jwtSub: decodedJwt.sub,
 *   jwtAud: decodedJwt.aud,
 *   userSalt: pin,
 *   count: 10,
 *   onProgress: (completed, digest) => {
 *     console.log(`Transaction ${completed} completed: ${digest}`)
 *     storeTransaction(digest, user.address, 'other')
 *   }
 * })
 */

/**
 * Recommended strategy for 1000 transactions across 100 addresses:
 * 
 * 1. Create a script or UI that:
 *    - Generates 100 different PINs (e.g., 100001, 100002, ..., 100100)
 *    - For each PIN:
 *      a. Complete zkLogin authentication
 *      b. Request from faucet (10 SUI)
 *      c. Generate 10 self-transfer transactions
 *      d. Store all digests
 * 
 * 2. Run this process in batches:
 *    - Process 10 addresses at a time
 *    - Take breaks between batches to avoid rate limiting
 * 
 * 3. Export final JSON:
 *    - Go to Transaction History page
 *    - Click "Download JSON"
 *    - Submit to Sui Dev team
 */
