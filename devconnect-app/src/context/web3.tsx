'use client'

import React, { PropsWithChildren } from 'react'
import { createAppKit } from '@reown/appkit/react'
import { mainnet } from '@reown/appkit/networks'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { wagmiAdapter } from '@/utils/wallet'
import { APP_CONFIG } from '@/utils/config'

createAppKit({
  adapters: [wagmiAdapter],
  projectId: APP_CONFIG.WC_PROJECT_ID,
  networks: [mainnet],
  defaultNetwork: mainnet,
  metadata: {
    name: 'Devconnect App',
    description: 'Customize your Devconnect experience.',
    url: 'https://app.devconnect.org',
    icons: ['https://avatars.githubusercontent.com/u/40744488'],
  },
  features: {
    connectMethodsOrder: ['wallet'],
    send: false,
    swaps: false,
    onramp: false,
    analytics: true,
    history: false,
    socials: [],
  },
  featuredWalletIds: [
    // Ambire
    '2c81da3add65899baeac53758a07e652eea46dbb5195b8074772c62a77bbf568',
    // Coinbase Wallet
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
    // MetaMask
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    // Rainbow
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
    // Zerion
    'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18',
  ],
});

interface Props extends PropsWithChildren {
  cookies?: string
}

export function Web3Provider(props: Props) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, props.cookies)
  const [queryClient] = React.useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
        {props.children}
      </WagmiProvider>
    </QueryClientProvider>
  )
}
