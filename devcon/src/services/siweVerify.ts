import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

// Universal SIWE signature check: EOA ecrecover first, then on-chain
// ERC-1271 `isValidSignature` for smart-contract wallets (Safe & co), plus
// ERC-6492 for undeployed ones. The `siwe` library's verify() is EOA-only
// and silently rejects Safe multisig signatures — found live 2026-08-22
// (issue #114): a 2-of-N Safe returns a 130-byte concatenated signature
// that only an on-chain check can validate. Field bindings (nonce, domain,
// chain, expiry) remain the caller's responsibility.
const client = createPublicClient({
  chain: mainnet,
  transport: http(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`),
})

export async function verifySiweSignature(address: string, preparedMessage: string, signature: string): Promise<boolean> {
  try {
    return await client.verifyMessage({
      address: address as `0x${string}`,
      message: preparedMessage,
      signature: signature as `0x${string}`,
    })
  } catch {
    // RPC failure or malformed input — fail closed.
    return false
  }
}
