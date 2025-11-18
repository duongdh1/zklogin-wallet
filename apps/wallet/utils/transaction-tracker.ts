// Transaction tracking utilities for Sui Dev reporting
// Now uses Google Sheets for centralized storage - all team members see the same data

import {
  appendTransactionToSheet,
  getTransactionsFromSheet,
  getTransactionsByAddressFromSheet,
  transactionExistsInSheet,
  getStatsFromSheet,
  exportTransactionsFromSheet,
} from './google-sheets'

export type AddressTransactions = { 
  address?: string
  txDigests: string[] 
}

export type AddressTransactionsArray = AddressTransactions[]

interface StoredTransaction {
  digest: string
  address: string
  timestamp: number
  type: 'send' | 'receive' | 'faucet' | 'mint' | 'other'
}

/**
 * Get all stored transactions from Google Sheets
 */
export async function getAllTransactions(): Promise<StoredTransaction[]> {
  return getTransactionsFromSheet()
}

/**
 * Store a new transaction in Google Sheets
 */
export async function storeTransaction(
  digest: string,
  address: string,
  type: 'send' | 'receive' | 'faucet' | 'mint' | 'other' = 'other'
): Promise<boolean> {
  try {
    // Check if already exists to avoid duplicates
    const exists = await transactionExistsInSheet(digest)
    if (exists) {
      console.log('Transaction already exists:', digest)
      return true
    }

    const transaction = {
      digest,
      address,
      timestamp: Date.now(),
      type,
    }

    return await appendTransactionToSheet(transaction)
  } catch (error) {
    console.error('Failed to store transaction:', error)
    return false
  }
}

/**
 * Get transactions for a specific address from Google Sheets
 */
export async function getTransactionsByAddress(address: string): Promise<StoredTransaction[]> {
  return getTransactionsByAddressFromSheet(address)
}

/**
 * Get all unique addresses from Google Sheets
 */
export async function getAllUniqueAddresses(): Promise<string[]> {
  const stats = await getStatsFromSheet()
  return stats.addressList
}

/**
 * Export transactions in the format requested by Sui Dev  
 */
export async function exportTransactionsForReport(): Promise<AddressTransactionsArray> {
  return exportTransactionsFromSheet()
}

/**
 * Download transactions as JSON file
 */
export async function downloadTransactionsJSON(): Promise<void> {
  try {
    const data = await exportTransactionsFromSheet()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `sui-zklogin-transactions-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download transactions:', error)
  }
}

/**
 * Get transaction statistics from Google Sheets
 */
export async function getTransactionStats() {
  return getStatsFromSheet()
}

/**
 * Clear all stored transactions (requires manual deletion in Google Sheets)
 */
export async function clearAllTransactions(): Promise<boolean> {
  console.warn('Please manually clear rows in Google Sheets')
  alert('To clear all transactions, please delete rows 2 onwards in the Google Sheet manually')
  return false
}
