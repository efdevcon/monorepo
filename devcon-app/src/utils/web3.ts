import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { VerificationToken } from 'types/VerificationToken'
import { APP_CONFIG, SITE_CONFIG } from './config'
import { cookieStorage, createStorage } from 'wagmi'
import { mainnet } from 'viem/chains'

export const WAGMI_CONFIG = defaultWagmiConfig({
  chains: [mainnet],
  projectId: APP_CONFIG.WALLETCONNECT_PROJECT_ID,
  ssr: true,
  metadata: {
    name: SITE_CONFIG.NAME,
    description: SITE_CONFIG.DESCRIPTION,
    url: SITE_CONFIG.URL,
    icons: ['https://avatars.githubusercontent.com/u/40744488'],
  },
  storage: createStorage({
    storage: cookieStorage
  }),
})

export function getSiweMessage(address: string, token: VerificationToken): string {
  return `devcon.org wants you to sign in with your Ethereum account:
${address}

Sign this message to prove you have access to this wallet. This won't cost you anything.

URI: https://devcon.org/
Version: 1
Nonce: ${token.nonce}
Issued At: ${token.issued}
Expiration Time: ${token.expires}
Chain ID: 1`
}
