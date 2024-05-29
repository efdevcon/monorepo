'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { APP_CONFIG } from 'utils/config'
import { WAGMI_CONFIG } from 'utils/web3'
import { State, WagmiProvider } from 'wagmi'

interface Props extends PropsWithChildren {
  initialState?: State
}

const queryClient = new QueryClient()

createWeb3Modal({
  wagmiConfig: WAGMI_CONFIG,
  projectId: APP_CONFIG.WALLETCONNECT_PROJECT_ID,
})

export function Web3Provider(props: Props) {
  return (
    <>
      <WagmiProvider config={WAGMI_CONFIG} initialState={props.initialState}>
        <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
      </WagmiProvider>
    </>
  )
}
