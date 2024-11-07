import { ethers, verifyMessage } from 'ethers'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`),
})

export const isValidSignature = (address: string, message: string, signature: string): boolean => {
  try {
    const recovered = verifyMessage(message, signature)
    if (!recovered || ethers.getAddress(recovered) !== ethers.getAddress(address)) {
      return false
    }

    return true
  } catch (e) {
    return false
  }
}
