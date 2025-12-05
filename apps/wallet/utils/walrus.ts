/**
 * Walrus client for storing and retrieving encrypted files
 */

import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { getZkLoginSignature, genAddressSeed } from '@mysten/sui/zklogin'
import { jwtDecode } from 'jwt-decode'
import { SealClient, SessionKey, EncryptedObject } from '@mysten/seal'
import type { SealCompatibleClient } from '@mysten/seal'
import { toHex, fromHex } from '@mysten/sui/utils'

// Configuration
const WALRUS_PUBLISHER_URL = 'https://sm1-walrus-testnet-publisher.stakesquid.com'
const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space'
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io'
const PACKAGE_ID_SUI = '0x61e63e14c2cdd01bd11f997975352bf8dee606c6a595014fad75e06d3bf4429e'
const FILE_REGISTRY_ID = '0x5c4e8f436b6c7b135cb22846281a6ed068090671492a280877634c74b41cf293'
const SEAL_THRESHOLD = 2 // Minimum 2 key servers needed to decrypt

// Seal Key Servers (testnet)
const SEAL_KEY_SERVERS = [
  {
    objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
    weight: 1
  },
  {
    objectId: '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
    weight: 1
  }
]

interface UploadResult {
  blobId: string
  fileObjectId: string
  txDigest: string
}

export interface FileMetadata {
  filename: string
  mimetype: string
  size: number
  blobId: string
  owner: string
  allowedAddresses: string[]
}

// ZkLogin proof structure from prover
export interface ZkLoginProofResponse {
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

export interface ZkLoginSession {
  ephemeralSecretKey: string
  randomness: string
  nonce: string
  zkProof: ZkLoginProofResponse | null
  maxEpoch: number
  idToken: string
}

export class WalrusClient {
  private suiClient: SuiClient
  private sealClient: SealClient

  constructor() {
    this.suiClient = new SuiClient({ url: SUI_RPC_URL })
    
    // Initialize Seal client for threshold encryption
    const sealSuiClient = new SuiClient({ url: SUI_RPC_URL }) as unknown as SealCompatibleClient
    this.sealClient = new SealClient({
      suiClient: sealSuiClient,
      serverConfigs: SEAL_KEY_SERVERS,
      verifyKeyServers: false,
    })
  }

