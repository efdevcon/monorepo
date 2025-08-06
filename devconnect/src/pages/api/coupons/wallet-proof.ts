import { createConfig, http, verifyMessage } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import { pgWallets } from './pg-wallets'

const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
})

const message = 'I own this wallet and want to prove it.'

export const proveWalletOwnership = async (signature: string, address: string) => {
  const isPGWallet = pgWallets.some(wallet => wallet.toLowerCase() === address.toLowerCase())

  if (!isPGWallet) {
    return { success: false, error: 'Not a Protocol Guild wallet' }
  }

  const result = await verifyMessage(config, {
    address: address as `0x${string}`,
    message,
    signature: signature as `0x${string}`,
  })

  if (result) {
    return { success: true, error: null }
  }

  return { success: false, error: 'Invalid signature' }
}
