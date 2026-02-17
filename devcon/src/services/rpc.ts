/**
 * Shared RPC transport configuration for backend services.
 * Uses Alchemy (primary) → Infura (fallback) → public default.
 */
import { http, fallback, type Transport } from 'viem'
import { mainnet, optimism, arbitrum, base, polygon, baseSepolia } from 'viem/chains'

// Backend uses private key (not exposed to browser); falls back to public key
const ALCHEMY_KEY = process.env.ALCHEMY_APIKEY || process.env.NEXT_PUBLIC_ALCHEMY_APIKEY || ''
const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_APIKEY || ''

const ALCHEMY_URLS: Record<number, string> = {
  [mainnet.id]: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  [base.id]: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  [optimism.id]: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  [arbitrum.id]: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  [polygon.id]: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  [baseSepolia.id]: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
}

const INFURA_URLS: Record<number, string> = {
  [mainnet.id]: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  [optimism.id]: `https://optimism-mainnet.infura.io/v3/${INFURA_KEY}`,
  [arbitrum.id]: `https://arbitrum-mainnet.infura.io/v3/${INFURA_KEY}`,
  [polygon.id]: `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
  [baseSepolia.id]: `https://base-sepolia.infura.io/v3/${INFURA_KEY}`,
}

/**
 * Get a fallback transport for a given chain ID.
 * Alchemy (primary) → Infura (fallback) → public default.
 */
export function getTransport(chainId: number): Transport {
  const transports = []
  if (ALCHEMY_KEY && ALCHEMY_URLS[chainId]) transports.push(http(ALCHEMY_URLS[chainId]))
  if (INFURA_KEY && INFURA_URLS[chainId]) transports.push(http(INFURA_URLS[chainId]))
  transports.push(http()) // public fallback
  return fallback(transports)
}