  /**
   * Upload PDF file to Walrus with Seal encryption
   */
  async uploadPDF(
    file: File,
    allowedAddresses: string[],
    zkLoginSession: ZkLoginSession
  ): Promise<UploadResult> {
    try {
      console.log(`📄 Uploading ${file.name} (${file.size} bytes)...`)

      // 1. Read file as buffer
      const buffer = await file.arrayBuffer()
      const fileData = new Uint8Array(buffer)

      // 2. Generate unique file ID for Seal encryption (policyObject + nonce)
      const nonce = crypto.getRandomValues(new Uint8Array(5))
      const policyObjectBytes = fromHex(FILE_REGISTRY_ID)
      const fileId = toHex(new Uint8Array([...policyObjectBytes, ...nonce]))
      
      console.log(`📝 File ID for encryption: ${fileId}`)

      // 3. Encrypt with Seal
      console.log('🔐 Encrypting with Seal...')
      const encryptedData = await this.encryptWithSeal(fileData, fileId)

      // 3. Compress encrypted data
      console.log('📦 Compressing...')
      const compressed = await this.compress(encryptedData)

      // 4. Store to Walrus
      console.log('☁️ Storing to Walrus...')
      const blobId = await this.storeToWalrus(compressed)

      // 5. Create file record on Sui blockchain
      console.log('⛓️ Creating file record on Sui...')
      const result = await this.createFileOnChain(
        {
          filename: file.name,
          blobId,
          mimetype: file.type,
          size: compressed.length,
          allowedAddresses
        },
        zkLoginSession
      )

      console.log('✅ Upload successful!')
      return {
        blobId,
        fileObjectId: result.fileObjectId,
        txDigest: result.digest
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('❌ Upload failed:', message)
      throw error
    }
  }

  /**
   * Store blob to Walrus network
   */
  private async storeToWalrus(data: Uint8Array): Promise<string> {
    const url = `${WALRUS_PUBLISHER_URL}/v1/store?epochs=2`

    const response = await fetch(url, {
      method: 'PUT',
      body: data.buffer as ArrayBuffer
    })

    if (!response.ok) {
      throw new Error(`Walrus store failed: ${response.status}`)
    }

    const result = await response.json()

    // Extract blob ID
    let blobId = ''
    if (result.alreadyCertified) {
      blobId = result.alreadyCertified.blobId
    } else if (result.newlyCreated) {
      blobId = result.newlyCreated.blobObject.blobId
    } else {
      throw new Error('No blobId in response')
    }

    console.log(`✓ Blob stored: ${blobId}`)
    return blobId
  }

  /**
   * Create file record on Sui blockchain with zkLogin
   */
  private async createFileOnChain(
    metadata: {
      filename: string
      blobId: string
      mimetype: string
      size: number
      allowedAddresses: string[]
    },
    zkLoginSession: ZkLoginSession
  ): Promise<{ fileObjectId: string; digest: string }> {
    const tx = new Transaction()

    // Reconstruct ephemeral keypair from session (Bech32 format)
    const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
      zkLoginSession.ephemeralSecretKey
    )

    // Get sender address
    const payload = jwtDecode<{ sub: string; aud: string | string[] }>(zkLoginSession.idToken)
    const audString = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud
    if (!audString) {
      throw new Error('JWT aud claim is required')
    }
    const addressSeed = genAddressSeed(
      BigInt(zkLoginSession.randomness),
      'sub',
      payload.sub,
      audString
    ).toString()

    // Calculate zkLogin address
    const publicKey = ephemeralKeyPair.getPublicKey()
    const senderAddress = publicKey.toSuiAddress()

    tx.setSender(senderAddress)

    // Call FileSharing::create_file
    tx.moveCall({
      target: `${PACKAGE_ID_SUI}::FileSharing::create_file`,
      arguments: [
        tx.object(FILE_REGISTRY_ID),
        tx.pure.string(metadata.filename),
        tx.pure.string(metadata.blobId),
        tx.pure.string(metadata.mimetype),
        tx.pure.u64(metadata.size),
        tx.pure.address(senderAddress),
        tx.makeMoveVec({
          type: 'address',
          elements: metadata.allowedAddresses.map(addr => tx.pure.address(addr))
        }),
        tx.object('0x6') // Clock object
      ]
    })

    // Sign with ephemeral key
    const { bytes, signature: userSignature } = await tx.sign({
      client: this.suiClient,
      signer: ephemeralKeyPair
    })

    // Create zkLogin signature
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
        ...zkLoginSession.zkProof,
        addressSeed
      } as Parameters<typeof getZkLoginSignature>[0]['inputs'],
      maxEpoch: zkLoginSession.maxEpoch,
      userSignature
    })

    // Execute transaction
    const result = await this.suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkLoginSignature,
      options: {
        showEffects: true,
        showEvents: true
      }
    })

    if (!result.events || result.events.length === 0) {
      throw new Error('No events in transaction')
    }

    const event = result.events[0]
    if (!event || !event.parsedJson) {
      throw new Error('No parsedJson in event')
    }
    const { file_id } = event.parsedJson as { file_id: string }

    return {
      fileObjectId: file_id,
      digest: result.digest
    }
  }

  /**
   * Download and decrypt file from Walrus
   */
  async downloadPDF(
    blobId: string,
    fileObjectId: string,
    zkLoginSession: ZkLoginSession
  ): Promise<Blob> {
    try {
      console.log(`📥 Downloading blob: ${blobId}...`)

      // 1. Retrieve from Walrus
      const compressed = await this.retrieveFromWalrus(blobId)

      // 2. Decompress
      console.log('📦 Decompressing...')
      const encrypted = await this.decompress(compressed)

      // 3. Decrypt with Seal
      console.log('🔓 Decrypting with zkLogin...')
      const decrypted = await this.decryptWithSeal(encrypted, zkLoginSession, fileObjectId)

      console.log('✅ Download successful!')
      return new Blob([decrypted.buffer as ArrayBuffer], { type: 'application/pdf' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('❌ Download failed:', message)
      throw error
    }
  }

  /**
   * Retrieve blob from Walrus
   */
  private async retrieveFromWalrus(blobId: string): Promise<Uint8Array> {
    const url = `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Walrus retrieve failed: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  /**
   * Encrypt data with Seal using threshold encryption
   */
  private async encryptWithSeal(
    data: Uint8Array,
    fileId: string
  ): Promise<Uint8Array> {
    try {
      console.log('🔐 Encrypting with Seal threshold encryption...')
      
      const { encryptedObject } = await this.sealClient.encrypt({
        data,
        packageId: PACKAGE_ID_SUI,
        id: fileId,
        threshold: SEAL_THRESHOLD, // Consistent threshold
      })
      
      console.log(`✓ Seal encryption complete (${encryptedObject.length} bytes)`)
      return new Uint8Array(encryptedObject)
    } catch (error) {
      console.error('Seal encryption failed:', error)
      throw new Error(`Failed to encrypt with Seal: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Decrypt data with Seal using SessionKey + seal_approve
   * Full implementation based on SecureFileShare example, adapted for zkLogin
   */
  private async decryptWithSeal(
    encryptedData: Uint8Array,
    zkLoginSession: ZkLoginSession,
    fileObjectId: string
  ): Promise<Uint8Array> {
    try {
      console.log('🔓 Decrypting with Seal (zkLogin + SessionKey flow)...')
      
      // Get user address from zkLogin session
      const payload = jwtDecode<{ sub: string; aud: string | string[] }>(zkLoginSession.idToken)
      const audString = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud
      if (!audString) {
        throw new Error('JWT aud claim is required')
      }
      
      // Reconstruct ephemeral keypair (Bech32 format)
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
        zkLoginSession.ephemeralSecretKey
      )
      const userAddress = ephemeralKeyPair.getPublicKey().toSuiAddress()
      
      // Try to load cached SessionKey from sessionStorage
      let sessionKey: SessionKey | null = null
      const cacheKey = `seal_session_${userAddress}`
      
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const exportedKey = JSON.parse(cached)
          const imported = await SessionKey.import(exportedKey, this.suiClient as unknown as SealCompatibleClient)
          if (imported && !imported.isExpired() && imported.getAddress() === userAddress) {
            sessionKey = imported
            console.log('✓ Using cached SessionKey')
          } else {
            sessionStorage.removeItem(cacheKey)
          }
        }
      } catch (error) {
        console.warn('Failed to import cached SessionKey:', error)
        sessionStorage.removeItem(cacheKey)
      }
      
      // Create new SessionKey if not cached or expired
      if (!sessionKey) {
        console.log('Creating new SessionKey...')
        sessionKey = await SessionKey.create({
          address: userAddress,
          packageId: PACKAGE_ID_SUI,
          ttlMin: 30,
          suiClient: this.suiClient as unknown as SealCompatibleClient,
        })
        
        // Sign personal message with ephemeral key
        const personalMessage = sessionKey.getPersonalMessage()
        const signatureBytes = await ephemeralKeyPair.sign(personalMessage)
        const signatureBase64 = Buffer.from(signatureBytes).toString('base64')
        await sessionKey.setPersonalMessageSignature(signatureBase64)
        
        // Cache for future use
        try {
          const exportedKey = sessionKey.export()
          sessionStorage.setItem(cacheKey, JSON.stringify(exportedKey))
        } catch (error) {
          console.warn('Failed to cache SessionKey:', error)
        }
      }
      
      // Parse sealId from encrypted data
      const sealId = EncryptedObject.parse(encryptedData).id
      console.log('Seal ID:', sealId)
      
      // Create seal_approve transaction
      const tx = new Transaction()
      tx.moveCall({
        target: `${PACKAGE_ID_SUI}::FileSharing::seal_approve`,
        arguments: [
          tx.pure.vector('u8', fromHex(sealId)),
          tx.object(FILE_REGISTRY_ID),
          tx.object(fileObjectId),
        ],
      })
      
      const txBytes = await tx.build({
        client: this.suiClient,
        onlyTransactionKind: true,
      })
      
      console.log('Fetching decryption keys from Seal servers...')
      await this.sealClient.fetchKeys({
        ids: [sealId],
        txBytes,
        sessionKey,
        threshold: SEAL_THRESHOLD,
      })
      
      console.log('Decrypting data...')
      const decryptedData = await this.sealClient.decrypt({
        data: encryptedData,
        sessionKey,
        txBytes,
      })
      
      console.log('✓ Seal decryption complete')
      return decryptedData instanceof Uint8Array 
        ? decryptedData 
        : new TextEncoder().encode(decryptedData)
    } catch (error) {
      console.error('Seal decryption failed:', error)
      throw new Error(`Failed to decrypt with Seal: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Compress data using gzip
   */
  private async compress(data: Uint8Array): Promise<Uint8Array> {
    // Use CompressionStream if available
    if (typeof CompressionStream !== 'undefined') {
      const stream = new Blob([data.buffer as ArrayBuffer]).stream()
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
      const blob = await new Response(compressedStream).blob()
      return new Uint8Array(await blob.arrayBuffer())
    }
    
    // Fallback: no compression
    console.warn('⚠️ Compression not available')
    return data
  }

  /**
   * Decompress data using gzip
   */
  private async decompress(data: Uint8Array): Promise<Uint8Array> {
    // Use DecompressionStream if available
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([data.buffer as ArrayBuffer]).stream()
      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
      const blob = await new Response(decompressedStream).blob()
      return new Uint8Array(await blob.arrayBuffer())
    }
    
    // Fallback: no decompression
    console.warn('⚠️ Decompression not available')
    return data
  }

  /**
   * Get file metadata from Sui blockchain
   */
  async getFileMetadata(fileObjectId: string): Promise<FileMetadata> {
    const object = await this.suiClient.getObject({
      id: fileObjectId,
      options: { showContent: true }
    })

    if (!object.data || !object.data.content) {
      throw new Error('File object not found')
    }

    const content = object.data.content as { fields: Record<string, unknown> }
    const fields = content.fields as {
      filename: string
      mimetype: string
      size: string
      blob_id: string
      owner: string
      allowed_addresses: string[]
    }

    return {
      filename: fields.filename,
      mimetype: fields.mimetype,
      size: parseInt(fields.size),
      blobId: fields.blob_id,
      owner: fields.owner,
      allowedAddresses: fields.allowed_addresses || []
    }
  }

  /**
   * List user's files
   */
  async listUserFiles(ownerAddress: string): Promise<FileMetadata[]> {
    // Query file objects owned by user
    const objects = await this.suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: `${PACKAGE_ID_SUI}::FileSharing::File`
      },
      options: { showContent: true }
    })

    const files: FileMetadata[] = []
    for (const obj of objects.data) {
      if (obj.data?.content) {
        const content = obj.data.content as { fields: Record<string, unknown> }
        const fields = content.fields as {
          filename: string
          mimetype: string
          size: string
          blob_id: string
          owner: string
          allowed_addresses: string[]
        }
        files.push({
          filename: fields.filename,
          mimetype: fields.mimetype,
          size: parseInt(fields.size),
          blobId: fields.blob_id,
          owner: fields.owner,
          allowedAddresses: fields.allowed_addresses || []
        })
      }
    }

    return files
  }
}
