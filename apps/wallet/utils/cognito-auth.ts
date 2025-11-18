/**
 * AWS Cognito authentication service
 * Handles token storage and retrieval
 */

export interface CognitoTokens {
  idToken: string
  accessToken: string
  refreshToken?: string
}

const ID_TOKEN_STORAGE_KEY = 'auth:cognito:idToken'
const ACCESS_TOKEN_STORAGE_KEY = 'auth:cognito:accessToken'
const REFRESH_TOKEN_STORAGE_KEY = 'auth:cognito:refreshToken'

function persistToken(key: string, value?: string) {
  if (typeof window === 'undefined') {
    return
  }

  if (!value) {
    window.sessionStorage.removeItem(key)
    return
  }

  window.sessionStorage.setItem(key, value)
}

export function clearCognitoTokens() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(ID_TOKEN_STORAGE_KEY)
  window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}

export function persistCognitoTokens(tokens: CognitoTokens) {
  persistToken(ID_TOKEN_STORAGE_KEY, tokens.idToken)
  persistToken(ACCESS_TOKEN_STORAGE_KEY, tokens.accessToken)
  persistToken(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken)
}

export function readCognitoTokens(): CognitoTokens | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const idToken = window.sessionStorage.getItem(ID_TOKEN_STORAGE_KEY) || undefined
  const accessToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || undefined
  const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || undefined

  if (!idToken || !accessToken) {
    return undefined
  }

  return { idToken, accessToken, refreshToken }
}
