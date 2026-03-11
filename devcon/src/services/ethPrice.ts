/**
 * ETH Price Oracle Service
 * Fetches ETH/USD price from Coinbase and Binance.
 * If the two sources diverge by more than MAX_DIVERGENCE_PERCENT,
 * returns null (ETH payments should be disabled).
 */

const COINBASE_ETH_SPOT = 'https://api.coinbase.com/v2/prices/ETH-USD/spot'
const BINANCE_ETH_SPOT = 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT'

const MAX_DIVERGENCE_PERCENT = 5

async function fetchCoinbasePrice(): Promise<number> {
  const res = await fetch(COINBASE_ETH_SPOT)
  if (!res.ok) throw new Error(`Coinbase HTTP ${res.status}`)
  const data = await res.json()
  const price = parseFloat(data?.data?.amount)
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid Coinbase price')
  return price
}

async function fetchBinancePrice(): Promise<number> {
  const res = await fetch(BINANCE_ETH_SPOT)
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`)
  const data = await res.json()
  const price = parseFloat(data?.price)
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid Binance price')
  return price
}

export interface EthPriceResult {
  price: number
  source: 'dual' | 'coinbase' | 'binance'
}

/**
 * Fetch ETH price with dual-oracle validation.
 * - If both oracles respond and agree within MAX_DIVERGENCE_PERCENT, returns average price.
 * - If only one oracle responds, returns that price (degraded mode).
 * - If both respond but diverge too much, returns null (ETH should be disabled).
 * - If both fail, throws.
 */
export async function fetchEthPriceUsd(): Promise<EthPriceResult | null> {
  const [coinbaseResult, binanceResult] = await Promise.allSettled([
    fetchCoinbasePrice(),
    fetchBinancePrice(),
  ])

  const coinbase = coinbaseResult.status === 'fulfilled' ? coinbaseResult.value : null
  const binance = binanceResult.status === 'fulfilled' ? binanceResult.value : null

  if (coinbase != null && binance != null) {
    const avg = (coinbase + binance) / 2
    const divergence = Math.abs(coinbase - binance) / avg * 100
    if (divergence > MAX_DIVERGENCE_PERCENT) {
      console.warn(`[EthPrice] Oracle divergence ${divergence.toFixed(1)}% (Coinbase $${coinbase}, Binance $${binance}) — disabling ETH`)
      return null
    }
    return { price: avg, source: 'dual' }
  }

  // If either oracle is down, disable ETH — better no payment than a wrong price
  if (coinbase != null) {
    console.warn('[EthPrice] Binance unavailable — disabling ETH')
  } else if (binance != null) {
    console.warn('[EthPrice] Coinbase unavailable — disabling ETH')
  } else {
    console.warn('[EthPrice] Both oracles failed — disabling ETH')
  }
  return null
}
