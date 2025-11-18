import { TokenBalance, suiClient } from './sui'
import { normalizeSuiAddress } from '@mysten/sui/utils'
import { TOKEN_METADATA } from './sui'

// CoinGecko API configuration
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3'
const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY // Optional API key for higher rate limits

// Token symbol to CoinGecko ID mapping
const COINGECKO_IDS: { [key: string]: string } = {
  'SUI': 'sui',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'WETH': 'weth',
  'BTC': 'bitcoin',
  'ETH': 'ethereum'
}

// Cache for price data to avoid excessive API calls
const priceCache = new Map<string, { price: number; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds



export async function fetchTokenPrice(symbol: string): Promise<number> {
  const upperSymbol = symbol.toUpperCase()
  const coingeckoId = COINGECKO_IDS[upperSymbol]
  
  if (!coingeckoId) {
    console.warn(`No CoinGecko ID found for token: ${upperSymbol}`)
    return 0
  }

  // Check cache first
  const cached = priceCache.get(coingeckoId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price
  }

  try {
    const url = `${COINGECKO_API_URL}/simple/price?ids=${coingeckoId}&vs_currencies=usd${
      COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : ''
    }`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const price = data[coingeckoId]?.usd

    if (typeof price !== 'number') {
      throw new Error(`Invalid price data for ${coingeckoId}`)
    }

    // Cache the result
    priceCache.set(coingeckoId, { price, timestamp: Date.now() })
    
    return price
  } catch (error) {
    console.error(`Failed to fetch price for ${upperSymbol}:`, error)
    
    // Return cached price if available, even if expired
    if (cached) {
      console.warn(`Using expired cached price for ${upperSymbol}`)
      return cached.price
    }
    
    return 0
  }
}

export async function fetchMultipleTokenPrices(symbols: string[]): Promise<{ [symbol: string]: number }> {
  const prices: { [symbol: string]: number } = {}
  const uncachedSymbols: string[] = []
  const coingeckoIds: string[] = []

  // Check cache for each symbol
  for (const symbol of symbols) {
    const upperSymbol = symbol.toUpperCase()
    const coingeckoId = COINGECKO_IDS[upperSymbol]
    
    if (!coingeckoId) {
      prices[upperSymbol] = 0
      continue
    }

    const cached = priceCache.get(coingeckoId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      prices[upperSymbol] = cached.price
    } else {
      uncachedSymbols.push(upperSymbol)
      coingeckoIds.push(coingeckoId)
    }
  }

  // Fetch uncached prices in batch
  if (coingeckoIds.length > 0) {
    try {
      const url = `${COINGECKO_API_URL}/simple/price?ids=${coingeckoIds.join(',')}&vs_currencies=usd${
        COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : ''
      }`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      for (let i = 0; i < coingeckoIds.length; i++) {
        const coingeckoId = coingeckoIds[i]
        const symbol = uncachedSymbols[i]
        const price = coingeckoId ? (data[coingeckoId]?.usd || 0) : 0
        
        if (symbol) {
          prices[symbol] = price
        }
        
        // Cache the result
        if (coingeckoId) {
          priceCache.set(coingeckoId, { price, timestamp: Date.now() })
        }
      }
    } catch (error) {
      console.error('Failed to fetch multiple token prices:', error)
      
      // Set failed symbols to 0
      for (const symbol of uncachedSymbols) {
        prices[symbol] = 0
      }
    }
  }

  return prices
}

export async function fetchTokenBalances(address: string): Promise<TokenBalance[]> {
  try {
    const normalizedAddress = normalizeSuiAddress(address)
    
    // Get all coin objects for the address
    const coinObjects = await suiClient.getCoins({
      owner: normalizedAddress,
    })

    // Group coins by coin type
    const coinMap = new Map<string, { totalBalance: bigint; coinType: string }>()
    
    for (const coin of coinObjects.data) {
      const coinType = coin.coinType
      const balance = BigInt(coin.balance)
      
      if (coinMap.has(coinType)) {
        const existing = coinMap.get(coinType)!
        existing.totalBalance += balance
      } else {
        coinMap.set(coinType, { totalBalance: balance, coinType })
      }
    }

    // Collect all known token symbols for batch price fetching
    const knownTokens = Array.from(coinMap.keys())
      .map(coinType => TOKEN_METADATA[coinType])
      .filter((metadata): metadata is NonNullable<typeof metadata> => Boolean(metadata))
      .map(metadata => metadata.symbol)
    
    // Fetch all prices in one batch
    const prices = await fetchMultipleTokenPrices(knownTokens)
    
    // Convert to TokenBalance format
    const balances: TokenBalance[] = []
    
    for (const [coinType, { totalBalance }] of coinMap) {
      const metadata = TOKEN_METADATA[coinType]
      
      if (metadata) {
        // Known token with metadata
        const decimals = metadata.decimals
        const balance = Number(totalBalance) / Math.pow(10, decimals)
        const price = prices[metadata.symbol] || 0
        const usdValue = (balance * price).toFixed(2)
        
        balances.push({
          symbol: metadata.symbol,
          name: metadata.name,
          balance: balance.toFixed(6),
          price,
          usdValue,
          coinType
        })
      } else {
        // Unknown token - show with basic info
        const balance = Number(totalBalance) / Math.pow(10, 9) // Default to 9 decimals
        const symbol = coinType.split('::').pop() || 'UNKNOWN'
        const name = `Unknown ${symbol}`
        
        balances.push({
          symbol: symbol,
          name: name,
          balance: balance.toFixed(6),
          price: 0,
          usdValue: '0.00',
          coinType
        })
      }
    }

    // Sort by USD value (highest first)
    balances.sort((a, b) => parseFloat(b.usdValue) - parseFloat(a.usdValue))
    
    return balances
  } catch (error) {
    console.error('Failed to fetch token balances:', error)
    // Return empty array on error
    return []
  }
}