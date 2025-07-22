import { createPublicClient, http } from 'viem'

export async function verifySignature({
  address,
  message,
  signature,
  chainId = 8453, // Default to Base mainnet
}: {
  address: string
  message: string
  signature: string
  chainId?: number
}) {
  const publicClient = createPublicClient({
    transport: getTransport({ chainId })
  })

  function getTransport({ chainId }: { chainId: number }) {
    return http(
      `https://rpc.walletconnect.org/v1/?chainId=eip155:${chainId}&projectId=${process.env.NEXT_PUBLIC_WC_PROJECT_ID}`
    )
  }

  return publicClient.verifyMessage({
    message,
    address: address as `0x${string}`,
    signature: signature as `0x${string}`,
  })
}

export function truncateSignature(signature: string, length: number = 20): string {
  if (signature.length <= length) return signature;
  return `${signature.slice(0, length)}...${signature.slice(-length)}`;
} 
