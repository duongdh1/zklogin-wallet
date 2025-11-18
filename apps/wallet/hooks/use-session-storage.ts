'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for safely accessing sessionStorage with SSR compatibility
 * @param key - The sessionStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns [value, setValue, removeValue] tuple
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value - always use initialValue on server
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  
  // Load from sessionStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      const item = sessionStorage.getItem(key)
      if (!item) return
      
      // For strings, return directly without JSON.parse
      if (typeof initialValue === 'string') {
        setStoredValue(item as T)
      } else {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error)
    }
  }, [key])

  // Return a wrapped version of useState's setter function that persists the new value to sessionStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      
      // Save state
      setStoredValue(valueToStore)
      
      // Save to sessionStorage
      if (typeof window !== 'undefined') {
        // For strings, store directly without JSON.stringify
        if (typeof valueToStore === 'string') {
          sessionStorage.setItem(key, valueToStore)
        } else {
          sessionStorage.setItem(key, JSON.stringify(valueToStore))
        }
      }
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  // Remove value from sessionStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  // Listen for changes to this sessionStorage key from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === sessionStorage) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : initialValue
          setStoredValue(newValue)
        } catch (error) {
          console.error(`Error parsing sessionStorage value for key "${key}":`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}

/**
 * Hook for simple string values in sessionStorage
 * @param key - The sessionStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns [value, setValue, removeValue] tuple
 */
export function useSessionStorageString(
  key: string,
  initialValue: string = ''
): [string, (value: string) => void, () => void] {
  const [value, setValue, removeValue] = useSessionStorage(key, initialValue)
  return [value, setValue, removeValue]
}

/**
 * Hook for boolean values in sessionStorage
 * @param key - The sessionStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns [value, setValue, removeValue] tuple
 */
export function useSessionStorageBoolean(
  key: string,
  initialValue: boolean = false
): [boolean, (value: boolean) => void, () => void] {
  const [value, setValue, removeValue] = useSessionStorage(key, initialValue)
  return [value, setValue, removeValue]
}

/**
 * Hook for number values in sessionStorage
 * @param key - The sessionStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns [value, setValue, removeValue] tuple
 */
export function useSessionStorageNumber(
  key: string,
  initialValue: number = 0
): [number, (value: number) => void, () => void] {
  const [value, setValue, removeValue] = useSessionStorage(key, initialValue)
  return [value, setValue, removeValue]
}
