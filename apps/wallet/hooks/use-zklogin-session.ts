'use client'

import { useCallback } from 'react'
import {
  useSessionStorage,
  useSessionStorageString,
} from '@/hooks/use-session-storage'

// ZkLogin proof response from prover service
// This matches the PartialZkLoginSignature type (inputs without addressSeed)
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

/**
 * Custom hook for managing zkLogin session data
 * Provides safe access to all zkLogin-related sessionStorage values
 */
export function useZkLoginSession() {
  const [ephemeralSecretKey, setEphemeralSecretKey, clearEphemeralSecretKey] = useSessionStorageString('ephemeralSecretKey', '')
  const [randomness, setRandomness, clearRandomness] = useSessionStorageString('randomness', '')
  const [nonce, setNonce, clearNonce] = useSessionStorage('nonce', '')
  const [zkProof, setZkProof, clearZkProof] = useSessionStorage<ZkLoginProofResponse | null>('zkProof', null)
  const [maxEpoch, setMaxEpoch, clearMaxEpoch] = useSessionStorage('maxEpoch', 0)
  const [idToken, setIdToken, clearIdToken] = useSessionStorageString('idToken', '')

  // Get complete session data
  const getSession = useCallback((): ZkLoginSession | null => {
    if (typeof window === 'undefined') {
      return null
    }
    
    try {
      // Read directly from session storage to avoid state timing issues
      const ephemeralSecretKey = sessionStorage.getItem('ephemeralSecretKey')
      const randomness = sessionStorage.getItem('randomness')
      const nonce = sessionStorage.getItem('nonce')
      const zkProofStr = sessionStorage.getItem('zkProof')
      const maxEpochStr = sessionStorage.getItem('maxEpoch')
      const idToken = sessionStorage.getItem('idToken')
      
      if (!ephemeralSecretKey || !randomness || !nonce || !maxEpochStr) {
        return null
      }
      
      // Parse only the complex objects, strings are stored directly
      const zkProof = zkProofStr ? JSON.parse(zkProofStr) : null
      const maxEpoch = parseInt(maxEpochStr, 10)
      
      return {
        ephemeralSecretKey,
        randomness,
        nonce,
        zkProof,
        maxEpoch,
        idToken: idToken || ''
      }
    } catch (error) {
      console.error('Error reading session from storage:', error)
      return null
    }
  }, [])

  // Set complete session data
  const setSession = useCallback((session: ZkLoginSession) => {
    setEphemeralSecretKey(session.ephemeralSecretKey)
    setRandomness(session.randomness)
    setNonce(session.nonce)
    setZkProof(session.zkProof)
    setMaxEpoch(session.maxEpoch)
    setIdToken(session.idToken)
  }, [setEphemeralSecretKey, setRandomness, setNonce, setZkProof, setMaxEpoch, setIdToken])

  // Clear all session data
  const clearSession = useCallback(() => {
    clearEphemeralSecretKey()
    clearRandomness()
    clearNonce()
    clearZkProof()
    clearMaxEpoch()
    clearIdToken()
  }, [clearEphemeralSecretKey, clearRandomness, clearNonce, clearZkProof, clearMaxEpoch, clearIdToken])

  // Check if session is valid
  const isValid = useCallback((): boolean => {
    return !!(ephemeralSecretKey && randomness && nonce && zkProof && maxEpoch)
  }, [ephemeralSecretKey, randomness, nonce, zkProof, maxEpoch])

  return {
    // Individual values
    ephemeralSecretKey,
    randomness,
    nonce,
    zkProof,
    maxEpoch,
    idToken,
    
    // Individual setters
    setEphemeralSecretKey,
    setRandomness,
    setNonce,
    setZkProof,
    setMaxEpoch,
    setIdToken,
    
    // Individual clearers
    clearEphemeralSecretKey,
    clearRandomness,
    clearNonce,
    clearZkProof,
    clearMaxEpoch,
    clearIdToken,
    
    // Session management
    getSession,
    setSession,
    clearSession,
    isValid
  }
}
