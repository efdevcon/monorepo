'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { WAGMI_CONFIG, WC_PROJECT_ID } from 'utils/wagmi'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

createWeb3Modal({
  wagmiConfig: WAGMI_CONFIG,
  projectId: WC_PROJECT_ID,
  enableAnalytics: true,
})

export function Web3ModalProvider(props: PropsWithChildren) {
  return (
    <WagmiProvider config={WAGMI_CONFIG}>
      <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    </WagmiProvider>
  )
}
