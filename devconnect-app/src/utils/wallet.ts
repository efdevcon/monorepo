import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'

import { APP_CONFIG } from '@/utils/config'

export const networks = [mainnet]

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: APP_CONFIG.WC_PROJECT_ID,
  networks,
})

export const config = wagmiAdapter.wagmiConfig
