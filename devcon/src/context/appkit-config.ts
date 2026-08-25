import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'
// Re-enable alongside the networks list below when needed:
// import { base, baseSepolia, optimism, arbitrum, polygon } from '@reown/appkit/networks'
import { http, fallback } from 'wagmi'

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || ''
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_APIKEY || ''
const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_APIKEY || ''

// Alchemy (primary) → Infura (fallback) → public default
function chainTransport(alchemySlug: string, infuraSlug?: string) {
  const transports = []
  if (ALCHEMY_KEY) transports.push(http(`https://${alchemySlug}.g.alchemy.com/v2/${ALCHEMY_KEY}`))
  if (INFURA_KEY && infuraSlug) transports.push(http(`https://${infuraSlug}.infura.io/v3/${INFURA_KEY}`))
  transports.push(http()) // public fallback
  return fallback(transports)
}

// Order matters: the FIRST network is every WalletConnect session's initial
// active chain. baseSepolia used to lead (an x402-dev leftover), which made
// wallets without testnet support reject signature requests instantly
// (issue #114: TrustWallet). Mainnet-only for now — every live flow (SIWE
// discounts, ETH checkout) signs and settles on mainnet. Re-enable others
// here (and their transports below) when a flow actually needs them.
const networks = [mainnet] as const

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: [...networks],
  projectId,
  transports: {
    [mainnet.id]: chainTransport('eth-mainnet', 'mainnet'),
    // [baseSepolia.id]: chainTransport('base-sepolia', 'base-sepolia'),
    // [base.id]: chainTransport('base-mainnet'),
    // [optimism.id]: chainTransport('opt-mainnet', 'optimism-mainnet'),
    // [arbitrum.id]: chainTransport('arb-mainnet', 'arbitrum-mainnet'),
    // [polygon.id]: chainTransport('polygon-mainnet', 'polygon-mainnet'),
  },
})

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [...networks],
  defaultNetwork: networks[0],
  projectId,
  metadata: {
    name: 'Devcon Tickets',
    description: 'Devcon Ticket Store',
    url:
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : process.env.NEXT_PUBLIC_APP_URL || 'https://devcon.org',
    icons: ['https://devcon.org/favicon.ico'],
  },
  features: {
    analytics: true,
    email: false,
    socials: false,
    emailShowWallets: false,
  },
  themeMode: 'light',
  enableEIP6963: true,
  enableInjected: true,
  enableWalletConnect: true,
  enableCoinbase: true,
  // Must stay true while the networks list is mainnet-only: with false,
  // AppKit force-opens its "Switch Network" modal on EVERY page whenever the
  // connected wallet sits on any other chain (Base, Arbitrum, ...) — most
  // returning WalletConnect sessions do. Flows that actually need mainnet
  // (SIWE discounts, builder form) already switch the chain themselves right
  // before signing, so the global nag adds nothing.
  allowUnsupportedChain: true,
  allWallets: 'SHOW',
  featuredWalletIds: [
    'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18', // Zerion
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
  ],
})
