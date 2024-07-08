
import { defaultWagmiConfig } from '@web3modal/wagmi'
import { cookieStorage, createStorage } from 'wagmi'
import { mainnet } from 'wagmi/chains'

export const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? ''
if (!WC_PROJECT_ID) throw new Error('WalletConnect Project ID is not defined')

export const WAGMI_CONFIG = defaultWagmiConfig({
  chains: [mainnet],
  projectId: WC_PROJECT_ID,
  ssr: true,
  metadata: {
    name: 'Devcon Discounts',
    description: 'Claim your Devcon ticket with a discount.',
    url: 'https://devcon.org',
    icons: ['https://devcon.org/favicon.ico'],
  },
  auth: {
    email: false
  },
  storage: createStorage({
    storage: cookieStorage
  }),
})
