import { alchemyWalletTransport, createSmartWalletClient } from '@alchemy/wallet-apis'
import { createPublicClient, encodeFunctionData, http, parseAbi, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia } from 'viem/chains'
import { MEMORY_CHAIN, MEMORY_CHAINS, MEMORY_EDITION, type MemoryChain } from './memory'
import type { Sponsor } from './queue'

/**
 * Everything onchain for the memory (server only): the sponsored sender
 * (Alchemy Wallet APIs; the minter key is an EOA delegated to Alchemy's smart
 * account via EIP-7702, so it is msg.sender and the contract's minter) and
 * contract reads. Env: ALCHEMY_API_KEY, ALCHEMY_GAS_POLICY_ID,
 * MINTER_PRIVATE_KEY.
 */

export const MEMORY_ABI = parseAbi([
  'function mintBatch(uint256 editionId, address[] to, bytes32[] ticketKeys) returns (uint256 minted)',
  'function tokenOfTicket(bytes32 ticketKey) view returns (uint256)',
])

const VIEM_CHAINS = { sepolia, mainnet } as const
const ALCHEMY_HOSTS: Record<MemoryChain, string> = { sepolia: 'eth-sepolia', mainnet: 'eth-mainnet' }

export interface MemoryChainConfig {
  chain: MemoryChain
  chainId: number
  contract: Address
  apiKey: string
  policyId: string
  minterKey: Hex
}

/** Null until the contract is deployed and the env is set (the route answers 503). */
export function memoryChainConfig(chain: MemoryChain = MEMORY_CHAIN): MemoryChainConfig | null {
  const apiKey = process.env.ALCHEMY_API_KEY
  const policyId = process.env.ALCHEMY_GAS_POLICY_ID
  const minterKey = process.env.MINTER_PRIVATE_KEY as Hex | undefined
  const { id, contract } = MEMORY_CHAINS[chain]
  if (!apiKey || !policyId || !minterKey || !contract) return null
  return { chain, chainId: id, contract, apiKey, policyId, minterKey }
}

function alchemyRpc(chain: MemoryChain, apiKey: string): string {
  return `https://${ALCHEMY_HOSTS[chain]}.g.alchemy.com/v2/${apiKey}`
}

/** A random non-zero 2D nonce key: each batch gets its own, so parallel sends never replace each other. */
function nonceKey(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return BigInt(`0x${Buffer.from(bytes).toString('hex')}`) | BigInt(1)
}

export function memorySponsor(cfg: MemoryChainConfig): Sponsor {
  const client = createSmartWalletClient({
    transport: alchemyWalletTransport({ apiKey: cfg.apiKey }),
    chain: VIEM_CHAINS[cfg.chain],
    signer: privateKeyToAccount(cfg.minterKey),
    paymaster: { policyId: cfg.policyId },
  })
  return {
    async send(entries) {
      const { id } = await client.sendCalls({
        calls: [
          {
            to: cfg.contract,
            data: encodeFunctionData({
              abi: MEMORY_ABI,
              functionName: 'mintBatch',
              args: [BigInt(MEMORY_EDITION), entries.map(e => e.to), entries.map(e => e.key)],
            }),
          },
        ],
        capabilities: { nonceOverride: { nonceKey: nonceKey() } },
      })
      return id
    },
    async status(id) {
      const s = await client.getCallsStatus({ id })
      const status = s.status === 'success' ? 'success' : s.status === 'failure' ? 'failure' : 'pending'
      const receipt = s.receipts?.[0]
      return {
        status,
        txHash: receipt?.transactionHash,
        blockNumber: receipt?.blockNumber == null ? undefined : Number(receipt.blockNumber),
      }
    },
  }
}

export function tokenOfTicketReader(cfg: MemoryChainConfig) {
  const client = createPublicClient({
    chain: VIEM_CHAINS[cfg.chain],
    transport: http(alchemyRpc(cfg.chain, cfg.apiKey)),
  })
  return async (keys: Hex[]): Promise<bigint[]> => {
    if (!keys.length) return []
    return client.multicall({
      allowFailure: false,
      contracts: keys.map(k => ({
        address: cfg.contract,
        abi: MEMORY_ABI,
        functionName: 'tokenOfTicket' as const,
        args: [k] as const,
      })),
    })
  }
}
