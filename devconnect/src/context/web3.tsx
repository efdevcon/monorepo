// 'use client'

// import React, { PropsWithChildren } from 'react'
// import { createAppKit } from '@reown/appkit/react'
// import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'
// import { cookieStorage, createStorage } from '@wagmi/core'
// import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
// import { mainnet, arbitrum } from '@reown/appkit/networks'

// export const networks = [mainnet, arbitrum]

// export const wagmiAdapter = new WagmiAdapter({
//   storage: createStorage({
//     storage: cookieStorage,
//   }),
//   ssr: true,
//   projectId: process.env.WC_PROJECT_ID || '',
//   networks,
// })

// export const config = wagmiAdapter.wagmiConfig

// // import { APP_CONFIG } from 'utils/config'

// createAppKit({
//   adapters: [wagmiAdapter],
//   projectId: process.env.WC_PROJECT_ID || '',
//   networks: [mainnet],
//   defaultNetwork: mainnet,
//   metadata: {
//     name: 'Devcon App',
//     description: 'Customize your Devcon experience.',
//     url: 'https://app.devcon.org',
//     icons: ['https://avatars.githubusercontent.com/u/40744488'],
//   },
//   features: {
//     swaps: false,
//     onramp: false,
//     analytics: true,
//     history: false,
//     socials: [],
//   },
// })

// interface Props extends PropsWithChildren {
//   cookies?: string
// }

// export function Web3Provider(props: Props) {
//   const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, props.cookies)

//   return (
//     <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
//       {props.children}
//     </WagmiProvider>
//   )
// }
