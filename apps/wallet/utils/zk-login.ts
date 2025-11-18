// zkLogin utility functions for Cognito OAuth flow and ZK proof generation

import { SuiClient } from '@mysten/sui/client'
import type { ZkLoginProof } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { 
  generateNonce,
  generateRandomness,
  jwtToAddress
} from '@mysten/sui/zklogin'
// @ts-ignore
import { jwtDecode } from 'jwt-decode'
import { ZkLoginSession } from '@/hooks/use-zklogin-session'

// zkLogin proof generation options
const PROVER_URL = 'https://prover-dev.mystenlabs.com/v1'

// JWT payload interface
interface JwtPayload {
  iss?: string
  sub?: string
  aud?: string[] | string
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
  email?: string
  name?: string
  nonce?: string
}

export function validateZkLoginSession(session: ZkLoginSession | null): boolean {
  if (!session) return false
  
  try {
    // Check if all required fields are present
    if (!session.ephemeralSecretKey || !session.zkProof || !session.maxEpoch) {
      return false
    }

    // Check if the session is still valid (not expired)
    // In a real implementation, you would check the current epoch against maxEpoch
    // For now, we'll just check if the data exists
    return true
  } catch (error) {
    console.error('Failed to validate zkLogin session:', error)
    return false
  }
}

// Helper functions for zkLogin OAuth flow
export async function generateZkLoginProof(
  jwt: JwtPayload, 
  ephemeralKeyPair: Ed25519Keypair,
  maxEpoch: number, 
  randomness: string,
  jwtToken: string,
  salt: string
): Promise<ZkLoginProof> {
  try {
    console.log('Generating zkLogin proof...')

    console.log('Ephemeral key pair:', ephemeralKeyPair)
    console.log('Randomness:', randomness)
    console.log('Max epoch:', maxEpoch)
    console.log('JWT:', jwtToken)
    console.log('Salt:', salt)
    
    const response = await fetch(PROVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jwt: jwtToken,
        extendedEphemeralPublicKey: ephemeralKeyPair.getPublicKey().toBase64(),
        jwtRandomness: randomness,
        maxEpoch: maxEpoch.toString(),
        keyClaimName: 'sub',
        keyClaimValue: jwt.sub,
        salt: btoa(salt),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Prover service error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const responseData = await response.json()

    
    // Transform the response to match ZkLoginProof type
    return {
      a: responseData.proofPoints.a,
      b: responseData.proofPoints.b,
      c: responseData.proofPoints.c
    }
  } catch (error) {
    console.error('Failed to generate ZK proof:', error)
    throw error
  }
}

export async function processOAuthCallback(
  idToken: string,
  userSalt: string,
  zkLoginSessionData: ZkLoginSession
): Promise<{
  user: {
    address: string
    provider: string
    sub: string
    email?: string
    name?: string
  }
  zkLoginSessionData: ZkLoginSession
}> {
  // Decode JWT
  const decodedJwt = jwtDecode(idToken) as JwtPayload
  
  if (!decodedJwt.sub || !decodedJwt.aud || !decodedJwt.nonce) {
    throw new Error('Invalid JWT: missing required fields')
  }

  if (!userSalt) {
    throw new Error('User salt is required.')
  }

  // Use the ephemeral key pair from OAuth flow
  console.log('Stored secret key string:', zkLoginSessionData.ephemeralSecretKey)
  
  // Recreate the keypair from the stored secret key
  const ephemeralKeyPair: Ed25519Keypair = Ed25519Keypair.fromSecretKey(zkLoginSessionData.ephemeralSecretKey)
  
  const zkProof = await generateZkLoginProof(
    decodedJwt, 
    ephemeralKeyPair,
    zkLoginSessionData.maxEpoch, 
    zkLoginSessionData.randomness, 
    idToken,
    userSalt
  )
  
  // Generate Sui address
  console.log('zkProof:', zkProof)
  console.log('userSalt:', userSalt)
  const suiAddress = jwtToAddress(idToken, userSalt)
  console.log('suiAddress:', suiAddress)
  
  return {
    user: {
      address: suiAddress,
      provider: 'cognito',
      sub: decodedJwt.sub,
      email: decodedJwt.email || '',
      name: decodedJwt.name || ''
    },
    zkLoginSessionData: {
      ...zkLoginSessionData,
      zkProof,
      idToken,
    }
  }
}

/**
 * Prepare zkLogin session data for Cognito OAuth
 * Returns session data to be stored while user completes OAuth flow
 */
export async function prepareZkLoginSession(
  idToken: string,
  userSalt: string,
  options?: {
    fallbackUserId?: string
    email?: string
  }
): Promise<void> {
  // Get Sui client
  const suiClient = new SuiClient({ url: 'https://fullnode.devnet.sui.io' })
  
  // Decode JWT
  const decodedJwt = jwtDecode(idToken) as JwtPayload
  
  if (!decodedJwt.sub || !decodedJwt.aud || !decodedJwt.nonce) {
    throw new Error('Invalid JWT: missing required fields')
  }

  // Extract nonce from JWT
  const nonce = decodedJwt.nonce

  // Retrieve stored zkLogin session data from sessionStorage
  const storedSessionData = typeof window !== 'undefined' 
    ? sessionStorage.getItem('zkLoginSessionData')
    : null

  if (!storedSessionData) {
    throw new Error('No zkLogin session data found. Please start login flow again.')
  }

  const zkLoginSessionData: ZkLoginSession = JSON.parse(storedSessionData)

  // Verify nonce matches
  if (zkLoginSessionData.nonce !== nonce) {
    throw new Error('Nonce mismatch. Please try logging in again.')
  }

  // Process OAuth callback to generate zkProof
  const result = await processOAuthCallback(idToken, userSalt, zkLoginSessionData)

  // Store the completed zkLogin session
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('zkLoginSessionData', JSON.stringify(result.zkLoginSessionData))
  }
}

/**
 * Initialize zkLogin session before OAuth flow
 * Returns nonce to be included in OAuth request
 */
export async function initializeZkLoginSession(suiClient: SuiClient): Promise<{
  zkLoginSessionData: ZkLoginSession
  nonce: string
}> {
  // Generate ephemeral key pair
  const ephemeralKeyPair = new Ed25519Keypair()
  const randomness = generateRandomness()
  
  // Get current epoch info
  const { epoch } = await suiClient.getLatestSuiSystemState()
  const maxEpoch = Number(epoch) + 2
  
  // Generate nonce
  const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness)
  
  // Prepare OAuth flow data to be stored
  const secretKeyString = ephemeralKeyPair.getSecretKey()
  console.log('Secret key string:', secretKeyString)
  
  const zkLoginSessionData: ZkLoginSession = {
    ephemeralSecretKey: secretKeyString,
    randomness,
    nonce,
    zkProof: null,
    maxEpoch,
    idToken: '' // Will be set during OAuth callback
  }

  return { zkLoginSessionData, nonce }
}
