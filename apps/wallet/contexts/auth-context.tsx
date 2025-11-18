'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react'
import { useZkLoginSession, ZkLoginSession } from '@/hooks/use-zklogin-session'
import { useSessionStorage } from '@/hooks/use-session-storage'

interface User {
  address: string
  provider: string
  sub: string
  email?: string
  name?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  getZkLoginSession: () => ZkLoginSession | null
  clearZkLoginSession: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser, clearUser] = useSessionStorage<User | null>('sui-wallet-user', null)
  const [isLoading, setIsLoading] = useState(true)
  const zkLoginSession = useZkLoginSession()

  useEffect(() => {
    // Set loading to false after initial load
    setIsLoading(false)
  }, [])

  const login = (userData: User) => {
    setUser(userData)
  }

  const logout = () => {
    clearUser()
    // Clear zkLogin session data
    zkLoginSession.clearSession()
  }

  const getZkLoginSession = (): ZkLoginSession | null => {
    return zkLoginSession.getSession()
  }

  const clearZkLoginSession = () => {
    zkLoginSession.clearSession()
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getZkLoginSession,
    clearZkLoginSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
