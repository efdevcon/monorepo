import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, base, baseSepolia, optimism, arbitrum, polygon } from '@reown/appkit/networks'
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

const networks = [baseSepolia, base, mainnet, optimism, arbitrum, polygon] as const

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: [...networks],
  projectId,
  transports: {
    [baseSepolia.id]: chainTransport('base-sepolia', 'base-sepolia'),
    [base.id]: chainTransport('base-mainnet'),
    [mainnet.id]: chainTransport('eth-mainnet', 'mainnet'),
    [optimism.id]: chainTransport('opt-mainnet', 'optimism-mainnet'),
    [arbitrum.id]: chainTransport('arb-mainnet', 'arbitrum-mainnet'),
    [polygon.id]: chainTransport('polygon-mainnet', 'polygon-mainnet'),
  },
})

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [...networks],
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
  allowUnsupportedChain: false,
  allWallets: 'SHOW',
  featuredWalletIds: [
    'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18', // Zerion
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
  ],
})
