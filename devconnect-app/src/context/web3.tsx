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
    swaps: false,
    onramp: false,
    analytics: true,
    history: false,
    socials: [],
  },
})

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
