/**
 * AWS Cognito OAuth2 utilities for Hosted UI login flow
 */

const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'ap-southeast-1_ZLX10720T'
const COGNITO_APP_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID || '6lfpu6obc2fe37demi6on3lesh'
const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || 'ap-southeast-1_ZLX10720T'
const APP_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_REDIRECT_URI 
  ? `${process.env.NEXT_PUBLIC_APP_REDIRECT_URI}/login`
  : 'http://localhost:4000/login'

// Extract region from user pool ID (format: region_XXXX)
const COGNITO_REGION = 'ap-southeast-1'

const COGNITO_HOSTED_UI_URL = `https://${COGNITO_DOMAIN}.auth.${COGNITO_REGION}.amazoncognito.com`

export interface CognitoOAuthTokens {
  idToken: string
  accessToken: string
  expiresIn?: number
  tokenType?: string
}

interface TokensFromHash {
  tokens: CognitoOAuthTokens | null
  error: string | null
}

/**
 * Build Cognito OAuth2 authorize URL for login
 * @param nonce - Optional nonce from zkLogin session to include in OAuth request
 * @returns Full OAuth2 authorize URL
 */
export function getCognitoLoginUrl(nonce?: string): string {
  // Use provided nonce or generate a random one
  const authNonce = nonce || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // Store login process in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('cognito_auth_process', 'login')
  }

  const params = new URLSearchParams({
    client_id: COGNITO_APP_CLIENT_ID,
    response_type: 'token', // Implicit flow - returns both id_token and access_token in URL fragment
    redirect_uri: APP_REDIRECT_URI,
    scope: 'openid email',
    nonce: authNonce, // Required for id_token in implicit flow
  })

  return `${COGNITO_HOSTED_UI_URL}/login/continue?${params.toString()}`
}

/**
 * Build Cognito OAuth2 signup URL
 * Redirects user to Cognito Hosted UI signup page
 * After signup, user is redirected back with tokens in URL fragment
 * @param email - Optional email to pre-fill signup form
 * @returns Full OAuth2 signup URL
 */
export function getCognitoSignupUrl(email?: string): string {
  // Generate a random nonce for id_token validation
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // Store signup process in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('cognito_auth_process', 'register')
  }

  const params = new URLSearchParams({
    client_id: COGNITO_APP_CLIENT_ID,
    response_type: 'token', // Implicit flow - returns both id_token and access_token in URL fragment
    redirect_uri: APP_REDIRECT_URI,
    scope: 'openid email',
    nonce: nonce, // Required for id_token in implicit flow
  })

  // Add email if provided
  if (email) {
    params.append('login_hint', email) // Cognito pre-fills email field
  }

  // Use /signup endpoint instead of /authorize
  return `${COGNITO_HOSTED_UI_URL}/signup?${params.toString()}`
}

/**
 * Extract tokens from URL fragment (after redirect from Cognito)
 * Expected format: #id_token=...&access_token=...&expires_in=...&token_type=...
 * @returns Tokens and error if any
 */
export function extractTokensFromUrl(): TokensFromHash {
  if (typeof window === 'undefined') {
    return { tokens: null, error: 'Running on server' }
  }

  try {
    // First, try to get from current URL hash
    let hash = window.location.hash.substring(1) // Remove '#'

    // If hash is empty, check sessionStorage (in case Next.js already cleared it)
    if (!hash) {
      const savedHash = sessionStorage.getItem('oauth_callback_hash')
      if (savedHash) {
        console.log('📦 Retrieved hash from sessionStorage')
        hash = savedHash.substring(1) // Remove '#'
        // Clear it after reading
        sessionStorage.removeItem('oauth_callback_hash')
      }
    }

    if (!hash) {
      return { tokens: null, error: null }
    }

    const params = new URLSearchParams(hash)
    const idToken = params.get('id_token')
    const accessToken = params.get('access_token')
    const expiresIn = params.get('expires_in')
    const tokenType = params.get('token_type')
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      return {
        tokens: null,
        error: `${error}: ${errorDescription || 'Unknown error'}`,
      }
    }

    if (!idToken || !accessToken) {
      return { tokens: null, error: null }
    }

    return {
      tokens: {
        idToken,
        accessToken,
        expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
        tokenType: tokenType || 'Bearer',
      },
      error: null,
    }
  } catch (err) {
    console.error('Error extracting tokens from URL:', err)
    return { tokens: null, error: 'Failed to extract tokens' }
  }
}

/**
 * Clear tokens from URL (clean up hash)
 */
export function clearTokensFromUrl(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.history.replaceState({}, document.title, window.location.pathname)
  } catch (err) {
    console.error('Error clearing URL hash:', err)
  }
}

/**
 * Parse JWT token and extract claims
 * @param token JWT token
 * @returns Decoded token payload
 */
export function parseJwt(token: string): Record<string, any> {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) {
      throw new Error('Invalid JWT token format')
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch (err) {
    console.error('Error parsing JWT:', err)
    return {}
  }
}
