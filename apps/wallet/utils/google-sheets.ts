// Google Sheets API integration for transaction storage
// This allows all team members to see and track transactions in real-time

const SHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || ''
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY || ''

// Google Sheets API endpoint
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

interface TransactionRow {
  digest: string
  address: string
  timestamp: number
  type: 'send' | 'receive' | 'faucet' | 'mint' | 'other'
}

/**
 * Append a transaction to Google Sheets
 */
export async function appendTransactionToSheet(transaction: TransactionRow): Promise<boolean> {
  if (!SHEET_ID || !API_KEY) {
    console.warn('Google Sheets credentials not configured')
    return false
  }

  try {
    const values = [[
      transaction.digest,
      transaction.address,
      transaction.timestamp.toString(),
      new Date(transaction.timestamp).toISOString(),
      transaction.type,
    ]]

    const response = await fetch(
      `${SHEETS_API_BASE}/${SHEET_ID}/values/Transactions!A:E:append?valueInputOption=USER_ENTERED&key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    )

    return response.ok
  } catch (error) {
    console.error('Failed to append to Google Sheets:', error)
    return false
  }
}

/**
 * Get all transactions from Google Sheets
 */
export async function getTransactionsFromSheet(): Promise<TransactionRow[]> {
  if (!SHEET_ID || !API_KEY) {
    console.warn('Google Sheets credentials not configured')
    return []
  }

  try {
    const response = await fetch(
      `${SHEETS_API_BASE}/${SHEET_ID}/values/Transactions!A2:E?key=${API_KEY}`,
      {
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch from Google Sheets')
    }

    const data = await response.json()
    const rows = data.values || []

    return rows.map((row: string[]) => ({
      digest: row[0] || '',
      address: row[1] || '',
      timestamp: parseInt(row[2] || '0'),
      type: (row[4] || 'other') as TransactionRow['type'],
    }))
  } catch (error) {
    console.error('Failed to get transactions from Google Sheets:', error)
    return []
  }
}

/**
 * Get transactions for a specific address from Google Sheets
 */
export async function getTransactionsByAddressFromSheet(address: string): Promise<TransactionRow[]> {
  const allTransactions = await getTransactionsFromSheet()
  return allTransactions.filter(tx => tx.address === address)
}

/**
 * Check if a transaction already exists in the sheet
 */
export async function transactionExistsInSheet(digest: string): Promise<boolean> {
  const transactions = await getTransactionsFromSheet()
  return transactions.some(tx => tx.digest === digest)
}

/**
 * Get statistics from Google Sheets data
 */
export async function getStatsFromSheet() {
  const transactions = await getTransactionsFromSheet()
  const uniqueAddresses = new Set(transactions.map(tx => tx.address))

  return {
    totalTransactions: transactions.length,
    uniqueAddresses: uniqueAddresses.size,
    byType: {
      send: transactions.filter(tx => tx.type === 'send').length,
      receive: transactions.filter(tx => tx.type === 'receive').length,
      faucet: transactions.filter(tx => tx.type === 'faucet').length,
      mint: transactions.filter(tx => tx.type === 'mint').length,
      other: transactions.filter(tx => tx.type === 'other').length,
    },
    addressList: Array.from(uniqueAddresses),
  }
}

/**
 * Export transactions in the format required by Sui Dev
 */
export async function exportTransactionsFromSheet() {
  const transactions = await getTransactionsFromSheet()
  const addressMap = new Map<string, string[]>()

  transactions.forEach(tx => {
    const existing = addressMap.get(tx.address) || []
    existing.push(tx.digest)
    addressMap.set(tx.address, existing)
  })

  const result: { address?: string; txDigests: string[] }[] = []
  addressMap.forEach((txDigests, address) => {
    result.push({ address, txDigests })
  })

  return result
}
