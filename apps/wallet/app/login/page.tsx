'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@repo/ui/card'
import { getCognitoLoginUrl } from '@/utils/cognito-oauth'
import { extractTokensFromUrl, clearTokensFromUrl } from '@/utils/cognito-oauth'
import { persistCognitoTokens, clearCognitoTokens } from '@/utils/cognito-auth'
import { initializeZkLoginSession, processOAuthCallback } from '@/utils/zk-login'
import { useZkLoginSession } from '@/hooks/use-zklogin-session'
import { useAuth } from '@/contexts/auth-context'
import { LoginLayout } from '@/components/templates/login-layout'
import { SaltForm } from '@/components/organisms/salt-form'
import { LoadingSpinner } from '@/components/atoms/loading-spinner'
import { suiClient } from '@/utils/sui'
import { AlertCircle } from 'lucide-react'
import styles from './page.module.css'

// Sui network configuration
const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_CHAIN || 'devnet'

// Global flag to ensure we only process tokens once
let hasProcessedTokens = false

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()

  const zkLoginSession = useZkLoginSession()
  const [isConnecting, setIsConnecting] = useState(false)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [showPinInput, setShowPinInput] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false)

  // Check for OAuth callback from Cognito - run immediately on mount (only once)
  useEffect(() => {
    if (hasProcessedTokens || typeof window === 'undefined') {
      return
    }

    hasProcessedTokens = true

    try {
      console.log('🔍 Checking for OAuth tokens...')
      console.log('📍 URL:', window.location.href)
      console.log('📍 Hash:', window.location.hash)
      
      const { tokens, error } = extractTokensFromUrl()
      
      console.log('📦 Extracted tokens:', tokens ? 'YES' : 'NO')
      console.log('❌ Error:', error)
      
      if (error) {
        console.error('OAuth error:', error)
        setLoginError(`Authentication failed: ${error}`)
        return
      }

      if (tokens) {
        console.log('✅ Tokens found!')
        
        // Check if we have zkLogin session
        const sessionData = zkLoginSession.getSession()
        console.log('📱 zkLogin session:', sessionData ? 'EXISTS' : 'MISSING')
        
        if (!sessionData) {
          console.error('❌ No zkLogin session found')
          setLoginError('No zkLogin session data found. Please start login flow again.')
          clearTokensFromUrl()
          return
        }
        
        setIdToken(tokens.idToken)
        setShowPinInput(true)
        
        // Store tokens
        persistCognitoTokens({
          idToken: tokens.idToken,
          accessToken: tokens.accessToken,
        })

        // Clear URL immediately
        setTimeout(() => {
          clearTokensFromUrl()
        }, 50)
      } else {
        console.log('ℹ️ No tokens in URL')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract OAuth tokens'
      console.error('Token extraction error:', message)
      setLoginError(message)
    }
  }, [])

  const handlePinComplete = async (pin: string) => {
    setShowPinInput(false)

    const zkLoginSessionData = zkLoginSession.getSession()
    if (!idToken || !zkLoginSessionData) {
      setLoginError('No authentication data found. Please try logging in again.')
      return
    }

    setIsProcessingOAuth(true)
    setLoginError('')

    try {
      // Process OAuth callback using utility function with the PIN as salt and OAuth flow data
      const { user, zkLoginSessionData: updatedZkLoginSessionData } = await processOAuthCallback(idToken, pin, zkLoginSessionData)
      
      // Store session data
      zkLoginSession.setSession(updatedZkLoginSessionData)

      console.log('user with address:', user.address)
      
      // Login user
      login(user)
      router.push('/')
    } catch (error) {
      console.error('Authentication failed:', error)
      setLoginError('Authentication failed. Please try again.')
    } finally {
      setIsProcessingOAuth(false)
    }
  }

  const handlePinBack = () => {
    setShowPinInput(false)
    setIdToken(null)
    clearCognitoTokens()
  }

  const handleCognitoLogin = async () => {
    try {
      setIsConnecting(true)
      setLoginError('')
      
      const { zkLoginSessionData, nonce } = await initializeZkLoginSession(suiClient)
      
      // Store zkLogin session data
      zkLoginSession.setSession(zkLoginSessionData)

      // Redirect to Cognito OAuth with nonce
      const cognitoUrl = getCognitoLoginUrl(nonce)
      window.location.href = cognitoUrl
    } catch (error) {
      console.error('Cognito login failed:', error)
      setLoginError('Authentication failed. Please try again.')
      setIsConnecting(false)
    }
  }

    // Show loading screen during OAuth processing
  if (isProcessingOAuth) {
    return <LoadingSpinner message="Connecting to your wallet..." />
  }

  // Show PIN input if OAuth completed
  if (showPinInput) {
    return (
      <LoginLayout>       
        <SaltForm
          onPinComplete={handlePinComplete}
          onBack={handlePinBack}
        />
      </LoginLayout>
    )
  }

  // Otherwise show the Cognito login options
  return (
    <LoginLayout>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center">
            <img 
              src="/sui-logo.svg" 
              alt="Sui Logo" 
              className={`w-12 h-14 ${styles.logo}`}
            />
          </div>

          <CardTitle className="text-2xl">
            Welcome to Sui Wallet
          </CardTitle>

          <CardDescription>
            Sign in with AWS Cognito to access your zkLogin wallet
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {loginError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{loginError}</span>
            </div>
          )}

          <Button
            onClick={handleCognitoLogin}
            disabled={isConnecting}
            className="w-full h-12 text-base font-semibold"
            style={{
              background: 'linear-gradient(135deg, #3772ff 0%, #2558e6 100%)',
              opacity: isConnecting ? 0.7 : 1,
              cursor: isConnecting ? 'not-allowed' : 'pointer'
            }}
          >
            {isConnecting ? (
              <span>Connecting...</span>
            ) : (
              <span>Sign in with Cognito</span>
            )}
          </Button>
        </CardContent>

        <CardFooter>
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </LoginLayout>
  )
}
