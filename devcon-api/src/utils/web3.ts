import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`),
})

export const isValidSignature = async (address: `0x${string}`, message: string, signature: `0x${string}`): Promise<boolean> => {
  try {
    return await publicClient.verifyMessage({ address, message, signature })
  } catch (e) {
    return false
  }
}
