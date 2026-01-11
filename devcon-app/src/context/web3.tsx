'use client'

import React, { PropsWithChildren, useEffect, useState } from 'react'

// Store loaded modules and modal instance
let appKitModal: any = null
let loadedWagmiConfig: any = null
let WagmiProviderComponent: any = null

// Export helper to get modal instance
export const getAppKitModal = () => appKitModal

interface Props extends PropsWithChildren {
  cookies?: string
}

export function Web3Provider(props: Props) {
  const [isReady, setIsReady] = useState(false)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    // Already loaded
    if (loadedWagmiConfig && WagmiProviderComponent) {
      setIsReady(true)
      return
    }

    const initWallet = async () => {
      try {
        // Dynamic imports - these won't be processed at build time
        const [walletModule, appKitModule, networksModule, wagmiModule, configModule] = await Promise.all([
          import('utils/wallet'),
          import('@reown/appkit/react'),
          import('@reown/appkit/networks'),
          import('wagmi'),
          import('utils/config'),
        ])

        const { wagmiAdapter } = walletModule
        const { createAppKit } = appKitModule
        const { mainnet } = networksModule
        const { WagmiProvider } = wagmiModule
        const { APP_CONFIG } = configModule

        // Initialize AppKit if not already done
        if (!appKitModal) {
          appKitModal = createAppKit({
            adapters: [wagmiAdapter],
            projectId: APP_CONFIG.WC_PROJECT_ID,
            networks: [mainnet],
            defaultNetwork: mainnet,
            metadata: {
              name: 'Devcon App',
              description: 'Customize your Devcon experience.',
              url: 'https://app.devcon.org',
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
        }

        loadedWagmiConfig = wagmiAdapter.wagmiConfig
        WagmiProviderComponent = WagmiProvider
        setIsReady(true)
      } catch (error) {
        console.error('Failed to initialize wallet:', error)
      }
    }

    initWallet()
  }, [])

  // Not ready yet - render children without wallet context
  if (!isReady || !WagmiProviderComponent || !loadedWagmiConfig) {
    return <>{props.children}</>
  }

  return (
    <WagmiProviderComponent config={loadedWagmiConfig}>
      {props.children}
    </WagmiProviderComponent>
  )
}
